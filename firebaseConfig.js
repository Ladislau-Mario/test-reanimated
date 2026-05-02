import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 1. Copia os dados EXATOS da tua imagem do console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAchG-zR3xFonQJ41zjukWIhYKXLweeK-E",
  authDomain: "baza-application-4e83f.firebaseapp.com",
  projectId: "baza-application-4e83f",
  storageBucket: "baza-application-4e83f.firebasestorage.app",
  messagingSenderId: "358855325316",
  appId: "1:358855325316:web:c34eac7956ad987b21b4d1"
};

// 2. Inicializa o App
const app = initializeApp(firebaseConfig);

// 3. Inicializa o Auth com a persistência para React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export default app;