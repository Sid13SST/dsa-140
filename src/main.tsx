import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Landing from './routes/Landing'
import SignIn from './routes/SignIn'
import Protected from './routes/Protected'
import './index.css'

// The dashboard and the admin console are the two heavy bundles, and neither is
// needed by a visitor who lands on the marketing page. Splitting them keeps the
// public entry small.
const App = lazy(() => import('./App'))
const Plans = lazy(() => import('./routes/Plans'))
const Admin = lazy(() => import('./routes/Admin'))

const Loading = () => (
  <div className="min-h-full flex items-center justify-center px-4 py-10">
    <p className="text-sm text-muted">Loading…</p>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* BASE_URL is whatever vite.config resolved, so the router and the
        asset paths can never disagree. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/plans" element={<Plans />} />
            <Route
              path="/app"
              element={
                <Protected>
                  <App />
                </Protected>
              }
            />
            <Route path="/admin" element={<Admin />} />
            {/* Anything else goes home rather than showing a blank page. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
