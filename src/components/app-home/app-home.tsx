import { Component, h } from "@stencil/core";
import { Store } from "../../lib";
import { IStoreSchema, IDocument } from "../../lib/interfaces";
import { race } from "rxjs";
import { mergeMap, map } from "rxjs/operators";

// First, we declare our models

interface IUser extends IDocument<mySchema, "users"> {
  userName: string;
}

interface IAbuser extends IDocument<mySchema, "abusers"> {
  abuserName: string;
  _meta: {
    collectionName: "abusers";
    createdAt: number;
    lastUpdatedAt: number;
  };
}

// Second, we declare our schema based on our models

interface mySchema extends IStoreSchema {
  users: IUser;
  abusers: IAbuser;
}

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
})
export class AppHome {
  constructor() {
    const store = new Store<mySchema>();

    store
      .initializeBatchedOp("readwrite")
      .pipe(
        mergeMap((op) => {
          op.add("id123", { name: "Rick" });
          op.add("id243", { name: "John" });

          return op.execute();
        })
      )
      .subscribe();
  }
  render() {
    return [
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Demo Client App</ion-title>
        </ion-toolbar>
      </ion-header>,

      <ion-content class="ion-padding">
        <p>Welcome</p>
      </ion-content>,
    ];
  }
}
