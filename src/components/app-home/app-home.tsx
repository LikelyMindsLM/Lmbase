import { Component, h } from "@stencil/core";
import { Store } from "../../lib";
import { IStoreSchema, IDocument } from "../../lib/interfaces";

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
  async componentDidLoad() {
    const store = new Store<mySchema>();
    store.createBatchedMutation("readwrite", async (op) => {
      const rick = (await op.get("1")).target["result"];
      console.log(rick);
      op.add("1", { name: "Rick" });
      op.add("2", { name: "Sally" });
      op.executeBatch();
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
