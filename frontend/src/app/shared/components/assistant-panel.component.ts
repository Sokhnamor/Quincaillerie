import { Component, ElementRef, HostListener, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AssistantInsight, AssistantService } from '../../core/services/assistant.service';
import { NotifyService } from '../../core/services/notify.service';

/** Escapes HTML, then turns **bold** and line breaks into markup */
export function renderAssistantText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

@Component({
  selector: 'app-assistant-panel',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (assistant.open()) {
      <div class="backdrop" (click)="assistant.open.set(false)"></div>
      <aside class="panel" role="dialog" aria-label="Assistant de gestion">
        <header class="head">
          <span class="spark"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
          <div class="grow">
            <div class="strong">Assistant</div>
            <div class="xs subtle">
              @if (mode() === 'claude') { <i class="fa-solid fa-circle" style="color:var(--success);font-size:7px"></i> IA Claude }
              @else { <i class="fa-solid fa-circle" style="color:var(--info);font-size:7px"></i> Mode hors ligne · données de votre magasin }
            </div>
          </div>
          @if (assistant.messages().length) {
            <button type="button" class="icon-btn" (click)="assistant.clear()" title="Nouvelle conversation" aria-label="Nouvelle conversation"><i class="fa-solid fa-rotate-left"></i></button>
          }
          <button type="button" class="icon-btn" (click)="assistant.open.set(false)" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <div class="body" #body>
          @if (!assistant.messages().length) {
            <div class="welcome">
              <div class="hello">
                <span class="spark big"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                <h3>Comment puis-je vous aider ?</h3>
                <p class="muted small">Je connais votre stock, vos ventes et vos clients en temps réel.</p>
              </div>
              @if (insights().length) {
                <div class="section-title">En ce moment</div>
                <div class="insights">
                  @for (i of insights(); track i.text) {
                    <button type="button" class="insight {{ i.tone }}" (click)="useInsight(i)" [disabled]="!i.ask && !i.link">
                      <i class="fa-solid {{ i.icon }}"></i><span class="grow">{{ i.text }}</span>
                      @if (i.ask || i.link) { <i class="fa-solid fa-chevron-right xs"></i> }
                    </button>
                  }
                </div>
              }
              <div class="section-title">Exemples de questions</div>
              <div class="chips">
                @for (s of suggestions(); track s) {
                  <button type="button" class="chip" (click)="send(s)">{{ s }}</button>
                }
              </div>
            </div>
          }

          @for (m of assistant.messages(); track $index; let last = $last) {
            @if (m.role === 'user') {
              <div class="bubble user">{{ m.text }}</div>
            } @else {
              <div class="bubble bot" [class.error]="m.error">
                @if (m.answer?.notice) { <div class="notice"><i class="fa-solid fa-plug-circle-xmark"></i> {{ m.answer?.notice }}</div> }
                <div [innerHTML]="render(m.text)"></div>

                @for (card of m.answer?.cards ?? []; track $index) {
                  @switch (card.type) {
                    @case ('stats') {
                      <div class="stats">
                        @for (s of card.items ?? []; track $index) {
                          <div class="stat"><span class="xs subtle">{{ s.label }}</span><strong class="num">{{ s.value }}</strong></div>
                        }
                      </div>
                    }
                    @case ('table') {
                      <div class="card-box">
                        @if (card.title) { <div class="card-title-sm">{{ card.title }}</div> }
                        <div class="table-wrap">
                          <table class="table table-compact">
                            <thead><tr>@for (c of card.columns ?? []; track $index) { <th>{{ c }}</th> }</tr></thead>
                            <tbody>
                              @for (row of card.rows ?? []; track $index) {
                                <tr>@for (cell of row; track $index) { <td [innerHTML]="render('' + cell)"></td> }</tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>
                    }
                    @case ('list') {
                      <div class="card-box">
                        @if (card.title) { <div class="card-title-sm">{{ card.title }}</div> }
                        @for (it of card.items ?? []; track $index) {
                          <div class="list-row">
                            <div class="grow">
                              <div class="strong small">{{ it.title }}</div>
                              @if (it.subtitle) { <div class="xs subtle">{{ it.subtitle }}</div> }
                            </div>
                            @if (it.value) { <span class="num small strong" [class.text-danger]="it.tone === 'danger'" [class.text-warning]="it.tone === 'warning'">{{ it.value }}</span> }
                            @if (it.whatsapp) {
                              <a class="icon-btn wa" [href]="it.whatsapp" target="_blank" rel="noopener" title="Relancer sur WhatsApp" aria-label="Relancer sur WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                            }
                          </div>
                        }
                      </div>
                    }
                    @case ('quote') {
                      <div class="quote">
                        <div [innerHTML]="render(card.text ?? '')"></div>
                        <button type="button" class="btn btn-ghost btn-sm" (click)="copy(card.text ?? '')"><i class="fa-regular fa-copy"></i> Copier</button>
                      </div>
                    }
                  }
                }

                @if (m.answer?.actions?.length) {
                  <div class="actions-row">
                    @for (a of m.answer?.actions ?? []; track a.label) {
                      @if (a.href) {
                        <a class="btn btn-sm" [class.btn-success]="a.brand" [class.btn-secondary]="!a.brand" [href]="a.href" target="_blank" rel="noopener">
                          <i class="{{ a.brand ? 'fa-brands' : 'fa-solid' }} {{ a.icon }}"></i> {{ a.label }}
                        </a>
                      } @else {
                        <a class="btn btn-secondary btn-sm" [routerLink]="a.link" [queryParams]="a.query ?? {}" (click)="assistant.open.set(false)">
                          <i class="fa-solid {{ a.icon }}"></i> {{ a.label }}
                        </a>
                      }
                    }
                  </div>
                }
              </div>

              @if (last && m.answer?.suggestions?.length && !assistant.thinking()) {
                <div class="chips follow">
                  @for (s of m.answer?.suggestions ?? []; track s) {
                    <button type="button" class="chip" (click)="send(s)">{{ s }}</button>
                  }
                </div>
              }
            }
          }

          @if (assistant.thinking()) {
            <div class="bubble bot typing" aria-label="L'assistant réfléchit"><span></span><span></span><span></span></div>
          }
        </div>

        <form class="composer" (ngSubmit)="send(draft)">
          <input #input class="input" name="q" [(ngModel)]="draft" placeholder="Posez votre question…" autocomplete="off" maxlength="500" [disabled]="assistant.thinking()">
          <button type="submit" class="btn btn-primary" [disabled]="!draft.trim() || assistant.thinking()" aria-label="Envoyer"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </aside>
    }
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(8, 12, 20, 0.25); animation: fade 0.15s ease-out; }
    .panel {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); z-index: 81; display: flex; flex-direction: column;
      background: var(--bg); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg); animation: slide-in 0.22s var(--ease);
    }
    .head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .spark { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #ea580c, #f59e0b); flex-shrink: 0; }
    .spark.big { width: 52px; height: 52px; border-radius: 16px; font-size: 20px; box-shadow: 0 8px 24px rgba(234, 88, 12, 0.3); }
    .body { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; }

    .welcome { display: flex; flex-direction: column; gap: 10px; }
    .hello { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 8px 0 12px; }
    .hello h3 { font-size: 17px; font-weight: 700; }
    .insights { display: flex; flex-direction: column; gap: 6px; }
    .insight { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 13px; text-align: left; cursor: pointer; }
    .insight:disabled { cursor: default; }
    .insight > i:first-child { width: 16px; text-align: center; }
    .insight.danger > i:first-child { color: var(--danger-text); }
    .insight.warning > i:first-child { color: var(--warning-text); }
    .insight.success > i:first-child { color: var(--success-text); }
    .insight.info > i:first-child { color: var(--info-text); }
    .insight:not(:disabled):hover { border-color: var(--brand); }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); border-radius: 99px; padding: 6px 12px; font-size: 12.5px; font-weight: 500; cursor: pointer; text-align: left; }
    .chip:hover { border-color: var(--brand); color: var(--brand-text); background: var(--brand-soft); }
    .chips.follow { padding-left: 4px; }

    .bubble { max-width: 92%; padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; overflow-wrap: anywhere; }
    .bubble.user { align-self: flex-end; background: var(--brand); color: #fff; border-bottom-right-radius: 4px; }
    .bubble.bot { align-self: flex-start; background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; display: flex; flex-direction: column; gap: 10px; width: 92%; }
    .bubble.bot.error { border-color: var(--danger); color: var(--danger-text); }
    .notice { font-size: 12px; color: var(--warning-text); background: var(--warning-soft); padding: 6px 8px; border-radius: 8px; }

    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .stat { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; }
    .stat strong { font-size: 14px; }
    .card-box { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .card-title-sm { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); padding: 8px 10px; background: var(--surface-2); border-bottom: 1px solid var(--border); }
    .card-box .table th { font-size: 10.5px; padding: 7px 8px; }
    .card-box .table td { font-size: 12.5px; padding: 7px 8px; }
    .list-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
    .list-row:last-child { border-bottom: 0; }
    .wa { color: #16a34a; width: 28px; height: 28px; }
    .quote { background: var(--surface-2); border-left: 3px solid var(--brand); border-radius: 8px; padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .actions-row { display: flex; flex-wrap: wrap; gap: 6px; }

    .typing { flex-direction: row !important; gap: 5px !important; width: auto !important; padding: 14px 16px; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-3); animation: blink 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }

    .composer { display: flex; gap: 8px; padding: 12px 14px; background: var(--surface); border-top: 1px solid var(--border); }
    .composer .input { height: 42px; }
    .composer .btn { height: 42px; width: 46px; padding: 0; }
  `]
})
export class AssistantPanelComponent {
  assistant = inject(AssistantService);
  private notify = inject(NotifyService);
  private router = inject(Router);
  private body = viewChild<ElementRef<HTMLElement>>('body');
  private input = viewChild<ElementRef<HTMLInputElement>>('input');

  insights = signal<AssistantInsight[]>([]);
  suggestions = signal<string[]>([]);
  mode = signal<'rules' | 'claude'>('rules');
  draft = '';
  render = renderAssistantText;

  constructor() {
    // Load insights each time the panel opens, then focus the input
    effect(() => {
      if (this.assistant.open()) {
        this.assistant.welcome().subscribe({
          next: w => {
            this.insights.set(w.insights);
            this.suggestions.set(w.suggestions);
            this.mode.set(w.mode);
          },
          error: () => undefined,
        });
        setTimeout(() => this.input()?.nativeElement.focus(), 50);
      }
    });

    // Keep the latest message in view
    effect(() => {
      this.assistant.messages();
      this.assistant.thinking();
      setTimeout(() => {
        const el = this.body()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.assistant.open.set(false);
  }

  send(text: string): void {
    if (!text.trim()) {
      return;
    }
    this.assistant.ask(text);
    this.draft = '';
  }

  useInsight(insight: AssistantInsight): void {
    if (insight.ask) {
      this.send(insight.ask);
    } else if (insight.link) {
      this.assistant.open.set(false);
      this.router.navigateByUrl(insight.link);
    }
  }

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.notify.success('Message copié');
    } catch {
      this.notify.error('Copie impossible');
    }
  }
}
