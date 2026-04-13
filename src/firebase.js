import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyAHBf6z6TRhBpqPm2to073VtiHJ7ZyXGv4',
  authDomain:        'hike-agentic-playground.firebaseapp.com',
  projectId:         'hike-agentic-playground',
  storageBucket:     'hike-agentic-playground.firebasestorage.app',
  messagingSenderId: '966549276703',
  appId:             '1:966549276703:web:683e642618d1f52d62ed2a',
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
