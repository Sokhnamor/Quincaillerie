import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-container">
            <i class="fas fa-tools"></i>
          </div>
          <h1>Gestion Quincaillerie</h1>
          <p>Connectez-vous à votre compte</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-envelope"></i> Email
            </label>
            <input 
              type="email" 
              class="form-control" 
              [(ngModel)]="credentials.email" 
              name="email"
              placeholder="entreprise&#64;exemple.com"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-lock"></i> Mot de passe
            </label>
            <input 
              type="password" 
              class="form-control" 
              [(ngModel)]="credentials.password" 
              name="password"
              placeholder="••••••••"
              required
            >
          </div>
          
          <div class="form-group remember-me">
            <label>
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe">
              <span class="checkbox-custom"></span>
              Se souvenir de moi
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary login-btn" [disabled]="loading()">
            <span *ngIf="!loading()">
              <i class="fas fa-sign-in-alt"></i> Se connecter
            </span>
            <span *ngIf="loading()">
              <i class="fas fa-spinner fa-spin"></i> Connexion...
            </span>
          </button>
          
          <div *ngIf="error()" class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ error() }}
          </div>
        </form>
        
        <div class="login-footer">
          <p>Pas encore de compte? <a routerLink="/register">Créer un compte</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }
    
    .login-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 80%, rgba(45, 90, 135, 0.4) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(30, 58, 95, 0.4) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .login-card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      animation: fadeIn 0.5s ease-out;
      position: relative;
      z-index: 1;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .logo-container {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      box-shadow: 0 8px 20px rgba(30, 58, 95, 0.3);
    }
    
    .logo-container i {
      font-size: 2rem;
      color: white;
    }
    
    .login-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 0.5rem;
    }
    
    .login-header p {
      color: #64748b;
      font-size: 0.875rem;
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    
    .form-group label i {
      color: #1e3a5f;
    }
    
    .form-control {
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      background: #f9fafb;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #1e3a5f;
      background: white;
      box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
    }
    
    .form-control::placeholder {
      color: #9ca3af;
    }
    
    .remember-me {
      display: flex;
      align-items: center;
    }
    
    .remember-me label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: #6b7280;
      cursor: pointer;
      margin-bottom: 0;
    }
    
    .remember-me input[type="checkbox"] {
      display: none;
    }
    
    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    .remember-me input:checked + .checkbox-custom {
      background: #1e3a5f;
      border-color: #1e3a5f;
    }
    
    .remember-me input:checked + .checkbox-custom::after {
      content: '✓';
      color: white;
      font-size: 12px;
    }
    
    .login-btn {
      width: 100%;
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border: none;
      border-radius: 10px;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(30, 58, 95, 0.4);
    }
    
    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .error-message {
      background: #fef2f2;
      color: #dc2626;
      padding: 0.875rem;
      border-radius: 10px;
      font-size: 0.875rem;
      text-align: center;
      border: 1px solid #fecaca;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .login-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
    }
    
    .login-footer a {
      color: #1e3a5f;
      text-decoration: none;
      font-weight: 600;
    }
    
    .login-footer a:hover {
      text-decoration: underline;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class LoginComponent {
  credentials: LoginRequest = {
    email: '',
    password: ''
  };
  
  rememberMe = false;
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.loading.set(true);
    this.error.set('');
    
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Email ou mot de passe incorrect');
      }
    });
  }
}
