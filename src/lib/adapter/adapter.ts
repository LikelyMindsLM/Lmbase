import {
  Observable,
  ReplaySubject,
  fromEvent,
  race,
  throwError,
  of,
} from "rxjs";

import { mergeMap, first } from "rxjs/operators";
import { IDBBrokenError } from "./adapter.exceptions";
import { IObjectStoresV1, LMTX } from "./adapter.interfaces";

export class Adapter {
  /**
   * `indexedDB` database connection, wrapped in a RxJS `ReplaySubject`
   *
   */ readonly #conn$ = new ReplaySubject<IDBDatabase>(1);

  constructor() {
    this._initialize();
  }

  /**
   * Opens `indexedDB` connection and configures object stores if necessary
   *
   */ private _initialize(): void {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open("LikelyMindsLM", 1);
    } catch (error) {
      this.#conn$.error(new IDBBrokenError(error));
      return;
    }

    this._configureObjectStores(request);

    /**
     * We listen to the two mutually exclusive events: success and error.
     * `race` emits whichever event occurs first.
     * `first` completes the stream after the emission from `race`.
     *
     */

    const success$ = fromEvent(request, "success");
    const error$ = this._listenToError$(request);

    race([success$, error$])
      .pipe(first())
      .subscribe({
        next: () => {
          /**
           *  Register the database connection
           *
           */ this.#conn$.next(request.result);
        },
        error: (error) => {
          this.#conn$.error(new IDBBrokenError(error));
        },
      });
  }

  /**
   * Initialize or modify `indexedDB` object-stores as needed
   * @param request `indexedDB` database opening request
   *
   */ private _configureObjectStores(request: IDBOpenDBRequest): void {
    fromEvent(request, "upgradeneeded")
      .pipe(first())
      .subscribe({
        next: () => {
          const db = request.result;
          const tx = request.transaction;

          /**
           * Create objectstore if it doesnt exist
           *
           */ const _createStore = (
            db: IDBDatabase,
            storeName: string,
            params: IDBObjectStoreParameters
          ): IDBObjectStore => {
            if (!db.objectStoreNames.contains(storeName)) {
              return db.createObjectStore(storeName, params);
            } else {
              return tx.objectStore(storeName);
            }
          };

          /**
           * Create index if it dosent exist
           *
           */ const _createIndex = (
            store: IDBObjectStore,
            indexName: string,
            keyPath: string | string[],
            params: IDBIndexParameters
          ) => {
            if (!store.indexNames.contains(indexName)) {
              return store.createIndex(indexName, keyPath, params);
            }
          };

          /**
           * Version 1 Stores and indices
           */

          _createStore(db, "clientInfo", {
            autoIncrement: false,
            keyPath: "clientID",
          });

          /**
           * Docs in remote cache come from the server
           * Server sends relevant documents to client after connection
           * Any local changes made to the remote doc will move that doc from remote to the local cache
           *
           */ const remoteCache = _createStore(db, "remote", {
            autoIncrement: false,
            keyPath: "_id",
          });
          _createIndex(
            remoteCache,
            "by-collectionName",
            "_meta.collectionName",
            { multiEntry: false, unique: false }
          );

          /**
           * Clientside CRUD operations occur in batches, and they are preserved in the  LocalCache objectstore.
           * Each batch is treated as an atomic unit, All operations in a batch are executed atomically in the same database transaction
           *
           * LocalCache does not keep document revisions for simplicity, hence only the last (final) mutation is recorded
           * and it overwrites the previous mutations, when there are multiple mutations on the same document. Hence, its importaint to merge changes
           * when doing upserts so that the last revision which is stored contains the merged changes from all the mutations before it.
           *
           */ const localCache = _createStore(db, "local", {
            autoIncrement: false,
            keyPath: "_id",
          });
          _createIndex(
            localCache,
            "by-collectionName",
            "_meta.collectionName",
            {
              multiEntry: false,
              unique: false,
            }
          );

          const intercom = _createStore(db, "intercom", {
            autoIncrement: true,
            keyPath: "batchID",
          });
          _createIndex(intercom, "by-collectionName", "collectionNames", {
            multiEntry: true,
            unique: false,
          });
        },
        error: (error) => {
          this.#conn$.error(new IDBBrokenError(error));
        },
      });
  }

  /**
   * Open an `indexedDB` transaction from the `#conn_`
   * @param mode `readonly` or `readwrite`
   * @returns An `indexedDB` transaction store and events, wrapped in an RxJS `Observable`
   */
  _transaction$(mode: IDBTransactionMode): Observable<LMTX> {
    /**
     * Mergemap behavior is required here since we want parallel transaction objects.
     * Internally, the transaction will run in parallel only if mode is `readonly`.
     * Transaction scopes with `readwrite` mode will be run sequentially and enqueued by the browser agent
     *
     * Note that we are directly tapping into the `#conn$` stream, which is a `ReplaySubject` so it will
     * never end. Directly using a pipe() from `_transaction$()` will therefore create new transactions per operation
     * instead of doing those operations all in one transaction. For `BatchedMutation` we need to only listen to this stream
     * once, and then extract the transaction from it, and complete the stream and pass that transaction to the `BatchedMutation` class
     * so that we dont create multiple transactions.
     *
     */ return this.#conn$.pipe(
      mergeMap((database) => {
        let transaction: IDBTransaction;

        try {
          transaction = database.transaction(
            ["clientInfo", "remote", "local", "intercom"],
            mode
          );
        } catch (error) {
          return throwError(error as DOMException);
        }

        /* Extract stores from the transaction */
        const objectStores: IObjectStoresV1 = {
          clientInfo: transaction.objectStore("clientInfo"),
          remoteCache: transaction.objectStore("remote"),
          localCache: transaction.objectStore("local"),
          intercom: transaction.objectStore("intercom"),
        };

        /* Listen transaction `complete` and `error` events */
        const events$ = this._listenToTransactionEvents$(transaction);

        return of({ store: objectStores, events$ });
      })
    );
  }

  /**
   * Listen to errors on a transaction or request, and throw in RxJS style
   * so that error notifications are sent to subscribers,
   * or so that the error can be caught by `catchError` operator
   *
   * @param transactionOrRequest `indexedDb` transaction or request to listen to.
   * @returns An `Observable` that is listening to errors.
   * It will never emit any value, only emits error notification
   *
   *
   */ _listenToError$(
    transactionOrRequest: IDBTransaction | IDBRequest
  ): Observable<never> {
    return fromEvent(transactionOrRequest, "error").pipe(
      mergeMap(() => throwError(transactionOrRequest.error))
    );
  }

  /**
   * Listen to transaction `complete` and `error` events.
   * @param transaction Transaction to listen to.
   * @returns An `Observable` listening to transaction `complete` and `error` events.
   *
   *
   */ private _listenToTransactionEvents$(
    transaction: IDBTransaction
  ): Observable<Event> {
    /**
     * We listen to the two mutually exclusive events: `complete` and `error` on the transaction.
     * `race` only emits from the observable that emits first.
     * We don't complete the stream using `first` here. (the `callee` will handle that part when using the transaction)
     *
     */

    const complete$ = fromEvent(transaction, "complete");
    const error$ = this._listenToError$(transaction);
    return race([complete$, error$]);
  }

  get _conn$() {
    return this.#conn$;
  }
}
