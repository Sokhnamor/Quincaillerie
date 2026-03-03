import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <div class="logo-container">
            <i class="fas fa-tools"></i>
          </div>
          <h1>Gestion Quincaillerie</h1>
          <p>Créez votre compte</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-user"></i> Nom complet
            </label>
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="userData.name" 
              name="name"
              placeholder="Votre nom"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-envelope"></i> Email
            </label>
            <input 
              type="email" 
              class="form-control" 
              [(ngModel)]="userData.email" 
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
              [(ngModel)]="userData.password" 
              name="password"
              placeholder="••••••••"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-lock"></i> Confirmer le mot de passe
            </label>
            <input 
              type="password" 
              class="form-control" 
              [(ngModel)]="userData.password_confirmation" 
              name="password_confirmation"
              placeholder="••••••••"
              required
            >
          </div>
          
          <button type="submit" class="btn btn-primary register-btn" [disabled]="loading()">
            <span *ngIf="!loading()">
              <i class="fas fa-user-plus"></i> Créer un compte
            </span>
            <span *ngIf="loading()">
              <i class="fas fa-spinner fa-spin"></i> Création en cours...
            </span>
          </button>
          
          <div *ngIf="error()" class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ error() }}
          </div>
          
          <div *ngIf="success()" class="success-message">
            <i class="fas fa-check-circle"></i> {{ success() }}
          </div>
        </form>
        
        <div class="register-footer">
          <p>Déjà un compte? <a routerLink="/login">Se connecter</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }
    
    .register-container::before {
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
    
    .register-card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      width: 100%;
      max-width: 500px;
      padding: 1.5rem;
      animation: fadeIn 0.5s ease-out;
      position: relative;
      z-index: 1;
    }
    
    .register-header {
      text-align: center;
      margin-bottom: 1rem;
    }
    
    .logo-container {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      box-shadow: 0 8px 20px rgba(30, 58, 95, 0.3);
    }
    
    .logo-container i {
      font-size: 2rem;
      color: white;
    }
    
    .register-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 0.5rem;
    }
    
    .register-header p {
      color: #64748b;
      font-size: 0.875rem;
    }
    
    .register-form {
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
    
    .register-btn {
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
    
    .register-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(30, 58, 95, 0.4);
    }
    
    .register-btn:disabled {
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
    
    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 0.875rem;
      border-radius: 10px;
      font-size: 0.875rem;
      text-align: center;
      border: 1px solid #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .register-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
    }
    
    .register-footer a {
      color: #1e3a5f;
      text-decoration: none;
      font-weight: 600;
    }
    
    .register-footer a:hover {
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
export class RegisterComponent {
  userData: RegisterRequest = {
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  };
  
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    
    this.authService.register(this.userData).subscribe({
      next: () => {
        this.success.set('Compte créé avec succès! Redirection...');
        this.loading.set(false);
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur lors de la création du compte');
      }
    });
  }
}
