import ObjectID from "bson-objectid";
import { Adapter } from "./adapter/adapter";
import { IStoreSchema, CollectionNames } from "./adapter/adapter.interfaces";
import { BatchedMutation } from "./mutations/mutations";

/**
 * @todo test if having multiple instances of `Store` using `new Store()` from multiple files in the client app is an issue
 *
 * @template storeSchema An interface that extends `IStoreSchema`
 *
 */ export class Store<storeSchema extends IStoreSchema> {
  readonly #adapter: Adapter;

  constructor() {
    this.#adapter = new Adapter();
  }

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

  batchedMutations(): BatchedMutation<storeSchema> {
    return new BatchedMutation<storeSchema>(this);
  }

  generateDocumentID() {
    return new ObjectID();
  }

  get _adapter(): Adapter {
    return this.#adapter;
  }
}
