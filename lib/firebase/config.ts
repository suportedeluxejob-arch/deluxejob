import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCoTBdVUdRRGBioZWa78Nz0YQibJYp06vk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "deluxejob-8fc1e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "deluxejob-8fc1e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "deluxejob-8fc1e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "23015412981",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:23015412981:web:94c64b99c912d2ffe521bc",
  databaseURL: "https://deluxejob-8fc1e-default-rtdb.firebaseio.com",
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.warn("[v0] Firebase initialization deferred:", error)
}

export const getFirebaseAuth = () => auth
export const getFirebaseDb = () => db
export const getFirebaseStorage = () => storage
export const getFirebaseApp = () => app

export { app, auth, db, storage }
export default app
