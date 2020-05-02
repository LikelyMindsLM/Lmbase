/**
 * Exception message when `indexedDB` is not working
 */

export const IDB_BROKEN_ERROR = "indexedDB is not working";

/**
 * Exception raised when `indexedDB` is not working
 */

export class IDBBrokenError extends Error {
  errObj: any;
  constructor(errObj: any, message = IDB_BROKEN_ERROR) {
    super(message);
    this.errObj = errObj;
  }
}
