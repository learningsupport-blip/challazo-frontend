import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from '../../components/layout/AuthShell'
import MobileField from '../../components/auth/MobileField'
import OtpRow from '../../components/auth/OtpRow'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { LoadingBlock } from '../../components/ui/Spinner'
import { authApi } from '../../api/auth'
import { AUTH_ERROR, authErrorCode, authErrorField, authErrorMessage } from '../../api/authErrors'
import { useAuth } from '../../hooks/useAuth'
import { useRegistrationConfig } from '../../hooks/useRegistrationConfig'
import { VERIFY, useRegistrationVerification } from '../../hooks/useRegistrationVerification'
import { RECAPTCHA_CONTAINER_ID } from '../../lib/firebasePhone'
import { homePath } from '../../utils/access'
import { ROLES, VERIFICATION_GROUPS } from '../../utils/constants'
import { trackEvent } from '../../lib/logrocket'

/** Messages that read wrongly here: this person already has an account. */
const PROFILE_MESSAGES = {
  [AUTH_ERROR.NOT_VERIFIED]: 'Verify your email and mobile number before saving your profile.',
  [AUTH_ERROR.EMAIL_MISMATCH]: 'This must be the email address you sign in with.',
  [AUTH_ERROR.SESSION_EXPIRED]: 'Your verification expired. Verify your email and mobile again.',
  [AUTH_ERROR.SESSION_NOT_FOUND]: 'Your verification expired. Verify your email and mobile again.',
}

const profileMessage = (err, fallback) =>
  PROFILE_MESSAGES[authErrorCode(err)] || authErrorMessage(err, fallback)

/** "email and mobile number", "email", "mobile number" — whichever are switched on. */
function channelsText(emailRequired, phoneRequired) {
  if (emailRequired && phoneRequired) return 'email and mobile number'
  return emailRequired ? 'email' : 'mobile number'
}

/**
 * First-login setup at /complete-profile for accounts Super Admin created
 * (`profile_completed: false`). Its own route outside Layout — no sidebar, no
 * role screens — because the API answers everything else with
 * PROFILE_INCOMPLETE; Layout sends any other page here until it is done.
 *
 * Same email OTP + Firebase Phone Auth checks as registration, but the session
 * comes from /auth/profile/start, which binds the sign-in email and the mobile
 * together. So the mobile is entered first, and changing it after a check has
 * started opens a new session and both checks run again.
 *
 * Which checks run comes from the Application Access group of the
 * registration config; Super Admin is never asked to verify. A channel that is
 * off loses its Verify step but is still collected and sent through start and
 * complete, stored as not verified.
 */
export default function ProfileCompletionPage() {
  const { user } = useAuth()
  const config = useRegistrationConfig(VERIFICATION_GROUPS.APPLICATION_ACCESS)
  if (!config.ready) {
    return (
      <AuthShell wide>
        <LoadingBlock label="Loading…" />
      </AuthShell>
    )
  }
  const superAdmin = user?.role === ROLES.SUPER_ADMIN
  return (
    <ProfileCompletionForm
      emailRequired={!superAdmin && config.emailRequired}
      phoneRequired={!superAdmin && config.phoneRequired}
    />
  )
}

function ProfileCompletionForm({ emailRequired, phoneRequired }) {
  const navigate = useNavigate()
  const { user, refresh, logout } = useAuth()
  const anyRequired = emailRequired || phoneRequired

  const [form, setForm] = useState({ country_code: '+91', mobile_national: '', employee_id: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  const verification = useRegistrationVerification({
    emailRequired,
    phoneRequired,
    startSession: async ({ email, mobile }) => {
      const data = await authApi.profileStart({ email, mobile_number: mobile })
      return data?.session_id
    },
    // Always the sign-in address: the backend refuses any other (EMAIL_MISMATCH).
    email: user?.email || '',
    countryCode: form.country_code,
    mobileNational: form.mobile_national,
    onFieldError: (field, message) => setErrors((prev) => ({ ...prev, [field]: message })),
  })

  const employeeId = form.employee_id.trim()
  const canSubmit = verification.phoneReady && verification.bothVerified && !!employeeId && !saving

  const startedChecks =
    verification.phoneState !== VERIFY.IDLE || verification.emailState !== VERIFY.IDLE

  const update = (key) => (event) => {
    const value = key === 'employee_id' ? event.target.value.toUpperCase() : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSubmitError('')
    // A new number needs a new session, and that session's checks start from
    // nothing — so both rows go back to Verify, not just the mobile.
    if ((key === 'mobile_national' || key === 'country_code') && startedChecks) {
      verification.restartPhoneVerification()
      verification.resetEmailVerification()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!employeeId) {
      setErrors((prev) => ({ ...prev, employee_id: 'Employee ID is required' }))
      return
    }
    if (!verification.phoneReady) {
      setErrors((prev) => ({ ...prev, mobile_national: 'Enter a valid mobile number' }))
      return
    }
    if (!verification.bothVerified) {
      setSubmitError(`Verify your ${channelsText(emailRequired, phoneRequired)} before saving your profile.`)
      return
    }

    setSaving(true)
    setSubmitError('')
    try {
      const sessionId = await verification.ensureFullSession()
      await authApi.profileComplete({
        session_id: sessionId,
        email: verification.email,
        mobile_number: verification.phoneE164,
        employee_id: employeeId,
      })
      // profile_completed is now true and permissions are filled in, so
      // homePath() gives the real first screen (/admin, /super-admin, …).
      const me = await refresh()
      trackEvent('Profile Completed', { role: me?.role || '' })
      navigate(homePath(me), { replace: true })
    } catch (err) {
      const code = authErrorCode(err)
      if (
        code === AUTH_ERROR.SESSION_EXPIRED ||
        code === AUTH_ERROR.SESSION_NOT_FOUND ||
        code === AUTH_ERROR.NOT_VERIFIED
      ) {
        verification.restartPhoneVerification()
        verification.resetEmailVerification()
      }
      const field = authErrorField(err)
      if (field) setErrors((prev) => ({ ...prev, [field]: profileMessage(err) }))
      else setSubmitError(profileMessage(err, 'Could not save your profile. Try again.'))
      setSaving(false)
    }
  }

  const disabledReason = !verification.phoneReady
    ? anyRequired
      ? `Enter your mobile number, then verify your ${channelsText(emailRequired, phoneRequired)}.`
      : 'Enter your mobile number to continue.'
    : !verification.bothVerified
      ? `Verify your ${channelsText(emailRequired, phoneRequired)} to continue.`
      : !employeeId
        ? 'Enter your employee ID to continue.'
        : ''

  const mobileField = (
    <MobileField
      countryCode={form.country_code}
      mobileNational={form.mobile_national}
      onChange={update}
      error={errors.mobile_national}
      locked={verification.phoneState === VERIFY.VERIFIED}
    />
  )

  const emailField = (
    <Input
      label="Email"
      type="email"
      required
      value={user?.email || ''}
      readOnly
      disabled
      error={errors.email}
      hint={
        !emailRequired || verification.phoneReady
          ? 'The address you sign in with. It cannot be changed here.'
          : 'The address you sign in with. Enter your mobile number first to verify it.'
      }
    />
  )

  return (
    <AuthShell wide>
      <div className="stack-md register-page">
        <div>
          <h1>Complete your profile</h1>
          <p className="text-muted">
            Before you can use Challazo,{' '}
            {phoneRequired
              ? `verify your ${channelsText(emailRequired, phoneRequired)} and add your employee ID.`
              : emailRequired
                ? 'verify your email and add your mobile number and employee ID.'
                : 'add your mobile number and employee ID.'}{' '}
            You only need to do this once.
          </p>
        </div>

        <form className="stack-md" onSubmit={handleSubmit} noValidate>
          {submitError && <Alert variant="danger">{submitError}</Alert>}

          {/* Mobile first: the verification session needs it before the
              email code can be sent. A channel switched off keeps its field
              and loses its Verify step. */}
          {phoneRequired ? (
            <OtpRow
              label="Mobile"
              state={verification.phoneState}
              code={verification.phoneCode}
              error={verification.phoneError}
              cooldown={verification.phoneCooldown}
              canStart={verification.phoneReady}
              onCodeChange={verification.setPhoneCode}
              sentTo={verification.phoneE164}
              onVerify={verification.sendPhoneOtp}
              onConfirm={verification.confirmPhoneOtp}
              onResend={verification.sendPhoneOtp}
              extra={mobileField}
            />
          ) : (
            mobileField
          )}
          <div id={RECAPTCHA_CONTAINER_ID} />

          {emailRequired ? (
            <OtpRow
              label="Email"
              state={verification.emailState}
              code={verification.emailCode}
              error={verification.emailError}
              cooldown={verification.emailCooldown}
              canStart={verification.emailReady && verification.phoneReady}
              onCodeChange={verification.setEmailCode}
              sentTo={verification.email}
              onVerify={verification.sendEmailOtp}
              onConfirm={verification.confirmEmailOtp}
              onResend={verification.sendEmailOtp}
              extra={emailField}
            />
          ) : (
            emailField
          )}

          <Input
            label="Employee ID"
            required
            value={form.employee_id}
            onChange={update('employee_id')}
            error={errors.employee_id}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
          />

          <Button type="submit" variant="accent" block loading={saving} disabled={!canSubmit}>
            Save and continue
          </Button>
          {disabledReason && <p className="text-center text-sm text-muted">{disabledReason}</p>}
        </form>

        <p className="text-center text-sm text-muted">
          Signed in as {user?.email}.{' '}
          <button type="button" className="link-btn" onClick={logout}>
            Sign out
          </button>
        </p>
      </div>
    </AuthShell>
  )
}
