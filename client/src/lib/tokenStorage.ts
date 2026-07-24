/**
 * Thin wrapper around localStorage for token management.
 * Keeping token ops centralized makes it easy to swap storage strategy later
 * (e.g., moving access token to memory only for better XSS protection).
 */
const ACCESS_TOKEN_KEY = 'pd_access_token';
const REFRESH_TOKEN_KEY = 'pd_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
