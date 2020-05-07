import { IObjectStoresV1 } from "../adapter/adapter.interfaces";
import { Observable } from "rxjs";
import { Store } from "../index";
import { IStoreSchema } from "../interfaces";

import { fromEvent, race } from "rxjs";

/**
 * `BatchedMutation` allows for CRUD operations
 * The CRUD operations in a batch are treated as an atomic unit
 *
 */ export class BatchedMutation<storeSchema extends IStoreSchema> {
  readonly #tx: { store: IObjectStoresV1; events: Observable<Event> };
  readonly _store: Store<storeSchema>;
  constructor(
    store: Store<storeSchema>,
    tx: { store: IObjectStoresV1; events: Observable<Event> }
  ) {
    this.#tx = tx;
    this._store = store;
  }

  add(docID: string, doc: any) {
    let req = this.#tx.store.localCache.add({ ...doc, _id: docID });
    const success$ = fromEvent(req, "success");
    const error$ = this._adapter._listenToError$(req);

    return race(success$, error$);
  }

  execute() {
    return this.#tx.events;
  }

  get _adapter() {
    return this._store._adapter;
  }
}
