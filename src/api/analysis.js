import { api } from './client'

const PATH = '/admin/analysis'

/**
 * The Analysis screen. Admin and Super Admin can call these; a custom role
 * needs the `analysis` permission.
 *
 * Two report requests rather than one, so the hackathon charts and the
 * evaluator charts reload on their own when only their filters change.
 */
export const analysisApi = {
  /**
   * Filters, loaded once: `{ hackathons, evaluators, top_n_choices,
   * max_hackathons, score_max, rating_max }`.
   */
  options: (options) => api.get(`${PATH}/options`, options),

  /**
   * Body: `{ hackathon_ids, top_n }` (1–12 ids). Summary numbers, the
   * comparison / university / batch series, and per-hackathon NIAT and
   * project-quality blocks. An unknown hackathon id answers 404.
   */
  hackathons: (payload, options) => api.post(`${PATH}/hackathons`, payload, options),

  /**
   * Body: `{ hackathon_ids, evaluator_ids, from_date?, to_date? }`. Dates are
   * IST `YYYY-MM-DD`, both optional; empty id lists mean everyone. A
   * from_date after to_date answers 400.
   */
  evaluators: (payload, options) => api.post(`${PATH}/evaluators`, payload, options),
}
