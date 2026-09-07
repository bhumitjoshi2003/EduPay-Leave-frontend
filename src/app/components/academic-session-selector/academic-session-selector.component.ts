import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AcademicSession } from '../../interfaces/academic-session';
import { AcademicSessionService } from '../../services/academic-session.service';

export function sessionKind(session: AcademicSession | null, today = new Date()): string {
  if (!session) return 'No session selected';
  if (session.current) return 'CURRENT';
  // Backend ClockConfig uses Clock.systemUTC().
  const date = today.toISOString().slice(0, 10);
  if (session.endDate < date) return 'HISTORICAL';
  return session.startDate > date ? 'FUTURE' : 'NON-CURRENT';
}
export function writableSession(session: AcademicSession | null): boolean {
  return !!session?.id && sessionKind(session) !== 'HISTORICAL';
}
export function apiMessage(error: any, fallback = 'Request failed. Please try again.'): string {
  return (typeof error?.error === 'string' && error.error) || error?.error?.message || error?.error?.detail || fallback;
}
@Component({
  selector: 'app-academic-session-selector', standalone: true, imports: [CommonModule, FormsModule],
  template: `<label>Academic session
    <select [ngModel]="selectedId" (ngModelChange)="select($event)" [disabled]="disabled || loading">
      <option [ngValue]="null">Select a session</option>
      <option *ngFor="let s of sessions" [ngValue]="s.id">{{ s.label }} — {{ kind(s) }}</option>
    </select>
  </label><p *ngIf="error" role="alert">{{ error }}</p>`,
  styles: [`:host { display:block; margin:16px 0; } select { padding:10px; margin-left:12px; max-width:100%; }`]
})
export class AcademicSessionSelectorComponent implements OnInit, OnDestroy {
  @Input() initialId: number | null = null;
  @Input() disabled = false;
  @Output() selected = new EventEmitter<AcademicSession | null>();
  @Output() loaded = new EventEmitter<AcademicSession[]>();
  sessions: AcademicSession[] = [];
  selectedId: number | null = null;
  loading = true;
  error = '';
  kind = sessionKind;
  private destroy$ = new Subject<void>();
  constructor(private service: AcademicSessionService) {}
  ngOnInit(): void {
    this.service.getAllSessions().pipe(takeUntil(this.destroy$)).subscribe({
      next: sessions => {
        this.sessions = sessions;
        this.loading = false;
        this.loaded.emit(sessions);
        this.select(this.initialId ?? sessions.find(s => s.current)?.id ?? null);
      },
      error: err => { this.loading = false; this.error = apiMessage(err); this.selected.emit(null); }
    });
  }
  select(id: number | null): void {
    const session = this.sessions.find(s => s.id === id) ?? null;
    this.selectedId = session?.id ?? null;
    this.selected.emit(session);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
