import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

async function testPing() {
  const ping = httpsCallable(functions, "ping");
  const res = await ping();
  console.log("PING:", res.data);
}

testPing();
