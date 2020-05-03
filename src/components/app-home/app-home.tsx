import { Component, h } from "@stencil/core";
import { Store } from "../../lib";
import { IStoreSchema } from "../../lib/adapter/adapter.interfaces";

interface IUsers {
  uid: string;
}

interface IAbusers {
  aid: string;
}
interface mySchema extends IStoreSchema {
  users: IUsers;
  abusers: IAbusers;
}

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
})
export class AppHome {
  constructor() {
    const store = new Store<mySchema>();
    /**
     * @todo fix typing on return type of docsRead
     * It should not be `IDocument<IUsers | IAbusers>[]`, but be `IDocument<IUsers>[] | IDocument<IAbusers>[]`
     */
    store.batchedMutations().execute([], (op, docsRead) => {
      console.log(docsRead);
      for (let i = 0; i < 5; i++) {
        op.add(store.generateDocumentID(), "abusers", {
          aid: "123",
        });
      }

      /*
      
      op.add(store.generateDocumentID(), "abusers", {
        aid: "345",
      });
      */
    });
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
