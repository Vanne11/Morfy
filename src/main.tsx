import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './app/i18n'; // Initialize i18next

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback="Loading...">
      <HashRouter>
        <App />
      </HashRouter>
    </Suspense>
  </StrictMode>,
)
