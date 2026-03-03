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
          <h1>Gestion Quincaillerie</h1>
          <p>Créez votre compte</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-group">
            <label class="form-label">Nom complet</label>
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
            <label class="form-label">Email</label>
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
            <label class="form-label">Mot de passe</label>
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
            <label class="form-label">Confirmer le mot de passe</label>
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
            <span *ngIf="!loading()">Créer un compte</span>
            <span *ngIf="loading()">Création en cours...</span>
          </button>
          
          <div *ngIf="error()" class="error-message">
            {{ error() }}
          </div>
          
          <div *ngIf="success()" class="success-message">
            {{ success() }}
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }
    
    .register-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      animation: fadeIn 0.5s ease-out;
    }
    
    .register-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .register-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
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
    
    .register-btn {
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
    
    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      text-align: center;
    }
    
    .register-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #64748b;
    }
    
    .register-footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
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
