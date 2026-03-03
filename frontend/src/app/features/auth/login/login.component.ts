import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Gestion Quincaillerie</h1>
          <p>Connectez-vous à votre compte</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
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
            <label class="form-label">Mot de passe</label>
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
              Se souvenir de moi
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary login-btn" [disabled]="loading()">
            <span *ngIf="!loading()">Se connecter</span>
            <span *ngIf="loading()">Connexion...</span>
          </button>
          
          <div *ngIf="error()" class="error-message">
            {{ error() }}
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }
    
    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      animation: fadeIn 0.5s ease-out;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .login-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
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
    
    .remember-me {
      display: flex;
      align-items: center;
    }
    
    .remember-me label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #64748b;
      cursor: pointer;
    }
    
    .login-btn {
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      margin-top: 0.5rem;
    }
    
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      text-align: center;
    }
    
    .login-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    
    .login-footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
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
