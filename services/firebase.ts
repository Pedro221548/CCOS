
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyBBSwL1hegAmLIgEuyRPoIUXvh_e8e8QtY",
  authDomain: "controle-de-apostas-esportivas.firebaseapp.com",
  databaseURL: "https://controle-de-apostas-esportivas-default-rtdb.firebaseio.com",
  projectId: "controle-de-apostas-esportivas",
  storageBucket: "controle-de-apostas-esportivas.firebasestorage.app",
  messagingSenderId: "621749585275",
  appId: "1:621749585275:web:ec82a1edc9b7631f1269de",
  measurementId: "G-CM4V3JFSGW"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
