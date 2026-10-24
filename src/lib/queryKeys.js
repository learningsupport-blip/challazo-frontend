/** Stable cache keys for shared server state. */
export const queryKeys = {
  submissionsMine: 'submissions:mine',
  submissionsAdminHackathons: 'submissions:admin-hackathons',
  submissionsAdminAll: 'submissions:admin-all',
  submissionsEvaluatorHackathons: 'submissions:evaluator-hackathons',
  submissionsHackathonAdmin: (id) => `submissions:admin-hackathon:${id}`,
  submissionsHackathonEvaluator: (id) => `submissions:evaluator-hackathon:${id}`,
  submission: (id) => `submission:${id}`,
  submissionReport: (id) => `submission-report:${id}`,
  hackathons: 'hackathons:list',
  hackathonCatalog: (includeClosed = true) =>
    `hackathons:catalog:${includeClosed ? 'all' : 'open'}`,
  hackathon: (id) => `hackathon:${id}`,
  themes: 'themes:list',
  universities: 'universities:list',
  registrationConfig: 'auth:registration-config',
  /** One university's batches; there is deliberately no all-batches key. */
  universityBatches: (universityId) => `batches:university:${universityId}`,
  evaluationRequirements: 'evaluation-requirements:list',
  acceptedVideoTypes: 'submissions:accepted-video-types',
  adminUsers: 'admin:users',
  /** One page of Student Management; never shares the full-list key above. */
  adminStudentsPage: (page, q = '') => `admin:users:students:${page}:${q}`,
  adminEvaluators: 'admin:evaluators',
  adminPendingEvaluators: 'admin:pending-evaluators',
  adminOverview: 'admin:overview',
  analysisOptions: 'analysis:options',
  /** One report per exact request body, so each filter combination caches on its own. */
  analysisHackathons: (body) => `analysis:hackathons:${JSON.stringify(body)}`,
  analysisEvaluators: (body) => `analysis:evaluators:${JSON.stringify(body)}`,
  accessPermissions: 'access:permissions',
  accessRoles: 'access:roles',
  accessUsers: 'access:users',
}
