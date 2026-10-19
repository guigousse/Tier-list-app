// Refunds of energy packs. Apple tells the server (App Store Server Notifications V2,
// function appstore-notify): when a player asks for a refund, it asks how much of the pack
// was used (CONSUMPTION_REQUEST, 12 h to answer), and the answer weighs on its decision;
// when it refunds anyway (REFUND), the credits left are taken back and the rest becomes a
// debt (wallet_refund). Without this, energy spent on generations then refunded would be
// AI paid for nothing.
import { type AppleJwsOptions, verifyAppleJws } from "./appleJws.ts";

export type Notification = { type: string; environment: string; transactionId: string; productId: string };

/** What a signed notification is about; throws when it isn't Apple's, or not for this app. */
export async function readNotification(signedPayload: string, opts: AppleJwsOptions & { bundleId: string }): Promise<Notification> {
  const payload = await verifyAppleJws(signedPayload, opts);
  const data = (payload.data ?? {}) as Record<string, unknown>;
  if (data.bundleId !== opts.bundleId) throw new Error("app does not match");
  // The transaction inside is signed on its own: checked the same way. Some notifications
  // (TEST, sent on request through the App Store Server API) carry none.
  const tx = data.signedTransactionInfo ? await verifyAppleJws(String(data.signedTransactionInfo), opts) : { bundleId: opts.bundleId };
  if (tx.bundleId !== opts.bundleId) throw new Error("app does not match");
  return {
    type: String(payload.notificationType ?? ""),
    environment: String(data.environment ?? ""),
    transactionId: String(tx.transactionId ?? ""),
    productId: String(tx.productId ?? ""),
  };
}

/**
 * The answer to a refund request (Send Consumption Information, v2): how much of the
 * pack was spent, read from the balance (the credits of the pack go first), and the
 * outcome we prefer. The player agreed to this under the packs (src/app/store.tsx), and
 * the welcome bonus is the free sample given before any purchase.
 */
export function consumptionInfo(purchased: number, balance: number) {
  const spent = Math.min(purchased, Math.max(0, purchased - balance));
  const share = purchased > 0 ? spent / purchased : 0;
  return {
    customerConsented: true,
    consumptionPercentage: Math.round(share * 100000),
    deliveryStatus: "DELIVERED",
    refundPreference: share === 0 ? "GRANT_FULL" : share >= 1 ? "DECLINE" : "GRANT_PRORATED",
    sampleContentProvided: true,
  };
}

export type ServerApiKey = { key: string; keyId: string; issuerId: string; bundleId: string };

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const text64 = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

/** A 5-minute token for the App Store Server API, signed with the In-App Purchase key. */
export async function serverApiToken(k: ServerApiKey, now = new Date()): Promise<string> {
  const der = Uint8Array.from(atob(k.key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const iat = Math.floor(now.getTime() / 1000);
  const input = `${text64({ alg: "ES256", kid: k.keyId, typ: "JWT" })}.${text64({ iss: k.issuerId, iat, exp: iat + 300, aud: "appstoreconnect-v1", bid: k.bundleId })}`;
  // WebCrypto's ECDSA signature is r ‖ s, as JWS wants it.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

/** Sends the consumption of a pack to Apple, in the environment the purchase was made. */
export async function sendConsumption(k: ServerApiKey, environment: string, transactionId: string, body: ReturnType<typeof consumptionInfo>) {
  const host = environment === "Sandbox" ? "https://api.storekit-sandbox.apple.com" : "https://api.storekit.apple.com";
  const res = await fetch(`${host}/inApps/v2/transactions/consumption/${transactionId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${await serverApiToken(k)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`consumption ${res.status} ${(await res.text()).slice(0, 200)}`);
}
