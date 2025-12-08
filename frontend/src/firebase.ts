import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSsOIx8p3nvhYHC7PoJOqpKxlfRra8oN4",
  authDomain: "hexachromy.firebaseapp.com",
  projectId: "hexachromy",
  storageBucket: "hexachromy.firebasestorage.app",
  messagingSenderId: "936279161748",
  appId: "1:936279161748:web:7ed26037f2b0755e092d81",
  measurementId: "G-F0KPDEB6QN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore(app);

export { auth, firestore, googleProvider };
