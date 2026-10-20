import type { Bits } from "./deviceCheck.ts";

export type Deps = {
  queryBits: (token: string) => Promise<Bits | null>;
  /** public.claim_challenge's status. */
  claim: () => Promise<string>;
  setBit0: (token: string, bit1: boolean) => Promise<boolean>;
};

/**
 * Whether this claim may pay the sponsor. Without a DeviceCheck token (Android, web, an app
 * older than this check) nobody vouches for the device: no referral. If Apple can't answer,
 * nothing is claimed and the app asks again later ("retry"): paying without the check would
 * let a reinstall be sponsored again, waiting costs the player nothing.
 */
export async function decideClaim(token: string, deps: Deps): Promise<string> {
  if (!token) return "not_new";
  const bits = await deps.queryBits(token);
  if (!bits) return "retry";
  if (bits.bit0) return "device_used";
  const status = await deps.claim();
  if (status === "credited") {
    // The referral row is written: a failed mark only reopens the door to a reinstall, so one
    // more try, then the credit stands (the database still refuses the same device id).
    if (!(await deps.setBit0(token, bits.bit1)) && !(await deps.setBit0(token, bits.bit1))) {
      console.error("devicecheck: credited but bit0 not set");
    }
  }
  return status;
}
