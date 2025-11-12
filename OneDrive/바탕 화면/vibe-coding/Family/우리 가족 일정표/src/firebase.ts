// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAIo8sgMLH-XOf72HeaHCrG4HoNoFpRw1Q",
  authDomain: "ieon-family-calendar.firebaseapp.com",
  projectId: "ieon-family-calendar",
  appId: "1:77074872557:web:d5c2711cfef739277ef4e4"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// 개발 환경(로컬)에서는 에뮬레이터에 연결
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, functions };
