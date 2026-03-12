import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export type GoalStatus = "plan" | "do" | "check" | "act";

export interface Goal {
  id?: string;
  title: string;
  description: string;
  status: GoalStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const GOALS_COLLECTION = "goals";

/** ゴールを Firestore に保存する */
export async function saveGoal(goal: Omit<Goal, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, GOALS_COLLECTION), {
    ...goal,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** ゴールを更新する */
export async function updateGoal(id: string, data: Partial<Omit<Goal, "id" | "createdAt">>): Promise<void> {
  const docRef = doc(db, GOALS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** ゴールを削除する */
export async function deleteGoal(id: string): Promise<void> {
  const docRef = doc(db, GOALS_COLLECTION, id);
  await deleteDoc(docRef);
}

/** 全ゴールを取得する */
export async function getGoals(): Promise<Goal[]> {
  const snapshot = await getDocs(collection(db, GOALS_COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
}
