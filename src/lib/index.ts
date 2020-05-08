import ObjectID from "bson-objectid";
import { Adapter } from "./adapter/adapter";
import { IStoreSchema, CollectionNames, DocumentID } from "./interfaces";

import { BatchedMutation } from "./mutations/mutations";
import { Observable, scheduled, queueScheduler } from "rxjs";
import { first, mergeAll, take, finalize } from "rxjs/operators";

/**
 * @todo test if having multiple instances of `Store` using `new Store()` from multiple files in the client app is an issue
 *
 */ export class Store<storeSchema extends IStoreSchema> {
  readonly #adapter: Adapter = new Adapter();

  constructor() {}

  /**
   *
   * @param collectionName name of the collection
   *
   * @todo implement collection class, which has a mongodb sryle find() method for live queries
   */
  collection<collectionName extends CollectionNames<storeSchema>>(
    collectionName: collectionName
  ) {
    collectionName;
  }

  createBatchedMutation(
    mode: IDBTransactionMode,
    BatchedMutationCallback: (op: BatchedMutation<storeSchema>) => void
  ) {
    /*
     * The `transaction$()` stream never ends as it pipes from a ReplaySubject.
     * Piping directly from `transaction$()` stream will therefore create new transactions per operation
     * instead of doing those operations all in one transaction. For `BatchedMutation` we need to only listen to this stream
     * once, and then extract the transaction from it, and complete the stream and pass that transaction to the `BatchedMutation` class
     * so that it doesn't create multiple transactions on the connection
     *
     */ const tx = this.#adapter._transaction$(mode).pipe(first()).toPromise();

    BatchedMutationCallback(new BatchedMutation<storeSchema>(tx, this));
  }

  get _adapter(): Adapter {
    return this.#adapter;
  }
}

export const generateDocumentID = (): DocumentID => {
  return new ObjectID().str;
};
