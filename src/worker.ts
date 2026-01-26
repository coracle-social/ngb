import { parseJson, removeUndefined } from "@welshman/lib";
import { request } from "@welshman/net";
import { getTagValues, matchFilters, getTagValue, normalizeRelayUrl } from "@welshman/util";
import { deleteAlertByAddress } from "./database.js";
import { Alert } from "./alert.js";

const listenersByAddress = new Map();

const createListener = (alert: Alert) => {
  const callback = getTagValue("callback", alert.tags)!;
  const relays = getTagValues("relay", alert.tags).map(normalizeRelayUrl);
  const filters = removeUndefined(getTagValues("filter", alert.tags).map(parseJson))
  const ignore = removeUndefined(getTagValues("ignore", alert.tags).map(parseJson))
  const controller = new AbortController();
  const { signal } = controller;

  request({
    relays,
    filters,
    signal,
    onEvent: async (event, relay) => {
      if (!matchFilters(ignore, event)) {
        const res = await fetch(callback, {
          method: "POST",
          body: JSON.stringify({relay, event}),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          removeListener(alert)
          deleteAlertByAddress(alert.address)
        }
      }
    },
  });

  return { stop: () => controller.abort() };
};

export const addListener = (alert: Alert) => {
  console.log("registering alert", alert.address);

  listenersByAddress.get(alert.address)?.stop();
  listenersByAddress.set(alert.address, createListener(alert));
};

export const removeListener = (alert: Alert) => {
  console.log("unregistering alert", alert.address);

  listenersByAddress.get(alert.address)?.stop();
  listenersByAddress.delete(alert.address);
};
