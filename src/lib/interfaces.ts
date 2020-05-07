import ObjectID from "bson-objectid";

export type DocumentID = ObjectID["str"];
export type DateTimeMs = number; // Epoch Milliseconds

/**
 * Schema that defines the interface of all documents in the store.
 * The `Store` is fully typed.
 * The client app needs to extend  `IStoreSchema` and provide that to the `Store` for the typings to work correctly
 *
 * `key` is the collection name, `value` is the interface of a document which belongs to that collection
 * The interface of the document has to extend from `IDocument` base interface
 *
 * @todo provide inline example from demo client app
 *
 */ export interface IStoreSchema {
  [collectionName: string]: unknown;
}

/**
 * Extracts the keys from an interface `T` which describes an indexable type.
 *
 * @template T The interface from which we are extracting the keys.
 * `T` looks like the example below:
 * @example
 * ```
 * interface T {
 * [key: string]: unknown;
 * }
 * ```
 *
 * @note A simple `keyOf` wouldnt work here since the interface `T` defines an index signature `[key: string]: someType` instead of
 * defining pre-known keys. We need to `infer` since the keys come from the client app
 *
 *
 */ export type ExtractKeysFrom<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends { [_ in keyof T]: infer U }
  ? U
  : never;

/**
 * Extract names of the collections from IStoreSchema
 *
 */ export type CollectionNames<
  storeSchema extends IStoreSchema
> = storeSchema extends IStoreSchema ? ExtractKeysFrom<storeSchema> : string;

/**
 * Typings for an array of strings where the string entries are collection names
 * @example
 * ```
 * const myCollectionNames = ["users","posts","details"] // where collectionNames can be "users"|"posts"|"details"
 * ```
 *
 */ export type arrayOfCollectionNames<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>
> = [collectionNames] extends [CollectionNames<storeSchema>]
  ? Array<collectionNames>
  : never;

/**
 * Base interface for a document in the store.
 * The collections in `IStoreSchema` must extend `IDocument`
 *
 */ export interface IDocument<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>
> {
  /**
   * @param _id primary key: BSON ObjectID in string format
   * @example
   * ```
   * const _id:DocumentID = Store.generateDocumentID();
   *
   * ```
   */ _id: DocumentID;

  /**
   * @param _meta Contains additional metadata populated by the library on every CRUD
   *
   */ _meta: IDocumentMetadata<storeSchema, collectionNames>;
}

export interface IDocumentMetadata<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>
> {
  /**
   * @param collectionName Name of the collection this document belongs to
   *
   */ collectionName: collectionNames;

  createdAt: DateTimeMs;
  lastUpdatedAt: DateTimeMs;
}

/**
 * IStoreSchema defines the shape of the store as follows:
 * `key` is the collection name, `value` is the interface of a document which belongs to that collection.
 *
 * Hence, `TDoc` is the extracted `value` portion from `IStoreSchema`
 * `TDoc` must extend `IDocument`
 *
 */

export type TDoc<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>,
  doc extends IDocument<storeSchema, collectionNames>
> = storeSchema extends IStoreSchema
  ? doc extends IDocument<storeSchema, collectionNames>
    ? storeSchema[collectionNames] extends doc
      ? storeSchema[collectionNames] & doc
      : never
    : never
  : never;

/**
 * Typing for an array of documents whose interface is `TDoc`
 *
 * @template storeSchema An interface that extends `IStoreSchema`
 * @template collectionNames An interface that extends `CollectionNames`
 *
 */

export type TDocArr<
  storeSchema extends IStoreSchema,
  collectionNames extends CollectionNames<storeSchema>,
  doc extends IDocument<storeSchema, collectionNames>,
  T = TDoc<storeSchema, collectionNames, doc>
> = T extends TDoc<storeSchema, collectionNames, doc> ? T[] : never[];
