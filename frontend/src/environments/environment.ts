export const environment = {
  apiUrl: 'http://localhost:8000/api',
  /** One-click demo accounts on the login page (empty in production, see environment.prod.ts) */
  demoAccounts: [
    { label: 'Administrateur', email: 'admin@quincaillerie.fr', icon: 'fa-user-shield', password: 'password123' },
    { label: 'Gestionnaire', email: 'gestionnaire@quincaillerie.fr', icon: 'fa-user-tie', password: 'password123' },
    { label: 'Caissier', email: 'caissier@quincaillerie.fr', icon: 'fa-cash-register', password: 'password123' },
  ],
};
