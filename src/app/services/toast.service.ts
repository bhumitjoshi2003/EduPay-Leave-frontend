import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

export interface ConfirmDialogData {
  title: string;
  message?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: 'warning' | 'question' | 'info' | 'success' | 'danger';
  requiredInput?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts$ = new BehaviorSubject<Toast[]>([]);

  constructor(private dialog: MatDialog) {}

  private add(type: ToastType, title: string, message?: string, duration?: number): void {
    const d = duration ?? ((type === 'error' || type === 'warning') ? 5000 : 3500);
    const toast: Toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type, title, message, duration: d,
    };
    this.toasts$.next([...this.toasts$.value, toast]);
  }

  dismiss(id: string): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }

  success(title: string, message?: string): void { this.add('success', title, message); }
  error(title: string, message?: string): void   { this.add('error',   title, message); }
  warning(title: string, message?: string): void { this.add('warning', title, message); }
  info(title: string, message?: string): void    { this.add('info',    title, message); }

  confirm(data: ConfirmDialogData): Promise<boolean> {
    return firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data,
        maxWidth: '440px',
        width: '92vw',
        panelClass: 'edu-dialog',
        disableClose: true,
      }).afterClosed()
    ).then(r => !!r);
  }
}
