import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** A random URL-safe secret for links (invitations); store only `hash`, send only `token`. */
export function newSecretToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashSecretToken(token) };
}

export function hashSecretToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
