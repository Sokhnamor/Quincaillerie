import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AssistantCard {
  type: 'stats' | 'table' | 'list' | 'quote';
  title?: string;
  items?: { label?: string; value?: string | null; title?: string; subtitle?: string; tone?: string; whatsapp?: string | null }[];
  columns?: string[];
  rows?: (string | number)[][];
  text?: string;
}

export interface AssistantAction {
  label: string;
  icon?: string;
  link?: string;
  query?: Record<string, string | number>;
  href?: string;
  brand?: boolean;
}

export interface AssistantAnswer {
  reply: string;
  cards: AssistantCard[];
  actions: AssistantAction[];
  suggestions: string[];
  source: 'rules' | 'claude';
  notice?: string;
}

export interface AssistantInsight {
  tone: string;
  icon: string;
  text: string;
  ask: string | null;
  link?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  answer?: AssistantAnswer;
  error?: boolean;
}

const STORAGE_KEY = 'assistant-chat';

/** Conversation state, kept for the browser session */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/assistant`;

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>(this.restore());
  readonly thinking = signal(false);

  welcome(): Observable<{ mode: 'rules' | 'claude'; insights: AssistantInsight[]; suggestions: string[] }> {
    return this.http.get<{ mode: 'rules' | 'claude'; insights: AssistantInsight[]; suggestions: string[] }>(`${this.url}/welcome`);
  }

  ask(text: string): void {
    const question = text.trim();
    if (!question || this.thinking()) {
      return;
    }
    // Previous turns as plain text, for an LLM driver that needs context
    const history = this.messages().slice(-10).map(m => ({ role: m.role, content: m.answer?.reply ?? m.text }));

    this.push({ role: 'user', text: question });
    this.thinking.set(true);

    this.http.post<AssistantAnswer>(this.url, { message: question, history }).pipe(
      tap({
        next: answer => this.push({ role: 'assistant', text: answer.reply, answer }),
        error: err => this.push({
          role: 'assistant',
          error: true,
          text: err.status === 429
            ? 'Vous avez posé beaucoup de questions d\'un coup. Patientez une minute.'
            : 'Je n\'arrive pas à joindre le serveur pour le moment. Réessayez dans un instant.',
        }),
      }),
      finalize(() => this.thinking.set(false))
    ).subscribe({ error: () => undefined });
  }

  clear(): void {
    this.messages.set([]);
    this.persist();
  }

  private push(message: ChatMessage): void {
    this.messages.update(list => [...list, message].slice(-40));
    this.persist();
  }

  private persist(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages()));
    } catch {
      // storage unavailable: the conversation simply won't survive a reload
    }
  }

  private restore(): ChatMessage[] {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
