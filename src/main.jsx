import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGuard from './components/AuthGuard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGuard>
      {({ user, signOut }) => <App user={user} onSignOut={signOut} />}
    </AuthGuard>
  </StrictMode>,
)
