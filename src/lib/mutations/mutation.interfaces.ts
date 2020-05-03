import ObjectID from "bson-objectid";
import {
  CollectionNames,
  IStoreSchema,
  TDoc,
} from "../adapter/adapter.interfaces";

/**
 * `IMutationAction` represents the shape of a single mutation object inside the `MutationBatch`
 *
 * @param opID monotonically increasing integer to sort the mutation batch
 * @param op mutation operation type, which can be of the following 3 types: `create`, `update`, `delete`
 * @param doc state of document after the mutation, or null if deleted
 * @param _id BSON ObjectID used by MongoDB as primary key
 * @param collectionName name of the collection this document belongs to
 *
 * @template storeSchema An interface that extends `IStoreSchema`
 * @template collectionNames An interface that extends `CollectionNames`
 *
 */ export interface IMutationAction<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>
> {
  op: MutationType;
  collectionName: CollectionNames<storeSchema>;
  doc: TDoc<storeSchema, collectionNames>;
  opID: number;
  _id: ObjectID;
}

/**
 * Queued mutations that will be executed inside a single `indexeddb` transaction
 *
 * @template storeSchema An interface that extends `IStoreSchema`
 * @template collectionNames An interface that extends `CollectionNames`
 *
 */ export type MutationBatch<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>
> = IMutationAction<storeSchema, collectionNames>[];

export type MutationType = "CREATE" | "UPDATE" | "DELETE";
