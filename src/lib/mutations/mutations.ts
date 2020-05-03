import type {
  IStoreSchema,
  CollectionNames,
  TDoc,
  DocumentID,
  TColl,
} from "../adapter/adapter.interfaces";
import type { Store } from "../index";
import type { MutationBatch } from "./mutation.interfaces";
import ObjectID from "bson-objectid";
import { Adapter } from "../adapter/adapter";

/**
 *
 * `BatchedMutation` allows for CRUD operations
 * The CRUD operations in a batch are treated as an atomic unit
 *
 * @template storeSchema An interface that extends `IStoreSchema`
 * @template collectionNames An interface that extends `CollectionNames`
 *
 */
export class BatchedMutation<storeSchema extends IStoreSchema> {
  #store: Store<storeSchema>;

  /**
   * Contains queued mutation actions that will be executed inside a single `indexeddb` transaction
   *
   */ #batch: MutationBatch<storeSchema, CollectionNames<storeSchema>> = [];

  /**
   * a monotonically increasing integer to sort the mutation batch
   *
   */ #opID: number = 0;

  constructor(store: Store<storeSchema>) {
    this.#store = store;
  }

  /**
   * @param _id BSON ObjectID used by MongoDB as primary key
   * @param collectionName name of the collection this document belongs to
   * @param doc the new document to be inserted
   *
   *
   */ add<collectionNames extends CollectionNames<storeSchema>>(
    _id: ObjectID,
    collectionName: collectionNames,
    doc: TDoc<storeSchema, collectionNames>
  ) {
    this.#batch.push({
      op: "CREATE",
      collectionName: collectionName,
      doc: doc,
      opID: this.#opID += 1,
      _id: _id,
    });
  }

  /**
   * @param _id BSON ObjectID of the document to be replaced
   * @param collectionName name of the collection this document belongs to (can be old or new collection name)
   * @param doc the updated document
   *
   *
   */ replaceExisting<collectionNames extends CollectionNames<storeSchema>>(
    _id: ObjectID,
    collectionName: collectionNames,
    doc: TDoc<storeSchema, collectionNames>
  ) {
    this.#batch.push({
      op: "UPDATE",
      collectionName: collectionName,
      doc: doc,
      opID: this.#opID += 1,
      _id: _id,
    });
  }

  /**
   * @param _id BSON ObjectID of the document to be deleted
   * @param collectionName name of the collection this document belongs to
   *
   *
   */ delete<collectionNames extends CollectionNames<storeSchema>>(
    _id: ObjectID,
    collectionName: collectionNames
  ) {
    this.#batch.push({
      op: "DELETE",
      collectionName: collectionName,
      doc: null,
      opID: this.#opID += 1,
      _id: _id,
    });
  }

  /**
   * @param docIDs DocumentIDs to read (inside of the transaction), before performing the write operations.
   * @param mutationOps a callback function that will be called with the results from the documents read,
   * the parameter `op` can be used to chain multiple `add()` , `replaceExisting()` , and `delete()` operations
   *
   * @todo  add inline example from the demo client app to demonstrate the api
   *
   */ execute(
    docIDs: DocumentID[] | null,
    mutationOps: (
      op: BatchedMutation<storeSchema>,
      documentsRead: TColl<storeSchema, CollectionNames<storeSchema>>
    ) => void
  ) {
    this._adapter._executeMutationBatch<storeSchema>(
      docIDs,
      (documentsRead) => {
        mutationOps(this, documentsRead);
        /**
         * return the mutation batch after `mutationOps()` callback so that the chained mutation actions are pushed to the batch.
         * otherwise, `this.#batch` will be empty since the chaining would not have happened before the callback
         *
         */ return this.#batch;
      }
    );
  }

  get _adapter(): Adapter {
    return this.#store._adapter;
  }
}
