// firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTFYpxS0aS9cC2nJh8jhRTd5loNTu2rrc",
  authDomain: "hackt-53cd7.firebaseapp.com",
  projectId: "hackt-53cd7",
  storageBucket: "hackt-53cd7.firebasestorage.app",
  messagingSenderId: "49144707537",
  appId: "1:49144707537:web:a1c37fb1fbeb9502ca48f0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
