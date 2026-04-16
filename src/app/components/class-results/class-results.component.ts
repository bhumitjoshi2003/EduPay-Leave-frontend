import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MarksService, ClassStudentResult, ClassStudentSubject } from '../../services/marks.service';
import { ExamConfigService, ExamConfig, ExamSubjectEntry } from '../../services/exam-config.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { TeacherService } from '../../services/teacher.service';
import { FeesCalculationService } from '../../services/fees-calculation.service';
import { LoggerService } from '../../services/logger.service';

const ALL_CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];

@Component({
  selector: 'app-class-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-results.component.html',
  styleUrl: './class-results.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassResultsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  role = '';
  classOptions = ALL_CLASSES;
  sessions: string[] = [];

  selectedSession = '';
  selectedClass = '';
  exams: ExamConfig[] = [];
  selectedExamId: number | null = null;
  examSubjects: ExamSubjectEntry[] = [];

  results: ClassStudentResult[] = [];
  loading = false;

  constructor(
    private marksService: MarksService,
    private examService: ExamConfigService,
    private authState: AuthStateService,
    private teacherService: TeacherService,
    private feesCalc: FeesCalculationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.buildSessions();
    const user = this.authState.getUser();
    this.role = user?.role ?? '';

    if (this.role === 'TEACHER') {
      this.teacherService.getTeacher(user!.userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (t) => {
          this.selectedClass = t.classTeacher ?? '';
          this.cdr.markForCheck();
          if (this.selectedClass) this.loadExams();
        },
        error: (e) => this.logger.error('Error fetching teacher:', e),
      });
    } else {
      this.selectedClass = '1';
      this.loadExams();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildSessions(): void {
    const today = new Date();
    const current = this.feesCalc.getAcademicYear(today);
    const [startStr] = current.split('-');
    const start = parseInt(startStr);
    this.sessions = [`${start - 1}-${start}`, current, `${start + 1}-${start + 2}`];
    this.selectedSession = current;
  }

  loadExams(): void {
    this.exams = [];
    this.selectedExamId = null;
    this.results = [];
    this.examSubjects = [];

    this.examService.getExams(this.selectedSession, this.selectedClass)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.exams = data; this.cdr.markForCheck(); },
        error: (e) => this.logger.error('Error loading exams:', e),
      });
  }

  onExamChange(): void {
    this.results = [];
    this.examSubjects = [];
    if (!this.selectedExamId) return;
    this.examService.getExamSubjects(this.selectedExamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.examSubjects = data; this.cdr.markForCheck(); this.loadResults(); },
        error: (e) => this.logger.error('Error loading exam subjects:', e),
      });
  }

  loadResults(): void {
    if (!this.selectedExamId) return;
    this.loading = true;
    this.marksService.getClassResults(this.selectedClass, this.selectedExamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.results = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Error loading class results:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getMarks(student: ClassStudentResult, subjectName: string): number | null {
    return student.subjects.find(s => s.subjectName === subjectName)?.marksObtained ?? null;
  }

  openReportCard(studentId: string, examId: number | null): void {
    const queryParams: Record<string, string> = {
      studentId,
      session: this.selectedSession,
    };
    if (examId !== null) queryParams['examId'] = String(examId);
    this.router.navigate(['/dashboard/report-card'], { queryParams });
  }

  trackById(index: number, item: { id: number }): number { return item.id; }
  trackByStudentId(index: number, s: ClassStudentResult): string { return s.studentId; }
  trackByIndex(index: number): number { return index; }
}
