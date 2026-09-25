import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { environment } from '../../../environments/environment';
import { User } from '../models';

const user = (role: 'admin' | 'gestionnaire' | 'caissier'): User => ({
  id: 1, name: 'Awa Diop', email: 'awa@test.sn', role_id: 1, role: { id: 1, name: role },
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('stores the token and user after login', () => {
    auth.login({ email: 'awa@test.sn', password: 'secret' }).subscribe();
    http.expectOne(`${environment.apiUrl}/login`).flush({ user: user('caissier'), token: 'tok-123' });

    expect(auth.getToken()).toBe('tok-123');
    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.roleLabel()).toBe('Caissier');
  });

  it('derives permissions from the role', () => {
    auth.currentUser.set(user('caissier'));
    expect(auth.canManage()).toBeFalse();
    expect(auth.isAdmin()).toBeFalse();

    auth.currentUser.set(user('gestionnaire'));
    expect(auth.canManage()).toBeTrue();
    expect(auth.isAdmin()).toBeFalse();
    expect(auth.hasRole('admin', 'gestionnaire')).toBeTrue();

    auth.currentUser.set(user('admin'));
    expect(auth.isAdmin()).toBeTrue();
  });

  it('sends the bearer token on API calls', () => {
    localStorage.setItem('token', 'tok-abc');
    TestBed.inject(HttpClient).get(`${environment.apiUrl}/products`).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-abc');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush([]);
  });

  it('clears the session and goes back to login on 401', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    localStorage.setItem('token', 'expired');
    auth.currentUser.set(user('admin'));

    TestBed.inject(HttpClient).get(`${environment.apiUrl}/sales`).subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/sales`).flush({ message: 'Unauthenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({ queryParams: jasmine.objectContaining({ expired: 1 }) }));
  });
});
