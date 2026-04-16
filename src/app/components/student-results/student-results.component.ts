import {
  AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, QueryList, ViewChildren
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Chart from 'chart.js/auto';
import { MarksService, ExamResult } from '../../services/marks.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { FeesCalculationService } from '../../services/fees-calculation.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-student-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-results.component.html',
  styleUrl: './student-results.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentResultsComponent implements OnInit, OnDestroy, AfterViewChecked {
  private destroy$ = new Subject<void>();
  private charts: Map<number, Chart> = new Map();
  private chartsNeedRender = false;

  @ViewChildren('barCanvas') barCanvases!: QueryList<ElementRef>;

  sessions: string[] = [];
  selectedSession = '';
  studentId = '';
  results: ExamResult[] = [];
  expandedExamId: number | null = null;
  loading = false;

  constructor(
    private marksService: MarksService,
    private authState: AuthStateService,
    private feesCalc: FeesCalculationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

  ngOnInit(): void {
    this.buildSessions();
    this.studentId = this.authState.getUserId();
    this.loadResults();
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.chartsNeedRender && isPlatformBrowser(this.platformId)) {
      this.chartsNeedRender = false;
      this.renderCharts();
    }
  }

  private buildSessions(): void {
    const today = new Date();
    const current = this.feesCalc.getAcademicYear(today);
    const [startStr] = current.split('-');
    const start = parseInt(startStr);
    this.sessions = [`${start - 2}-${start - 1}`, `${start - 1}-${start}`, current];
    this.selectedSession = current;
  }

  loadResults(): void {
    this.loading = true;
    this.results = [];
    this.expandedExamId = null;
    this.charts.forEach(c => c.destroy());
    this.charts.clear();

    this.marksService.getStudentResults(this.studentId, this.selectedSession)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.results = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Error loading results:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleExam(examId: number): void {
    if (this.expandedExamId === examId) {
      this.expandedExamId = null;
      const chart = this.charts.get(examId);
      if (chart) { chart.destroy(); this.charts.delete(examId); }
    } else {
      this.expandedExamId = examId;
      this.chartsNeedRender = true;
      this.cdr.markForCheck();
    }
  }

  private renderCharts(): void {
    if (!this.expandedExamId) return;
    const exam = this.results.find(r => r.examId === this.expandedExamId);
    if (!exam) return;

    const canvas = this.barCanvases.find(
      (el) => el.nativeElement.dataset['examId'] === String(exam.examId)
    );
    if (!canvas) return;

    const existing = this.charts.get(exam.examId);
    if (existing) existing.destroy();

    const isMobile = window.innerWidth <= 600;

    const labels = exam.subjects.map(s => s.subjectName);
    const studentData = exam.subjects.map(s => s.marksObtained ?? 0);
    const avgData = exam.subjects.map(s => s.classAverage ?? 0);
    const maxData = exam.subjects.map(s => s.maxMarks);

    const chart = new Chart(canvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Your Marks',
            data: studentData,
            backgroundColor: 'rgba(31, 111, 139, 0.75)',
            borderColor: '#1f6f8b',
            borderWidth: 2,
            borderRadius: 4,
            ...(isMobile ? { barThickness: 18 } : {}),
          },
          {
            label: 'Class Avg',
            data: avgData,
            backgroundColor: 'rgba(79, 189, 189, 0.55)',
            borderColor: '#4fbdbd',
            borderWidth: 2,
            borderRadius: 4,
            ...(isMobile ? { barThickness: 18 } : {}),
          },
          {
            label: 'Max',
            data: maxData,
            backgroundColor: 'rgba(200, 200, 200, 0.3)',
            borderColor: '#bbb',
            borderWidth: 1,
            borderRadius: 4,
            ...(isMobile ? { barThickness: 18 } : {}),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'top',
            labels: {
              boxWidth: isMobile ? 10 : 14,
              font: { size: isMobile ? 10 : 12 },
              padding: isMobile ? 8 : 12,
            },
          },
          title: { display: false },
          tooltip: {
            titleFont: { size: isMobile ? 11 : 13 },
            bodyFont: { size: isMobile ? 11 : 12 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: isMobile ? 10 : 12 } },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: isMobile ? 9 : 12 },
              maxRotation: isMobile ? 30 : 0,
            },
          },
        },
      },
    });
    this.charts.set(exam.examId, chart);
  }

  getGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  getGradeClass(percentage: number): string {
    if (percentage >= 80) return 'grade-a';
    if (percentage >= 60) return 'grade-b';
    if (percentage >= 40) return 'grade-c';
    return 'grade-f';
  }

  openReportCard(examId: number | null): void {
    const queryParams: Record<string, string> = {
      studentId: this.studentId,
      session: this.selectedSession,
    };
    if (examId !== null) queryParams['examId'] = String(examId);
    this.router.navigate(['/dashboard/report-card'], { queryParams });
  }

  trackById(index: number, item: { examId: number }): number { return item.examId; }
  trackByIndex(index: number): number { return index; }
}
