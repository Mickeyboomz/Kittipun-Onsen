import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDv_LwrGUnOn2WuekBK2rgW_D6pIWkbQNo",
    authDomain: "onsenfridayfunny.firebaseapp.com",
    projectId: "onsenfridayfunny",
    storageBucket: "onsenfridayfunny.firebasestorage.app",
    messagingSenderId: "202780568348",
    appId: "1:202780568348:web:d1e5acd345d9f66d7e68d9",
    measurementId: "G-F218EQTBBW"
};

const app = initializeApp(firebaseConfig);

let analytics = null;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app, analytics };
