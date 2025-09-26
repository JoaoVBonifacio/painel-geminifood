import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzlPsmqZPp3GyTqgurFd5cu8YEyjJmiPI",
  authDomain: "geminaiappa.firebaseapp.com",
  projectId: "geminaiappa",
  storageBucket: "geminaiappa.firebasestorage.app",
  messagingSenderId: "802160009521",
  appId: "1:802160009521:web:2bb8baab8d4a7ba1229010",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };