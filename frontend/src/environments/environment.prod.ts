/**
 * Production build (`npm run build`). Replaces environment.ts.
 * Adjust apiUrl to the address of the Laravel API on the server.
 */
export const environment = {
  apiUrl: '/api',
  demoAccounts: [] as { label: string; email: string; icon: string; password: string }[],
};
