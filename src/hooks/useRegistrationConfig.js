import { authApi } from '../api/auth'
import { queryKeys } from '../lib/queryKeys'
import { useAsync } from './useAsync'

/**
 * Which channels need an OTP for one verification group (`student`,
 * `evaluator` or `application_access`, see VERIFICATION_GROUPS), from the
 * public GET /auth/registration-config. Fetched once and kept for the visit.
 *
 * A switch that is off only hides that field's Verify step — the email or
 * mobile is still collected, and stored as not verified so a later Send
 * verification can ask for it. A response without the group (an older API)
 * falls back to the top-level pair. If the config cannot be loaded, both stay
 * on: the current OTP flow is the safe default, and the API enforces the real
 * setting at complete either way.
 */
export function useRegistrationConfig(group) {
  const { data, loading, error } = useAsync((options) => authApi.registrationConfig(options), {
    key: queryKeys.registrationConfig,
    staleTime: Infinity,
  })
  const config = data?.[group] || data
  return {
    ready: Boolean(data) || Boolean(error) || !loading,
    emailRequired: config?.email_verification_enabled !== false,
    phoneRequired: config?.mobile_verification_enabled !== false,
  }
}
