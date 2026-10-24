import { lazy, Suspense } from 'react'
import { useAuth } from '../../hooks/useAuth'

// Carries Firebase Phone Auth, so it is only downloaded when someone is due.
const VerificationDialog = lazy(() => import('./VerificationDialog'))

/**
 * Blocks the app with the verification popup while the signed-in account has
 * `verification_due.email` or `.mobile` set — students, evaluators and
 * Application Access (admin and custom) accounts whom a Super Admin sent
 * verification to, including an evaluator still pending approval. The API
 * sets a flag only for a channel still checked for that person's group, and
 * never for Super Admin. /auth/me runs on every load, so a refresh brings it back until
 * verification is finished.
 */
export default function VerificationGate() {
  const { user } = useAuth()
  const due = user?.verification_due
  if (!user || !(due?.email || due?.mobile)) return null
  return (
    <Suspense fallback={null}>
      <VerificationDialog key={user.id || user.email} />
    </Suspense>
  )
}
