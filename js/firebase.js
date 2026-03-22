// ═══════════════════════════════════════════════
// FIREBASE CONFIG
// Paste your Firebase project config below
// Get it from: Firebase Console → Project Settings → Your apps
// ═══════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider,
  signInWithPopup, multiFactor, TotpMultiFactorGenerator, getMultiFactorResolver
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, serverTimestamp,
  increment, addDoc, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── PASTE YOUR FIREBASE CONFIG HERE ─────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// ────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

window._fb = {
  auth: getAuth(app),
  db: getFirestore(app),
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup,
  multiFactor, TotpMultiFactorGenerator, getMultiFactorResolver,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, serverTimestamp, increment, addDoc, where
};
