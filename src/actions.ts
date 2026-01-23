import { instrument } from "succinct-async";
import { getTagValues } from "@welshman/util";
import { Alert, ALERT } from "./alert.js";
import * as worker from "./worker.js";
import * as db from "./database.js";

export type AddAlertParams = Pick<Alert, "event" | "tags">;

export const addAlert = instrument(
  "actions.addAlert",
  async ({ event, tags }: AddAlertParams) => {
    const alert = await db.insertAlert(event, tags);

    worker.addListener(alert);

    console.log(`Created alert ${alert.address}`)

    return alert;
  },
);

export type ProcessDeleteParams = Pick<Alert, "event">;

export const processDelete = instrument(
  "actions.processDelete",
  async ({ event }: ProcessDeleteParams) => {
    for (const address of getTagValues("a", event.tags)) {
      const [kind, pubkey] = address.split(":");

      if (kind !== String(ALERT)) {
        continue;
      }

      if (pubkey !== event.pubkey) {
        continue;
      }

      const alert = await db.getAlertByAddress(address);

      if (alert) {
        console.log(`Deleting alert ${address}`)
        await db.deleteAlertByAddress(address);
        worker.removeListener(alert);
      }
    }

    for (const id of getTagValues("e", event.tags)) {
      const alert = await db.getAlertById(id);

      if (alert?.pubkey === event.pubkey) {
        console.log(`Deleting alert ${id}`)
        await db.deleteAlertById(id);
        worker.removeListener(alert);
      }
    }
  },
);
