/**
 * Categorical colours for the Application Logs charts.
 *
 * Eight fixed slots, used in this order and never cycled. The order is what
 * keeps neighbouring slices tellable apart under colour-blindness, so slices are
 * drawn in slot order. Validated against the app's own panel surfaces
 * (light #ffffff, dark #1a1a1a): every adjacent pair clears the CVD and
 * normal-vision floors in both themes. On light, slots 3–5 sit under 3:1
 * contrast, which is why every pie also lists each slice with its number.
 *
 * Dark is the app default (`:root`); light applies under html[data-theme=light].
 */
export const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

/** Chart chrome per theme — the app's own muted ink and hairline tokens. */
export const CHROME = {
  dark: { muted: '#8a8a94', grid: '#333333', surface: '#1a1a1a' },
  light: { muted: '#6c757d', grid: '#dee2e6', surface: '#ffffff' },
}

/** "Other" — what does not fit the eight slots. Neutral, never a ninth hue. */
export const OTHER = { light: '#8a8a94', dark: '#6c6c75' }

/**
 * Fixed slot per known category, so a colour always means the same thing:
 * a role or area keeps its colour whichever others are present.
 */
export const ROLE_SLOTS = ['Student', 'Evaluator', 'Admin', 'Super Admin', 'Custom']
export const AREA_SLOTS = ['Hackathons', 'Submissions', 'Students', 'Evaluators', 'Access', 'Auth']
