import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCfh_Rv7bXuETnw1BTu3vxX4baxeV4Y02M",
  authDomain: "sprintnix-31c12.firebaseapp.com",
  projectId: "sprintnix-31c12",
  storageBucket: "sprintnix-31c12.firebasestorage.app",
  messagingSenderId: "624379655512",
  appId: "1:624379655512:web:65a157d56472f7d95b212d",
  measurementId: "G-GD8239Z45V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
