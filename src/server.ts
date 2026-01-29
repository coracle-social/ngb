import { Hono } from "hono";
import { cors } from "hono/cors";
import { createNodeWebSocket } from "@hono/node-ws";
import type { Context, Next } from "hono";
import { signer, CORS_DOMAIN } from "./env.js";
import { Connection } from "./relay.js";

export const app = new Hono();

app.use("/*", cors({ origin: CORS_DOMAIN }));

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get("/", async (c: Context, next: Next) => {
  if (c.req.header("Upgrade") === "websocket") {
    await next();
  } else if (c.req.header("Accept") !== "application/nostr+json") {
    return c.json({ error: "Not found" }, 404);
  } else {
    return c.json(
      {
        name: "Nostr Push Bridge",
        icon: "https://pfp.nostr.build/2644089e06a950889fa4aa81f6152a51fba23497735cbba351aa6972460df6f5.jpg",
        description:
          "A relay which accepts kind 30390 push notification subscriptions on behalf of public relays.",
        self: await signer.getPubkey(),
        pubkey: await signer.getPubkey(),
        software: "https://github.com/coracle-social/npb",
        supported_nips: ["1", "9", "11", "42", "9a"],
      },
      200,
      { "Content-Type": "application/nostr+json; charset=utf-8" },
    );
  }
});

let connectionsCount = 0;

app.get(
  "/",
  upgradeWebSocket((c) => {
    return {
      onOpen(_event, ws) {
        const socket = ws.raw;
        if (!socket) {
          console.error("WebSocket raw socket is undefined");
          return;
        }

        const hostname = c.req.header("host") || "";
        const connection = new Connection(socket, hostname);

        console.log(
          `Opening websocket connection; ${++connectionsCount} total`,
        );

        socket.on("message", (msg) => connection.handle(msg));

        socket.on("error", () => {
          console.log(
            `Error on websocket connection; ${--connectionsCount} total`,
          );
          connection.cleanup();
        });

        socket.on("close", () => {
          console.log(
            `Closing websocket connection; ${--connectionsCount} total`,
          );
          connection.cleanup();
        });
      },
    };
  }),
);

export { injectWebSocket };
