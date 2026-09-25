import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoleName, User } from '../models';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Administrateur',
  gestionnaire: 'Gestionnaire',
  caissier: 'Caissier',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = environment.apiUrl;

  readonly currentUser = signal<User | null>(this.readStoredUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly role = computed<RoleName | null>(() => this.currentUser()?.role?.name ?? null);
  readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : 'Sans rôle';
  });
  readonly isAdmin = computed(() => this.role() === 'admin');
  /** Admin or manager: catalogue, stock, purchases */
  readonly canManage = computed(() => this.role() === 'admin' || this.role() === 'gestionnaire');

  constructor() {
    // Refresh role/permissions from the server on startup
    if (this.getToken()) {
      this.http.get<{ user: User }>(`${this.url}/me`).subscribe({
        next: ({ user }) => this.storeUser(user),
        error: () => undefined, // 401 is handled by the interceptor
      });
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        this.storeUser(response.user);
      })
    );
  }

  logout(): void {
    if (this.getToken()) {
      this.http.post(`${this.url}/logout`, {}).subscribe({ error: () => undefined });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Local cleanup only (used when the token is already invalid) */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  updateProfile(data: Partial<User> & { current_password?: string; password?: string; password_confirmation?: string }): Observable<{ user: User; message: string }> {
    return this.http.put<{ user: User; message: string }>(`${this.url}/profile`, data).pipe(
      tap(({ user }) => this.storeUser(user))
    );
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: RoleName[]): boolean {
    const role = this.role();
    return !!role && roles.includes(role);
  }

  private storeUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private readStoredUser(): User | null {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
