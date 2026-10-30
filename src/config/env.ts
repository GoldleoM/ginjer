// Development API only for now, including release builds and account creation.
// Keep a single base URL so stale environment overrides cannot select another API.
export const API_BASE_URL = 'https://devapi.ginjer.io';
export const API_URL = `${API_BASE_URL}/graphql`;
