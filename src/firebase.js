import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            'AIzaSyAHBf6z6TRhBpqPm2to073VtiHJ7ZyXGv4',
  authDomain:        'hike-agentic-playground.firebaseapp.com',
  projectId:         'hike-agentic-playground',
  storageBucket:     'hike-agentic-playground.appspot.com',
  messagingSenderId: '966549276703',
  appId:             '1:966549276703:web:683e642618d1f52d62ed2a',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Microsoft provider (accepts corporate M365 accounts like franco.victorio@ngr.com.pe)
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  tenant: 'common', // accepts any Azure AD tenant OR personal Microsoft accounts
});

// Legacy export so existing code that uses `provider` doesn’t break
export const provider = googleProvider;
