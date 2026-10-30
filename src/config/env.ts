// Expo replaces these public environment variables when bundling the app.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (__DEV__
    ? process.env.EXPO_PUBLIC_DEV_API_BASE_URL || 'https://devapi.ginjer.io'
    : process.env.EXPO_PUBLIC_PROD_API_BASE_URL || 'https://prodapi.ginjer.io')
).replace(/\/+$/, '');

// Keep the existing full-endpoint override for deployed environments.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `${API_BASE_URL}/graphql`;
