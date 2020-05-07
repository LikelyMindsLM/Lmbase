import ObjectID from "bson-objectid";
import { Adapter } from "./adapter/adapter";
import { IStoreSchema, CollectionNames, DocumentID } from "./interfaces";

import { of } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { BatchedMutation } from "./mutations/mutations";

/**
 * @todo test if having multiple instances of `Store` using `new Store()` from multiple files in the client app is an issue
 *
 */ export class Store<storeSchema extends IStoreSchema> {
  private readonly __adapter: Adapter = new Adapter();

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

  initializeBatchedOp(mode: IDBTransactionMode) {
    return this.__adapter._transaction$(mode).pipe(
      mergeMap((tx) => {
        return of(new BatchedMutation<storeSchema>(this, tx));
      })
    );
  }

  generateDocumentID(): DocumentID {
    return new ObjectID().str;
  }

  get _adapter(): Adapter {
    console.log(this.__adapter);
    return this.__adapter;
  }
}
