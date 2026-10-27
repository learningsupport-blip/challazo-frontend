import { api, request } from './client'

/*
 * External hackathons: teams formed on another platform (Launchpad) submit
 * through a Challazo form. These are their own records — none of these calls
 * touch /hackathons, enrollment, teams or POST /submissions.
 */

function encode(value) {
  return encodeURIComponent(String(value))
}

const ADMIN_PATH = '/admin/external-hackathons'

export const externalHackathonsAdminApi = {
  list: (options) => api.get(ADMIN_PATH, options),
  get: (id, options) => api.get(`${ADMIN_PATH}/${encode(id)}`, options),

  /** Draft. 201 is the admin object (id, signing_secret, form_url, themes, status). */
  create: (payload, options) => api.post(ADMIN_PATH, payload, options),

  /** Only the changed fields. `{ status: 'draft' }` unpublishes the form. */
  update: (id, payload, options) => api.put(`${ADMIN_PATH}/${encode(id)}`, payload, options),

  /** 400 until there is a name, at least one theme and a submission_deadline. */
  publish: (id, options) => api.post(`${ADMIN_PATH}/${encode(id)}/publish`, undefined, options),
  close: (id, options) => api.post(`${ADMIN_PATH}/${encode(id)}/close`, undefined, options),

  /** Rows: team, theme, problem, solution, status, video_url, assigned_evaluator_name, evaluation. */
  submissions: (id, options) => api.get(`${ADMIN_PATH}/${encode(id)}/submissions`, options),

  /** The evaluator must already be an approved evaluator. */
  assign: (submissionId, evaluatorId, options) =>
    api.post(
      `/admin/external-submissions/${encode(submissionId)}/assign`,
      { evaluator_id: evaluatorId },
      options,
    ),

  /** 202 `{ status: 'queued' }`; 409 ALREADY_PROCESSING while a run is going. */
  evaluate: (submissionId, options) =>
    api.post(`/admin/external-submissions/${encode(submissionId)}/evaluate`, {}, options),
}

/** The public form sends no cookie and no CSRF token. */
const anonymous = (method, path, body, options) =>
  request(path, { ...options, method, body, anonymous: true })

export const externalHackathonsPublicApi = {
  get: (id, options) => anonymous('GET', `/external-hackathons/${encode(id)}`, undefined, options),

  /** Signed PUT target for the video; the file itself never goes to the API. */
  uploadUrl: (id, payload, options) =>
    anonymous('POST', `/external-hackathons/${encode(id)}/upload-url`, payload, options),

  /** 201 is the saved submission with status `uploaded`. */
  submit: (id, payload, options) =>
    anonymous('POST', `/external-hackathons/${encode(id)}/submissions`, payload, options),
}
