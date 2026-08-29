import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { CLERK_PUBLISHABLE_KEY, clerkConfigured } from './lib/clerk'
import { AUTH_ENABLED } from './lib/flags'
import Landing from './routes/Landing'
import SignIn from './routes/SignIn'
import Protected from './routes/Protected'
import './index.css'

// The dashboard and the admin console are the two heavy bundles, and neither is
// needed by a visitor who lands on the marketing page.
const App = lazy(() => import('./App'))
const Plans = lazy(() => import('./routes/Plans'))
const Admin = lazy(() => import('./routes/Admin'))
// One address ever reaches this, and /api/insights enforces that server-side.
const SuperAdmin = lazy(() => import('./routes/SuperAdmin'))

const Loading = () => (
  <div className="min-h-full flex items-center justify-center px-4 py-10">
    <p className="text-sm text-muted">Loading…</p>
  </div>
)

const Tree = () => (
  /* BASE_URL is whatever vite.config resolved, so the router prefix and the
     asset prefix can never disagree. */
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Clerk's prebuilt sign-in owns its own sub-paths for the reset and
            verification steps, so this route has to be a catch-all. */}
        <Route path="/signin/*" element={<SignIn />} />
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
        <Route path="/super" element={<SuperAdmin />} />
        {/* Anything else goes home rather than showing a blank page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)

/*
 * ClerkProvider is only mounted when auth is switched on AND a key exists.
 * Mounting it without a key throws and takes the whole app down, which would
 * turn a missing environment variable into a white screen — the app should say
 * what is wrong instead.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {AUTH_ENABLED && clerkConfigured ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!}>
        <Tree />
      </ClerkProvider>
    ) : (
      <Tree />
    )}
  </React.StrictMode>,
)
