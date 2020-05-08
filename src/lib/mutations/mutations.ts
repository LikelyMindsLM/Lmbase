import { LMTX } from "../adapter/adapter.interfaces";
import {
  Observable,
  race,
  fromEvent,
  scheduled,
  queueScheduler,
  from,
} from "rxjs";
import { Store } from "../index";
import { IStoreSchema } from "../interfaces";

import { mergeMap, mergeAll, first, take, finalize } from "rxjs/operators";

/**
 * `BatchedMutation` allows for CRUD operations
 * The CRUD operations in a batch are treated as an atomic unit
 *
 * The order of operations are maintained, except for `get`
 * All `get` operations must come before other operations. This is because
 * the order of `get` operations are not in sync with the rest of the batched operations
 *
 *
 * @todo serialize and deserialize
 *
 */ export class BatchedMutation<storeSchema extends IStoreSchema> {
  readonly #tx: Observable<LMTX>;
  readonly #store: Store<storeSchema>;

  /**
   * Contains an array of observables, where each observable is a result of one mutation operation.
   * The observables in the batch will be `subscribed to` sequentially, similar to RXJS `concat`
   * The batch is executed with a RXJS `queueScheduler`
   *
   */ #batch: Observable<Event>[] = [];

  constructor(tx: Promise<LMTX>, store: Store<storeSchema>) {
    this.#store = store;
    this.#tx = from(tx);
  }

  /**
   * Adds a new document to the collection.
   * If a document with the key already exists the request will fail with a "ConstraintError" DOMException.
   *
   * @param docID use `generateDocumentID()` for document id
   * @param doc the document to be added
   *
   * @todo implement collection system
   *
   *
   */ add(docID: string, doc: any) {
    const serializedDoc = { ...doc, _id: docID };
    const op = this.#tx.pipe(
      mergeMap((tx) => {
        const req = tx.store.localCache.add(serializedDoc);
        const success$ = fromEvent(req, "success");
        const error$ = this._adapter._listenToError$(req);
        return race(success$, error$, tx.events$).pipe(first());
      })
    );
    this.#batch.push(op);
  }

  /**
   * Deletes a document from the collection.
   * Indexeddb will return `undefined` if the delete request was sucesful or of the document doesn't exist
   *
   * @param docID ID of the document to be deleted
   *
   *
   */ delete(docID: string) {
    const op = this.#tx.pipe(
      mergeMap((tx) => {
        const req = tx.store.localCache.delete(docID);
        const success$ = fromEvent(req, "success");
        const error$ = this._adapter._listenToError$(req);
        return race(success$, error$, tx.events$).pipe(first());
      })
    );
    this.#batch.push(op);
  }

  /**
   * While `BatchedMutation` is mostly meant for creating mutations (ie, writes, updates, and deletes), it is sometimes
   * necessary to read a document from inside the same transaction that is performing the mutation. `get` method fulfils that use-case.
   * It is not meant for `querying` and the document ID must be known beforehand.
   *
   * All `get` operations must come before other operations.
   *
   * @param docID ID of the document to be read
   *
   *
   */ get(docID: string) {
    const op = this.#tx.pipe(
      mergeMap((tx) => {
        const req = tx.store.localCache.get(docID);
        const success$ = fromEvent(req, "success");
        const error$ = this._adapter._listenToError$(req);
        return race(success$, error$, tx.events$).pipe(first());
      })
    );
    /**
     * `get` operations are not pushed onto the batch,
     * hence they run outside of the `queueScheduler` in the `execute` method.
     * Actually, they run before the other requests since `execute()` needs to be called on the batch to perform the other requests
     * since they are only `batched` at that point, but none of them have executed since the batch hasnt been subscribed to.
     *
     */ return op.pipe(first()).toPromise();
  }

  /**
   * Observables in the `#batch` needs to be subscribed to for the mutation operations to occur. RXJS `scheduled` with the `queueScheduler`
   * will sequentially  subscribe to all observables in the `#batch`, similar to `concat`.
   *
   * `execute` should be the last thing called, and represents the end of a mutation batch
   *
   */ executeBatch() {
    scheduled(this.#batch, queueScheduler)
      .pipe(
        mergeAll(),
        take(this.#batch.length),
        finalize(() => {
          this.#batch = [];
        })
      )
      .subscribe();
  }

  get _adapter() {
    return this.#store._adapter;
  }
}
