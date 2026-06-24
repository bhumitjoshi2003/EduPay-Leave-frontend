import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  OnDestroy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { SchoolService } from '../../services/school.service';
import { ReportCardTemplateService, ReportCardTemplate } from '../../services/report-card-template.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { AuthStateService } from '../../auth/auth-state.service';

@Component({
  selector: 'app-bulk-report-card',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './bulk-report-card.component.html',
  styleUrl: './bulk-report-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkReportCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  classes: string[] = [];
  templates: ReportCardTemplate[] = [];

  selectedClass = '';
  selectedTemplateId: number | null = null;
  selectedSession = '';

  sessions: string[] = [];

  loadingClasses = true;
  loadingTemplates = true;
  downloading = false;

  isNative = Capacitor.isNativePlatform();

  constructor(
    private schoolService: SchoolService,
    private rcTemplateService: ReportCardTemplateService,
    private toast: ToastService,
    private logger: LoggerService,
    private authState: AuthStateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildSessions();
    this.loadClasses();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildSessions(): void {
    const now = new Date();
    const year = now.getFullYear();
    // Offer current and previous two academic years
    for (let y = year; y >= year - 2; y--) {
      this.sessions.push(`${y}-${y + 1}`);
    }
    this.selectedSession = this.sessions[0];
  }

  private loadClasses(): void {
    this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
      next: (cls) => {
        this.classes = cls;
        this.loadingClasses = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.logger.error('Failed to load classes', e);
        this.loadingClasses = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadTemplates(): void {
    this.rcTemplateService.getTemplates().pipe(takeUntil(this.destroy$)).subscribe({
      next: (templates) => {
        this.templates = templates;
        const def = templates.find(t => t.isDefault);
        if (def) this.selectedTemplateId = def.id;
        else if (templates.length > 0) this.selectedTemplateId = templates[0].id;
        this.loadingTemplates = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.logger.error('Failed to load templates', e);
        this.loadingTemplates = false;
        this.cdr.markForCheck();
      }
    });
  }

  get canDownload(): boolean {
    return !!this.selectedClass && !!this.selectedTemplateId && !!this.selectedSession && !this.downloading;
  }

  get selectedTemplateName(): string {
    return this.templates.find(t => t.id === this.selectedTemplateId)?.name ?? '';
  }

  downloadAll(): void {
    if (!this.canDownload) return;

    if (this.isNative) {
      this.toast.info('Not Available', 'Bulk PDF download is not supported in the app. Please use the web version.');
      return;
    }

    this.downloading = true;
    this.cdr.markForCheck();

    this.rcTemplateService.downloadBulkPdf(
      this.selectedTemplateId!,
      this.selectedSession,
      this.selectedClass
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const className = this.selectedClass.replace(/\s+/g, '_');
        const filename = `${className}_${this.selectedSession}_ReportCards.zip`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Downloaded', `${filename} saved successfully.`);
        this.downloading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.logger.error('Bulk PDF download failed', e);
        this.toast.error('Download Failed', 'Could not generate bulk PDF. Please try again.');
        this.downloading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
