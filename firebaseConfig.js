import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// As tuas chaves de configuração do Firebase
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  // ... resto das tuas chaves
};

const app = initializeApp(firebaseConfig);

// A forma correta para React Native (Persistência)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});