import "dotenv/config";
import { Nip01Signer } from "@welshman/signer";

if (!process.env.PORT) throw new Error("PORT is not defined.");
if (!process.env.SECRET) throw new Error("SECRET is not defined.");
if (!process.env.DATA_DIR) throw new Error("DATA_DIR is not defined.");
if (!process.env.CORS_DOMAIN) throw new Error("CORS_DOMAIN is not defined.");

export const PORT = process.env.PORT;
export const signer = Nip01Signer.fromSecret(process.env.SECRET);
export const DATA_DIR = process.env.DATA_DIR;
export const CORS_DOMAIN = process.env.CORS_DOMAIN;

signer.getPubkey().then((pubkey) => {
  console.log(`Running as ${pubkey}`);
});
