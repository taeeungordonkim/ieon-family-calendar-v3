import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const ping = functions.https.onCall(async () => {
  return { ok: true, ts: Date.now() };
});
