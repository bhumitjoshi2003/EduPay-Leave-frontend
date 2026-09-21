import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import { ReleaseService } from './release.service';
import { ToastService } from './toast.service';
import { LoggerService } from './logger.service';
import { WhatsNewDialogComponent } from '../components/whats-new-dialog/whats-new-dialog.component';
import { ReleaseNote } from '../interfaces/release-note';

const LAST_SEEN_KEY = 'edunexify.whatsnew.lastSeenVersion';

/**
 * "What's New" release awareness — checked once per app session (see checkOnStartup's callers),
 * never blocking login/navigation. A backend failure here must never surface as an error to the
 * user; it just means nothing is shown, same as if there were no new release.
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
  private startupCheckDone = false;

  constructor(
    private releaseService: ReleaseService,
    private dialog: MatDialog,
    private toast: ToastService,
    private logger: LoggerService,
  ) {}

  /** Call once per app session (e.g. from the dashboard shell's ngOnInit). Silent on failure. */
  checkOnStartup(): void {
    if (this.startupCheckDone) return;
    this.startupCheckDone = true;

    this.releaseService.getLatest().pipe(
      catchError(err => {
        this.logger.error('What\'s New: failed to check latest release', err);
        return of(null);
      })
    ).subscribe(release => {
      if (!release || !this.isUnseen(release)) return;
      this.openDialog(release);
    });
  }

  /** User explicitly asked to see it (e.g. from the profile menu) — always fetches fresh. */
  openManually(): void {
    this.releaseService.getLatest().pipe(
      catchError(err => {
        this.logger.error('What\'s New: manual open failed', err);
        return of(null);
      })
    ).subscribe(release => {
      if (!release) {
        this.toast.info('No updates yet', 'Check back soon for what\'s new in Edunexify.');
        return;
      }
      this.openDialog(release);
    });
  }

  private openDialog(release: ReleaseNote): void {
    this.dialog.open(WhatsNewDialogComponent, {
      data: release,
      maxWidth: '440px',
      width: '92vw',
      panelClass: 'edu-dialog',
    }).afterClosed().subscribe(() => this.markSeen(release.version));
  }

  private isUnseen(release: ReleaseNote): boolean {
    return this.getLastSeenVersion() !== release.version;
  }

  private getLastSeenVersion(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SEEN_KEY) : null;
    } catch {
      return null;
    }
  }

  private markSeen(version: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(LAST_SEEN_KEY, version);
    } catch {
      // Storage unavailable (private browsing, quota) — nothing to do; worst case the
      // modal reappears next session, which is a minor UX nuisance, not a functional break.
    }
  }
}
