import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBU-0CFkKOkxipMaOgs-zjDSjqyHTu7Imc",
  authDomain: "game-studio-79af5.firebaseapp.com",
  projectId: "game-studio-79af5",
  storageBucket: "game-studio-79af5.firebasestorage.app",
  messagingSenderId: "140962899751",
  appId: "1:140962899751:web:8f5735a0bd24c13c5eeb02",
  measurementId: "G-Q1SVFLEMRM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const getRanking = async (type) => {
  const colName = type === "score" ? "userScore" : "userTime";
  const fieldName = type === "score" ? "userScore" : "userTime";

  const order = type === "score" ? "desc" : "asc";

  const q = query(
    collection(db, colName),
    orderBy(fieldName, order),
    limit(10),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
