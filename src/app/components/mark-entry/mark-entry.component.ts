import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ExamConfigService, ExamConfig, ExamSubjectEntry } from '../../services/exam-config.service';
import { MarksService, MarkEntryStudent, StudentExamSubject, MarkEntryRequest } from '../../services/marks.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { TeacherService } from '../../services/teacher.service';
import { StudentService } from '../../services/student.service';
import { FeesCalculationService } from '../../services/fees-calculation.service';
import { LoggerService } from '../../services/logger.service';

const ALL_CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];

@Component({
  selector: 'app-mark-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mark-entry.component.html',
  styleUrl: './mark-entry.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkEntryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  mode: 'subject' | 'student' = 'subject';
  role = '';
  classOptions = ALL_CLASSES;
  sessions: string[] = [];

  selectedSession = '';
  selectedClass = '';
  exams: ExamConfig[] = [];
  selectedExamId: number | null = null;

  // Mode A — by subject
  examSubjects: ExamSubjectEntry[] = [];
  selectedSubjectEntryId: number | null = null;
  subjectStudents: MarkEntryStudent[] = [];
  marksInputA: Record<string, number | null> = {};

  // Mode B — by student
  students: { studentId: string; name: string }[] = [];
  selectedStudentId = '';
  studentSubjects: StudentExamSubject[] = [];
  marksInputB: Record<number, number | null> = {};

  saving = false;

  constructor(
    private examService: ExamConfigService,
    private marksService: MarksService,
    private authState: AuthStateService,
    private teacherService: TeacherService,
    private studentService: StudentService,
    private feesCalc: FeesCalculationService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.buildSessions();
    const user = this.authState.getUser();
    this.role = user?.role ?? '';

    if (this.role === 'TEACHER') {
      const teacherId = user!.userId;
      this.teacherService.getTeacher(teacherId).pipe(takeUntil(this.destroy$)).subscribe({
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

  setMode(m: 'subject' | 'student'): void {
    if (this.mode === m) return;
    this.mode = m;
    this.resetSubjectSelection();
    this.resetStudentSelection();
    // If an exam is already selected, trigger the appropriate data load for the new mode
    if (this.selectedExamId) {
      this.onExamChange();
    }
  }

  loadExams(): void {
    this.resetSelections();
    this.examService.getExams(this.selectedSession, this.selectedClass)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.exams = data; this.cdr.markForCheck(); },
        error: (e) => this.logger.error('Error loading exams:', e),
      });
  }

  onExamChange(): void {
    this.resetSubjectSelection();
    this.resetStudentSelection();
    if (!this.selectedExamId) return;

    if (this.mode === 'subject') {
      this.loadExamSubjects();
    } else {
      forkJoin([
        this.examService.getExamSubjects(this.selectedExamId),
        this.studentService.getActiveStudentsByClass(this.selectedClass),
      ]).pipe(takeUntil(this.destroy$)).subscribe({
        next: ([subjects, studentList]) => {
          this.examSubjects = subjects;
          this.students = studentList.map((s: any) => ({ studentId: s.studentId, name: s.name }));
          this.cdr.markForCheck();
        },
        error: (e) => this.logger.error('Error loading exam data:', e),
      });
    }
  }

  loadExamSubjects(): void {
    if (!this.selectedExamId) return;
    this.examService.getExamSubjects(this.selectedExamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.examSubjects = data; this.cdr.markForCheck(); },
        error: (e) => this.logger.error('Error loading exam subjects:', e),
      });
  }

  // Mode A — load students for a subject
  onSubjectChange(): void {
    this.subjectStudents = [];
    this.marksInputA = {};
    if (!this.selectedSubjectEntryId) return;

    this.marksService.getStudentsForSubject(this.selectedSubjectEntryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.subjectStudents = data;
          data.forEach(s => { this.marksInputA[s.studentId] = s.marksObtained; });
          this.cdr.markForCheck();
        },
        error: (e) => this.logger.error('Error loading students for subject:', e),
      });
  }

  // Mode B — load subjects for a student
  onStudentChange(): void {
    this.studentSubjects = [];
    this.marksInputB = {};
    if (!this.selectedStudentId || !this.selectedExamId) return;

    this.marksService.getSubjectsForStudent(this.selectedStudentId, this.selectedExamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.studentSubjects = data;
          data.forEach(s => { this.marksInputB[s.examSubjectEntryId] = s.marksObtained; });
          this.cdr.markForCheck();
        },
        error: (e) => this.logger.error('Error loading subjects for student:', e),
      });
  }

  saveMarksA(): void {
    if (!this.selectedSubjectEntryId) return;
    const entries: MarkEntryRequest[] = this.subjectStudents
      .filter(s => this.marksInputA[s.studentId] !== null && this.marksInputA[s.studentId] !== undefined)
      .map(s => ({
        studentId: s.studentId,
        examSubjectEntryId: this.selectedSubjectEntryId!,
        marksObtained: this.marksInputA[s.studentId]!,
      }));

    if (entries.length === 0) return;
    this.saving = true;
    this.marksService.saveBulkMarks(entries).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.saving = false;
        this.cdr.markForCheck();
        const msg = `Saved: ${result.saved}, Updated: ${result.updated}` +
          (result.errors.length ? `, Errors: ${result.errors.length}` : '');
        Swal.fire('Marks Saved', msg, result.errors.length ? 'warning' : 'success');
      },
      error: (e) => {
        this.saving = false;
        this.logger.error('Error saving marks:', e);
        Swal.fire('Error', 'Failed to save marks.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  saveMarksB(): void {
    if (!this.selectedStudentId) return;
    const entries: MarkEntryRequest[] = this.studentSubjects
      .filter(s => this.marksInputB[s.examSubjectEntryId] !== null && this.marksInputB[s.examSubjectEntryId] !== undefined)
      .map(s => ({
        studentId: this.selectedStudentId,
        examSubjectEntryId: s.examSubjectEntryId,
        marksObtained: this.marksInputB[s.examSubjectEntryId]!,
      }));

    if (entries.length === 0) return;
    this.saving = true;
    this.marksService.saveBulkMarks(entries).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.saving = false;
        this.cdr.markForCheck();
        Swal.fire('Marks Saved', `Saved: ${result.saved}, Updated: ${result.updated}`, 'success');
      },
      error: (e) => {
        this.saving = false;
        this.logger.error('Error saving marks:', e);
        Swal.fire('Error', 'Failed to save marks.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  getSelectedSubject(): ExamSubjectEntry | undefined {
    return this.examSubjects.find(s => s.id === this.selectedSubjectEntryId);
  }

  get selectedStudentName(): string {
    return this.students.find(s => s.studentId === this.selectedStudentId)?.name ?? '';
  }

  private resetSelections(): void {
    this.selectedExamId = null;
    this.exams = [];
    this.resetSubjectSelection();
    this.resetStudentSelection();
  }

  private resetSubjectSelection(): void {
    this.examSubjects = [];
    this.selectedSubjectEntryId = null;
    this.subjectStudents = [];
    this.marksInputA = {};
  }

  private resetStudentSelection(): void {
    this.students = [];
    this.selectedStudentId = '';
    this.studentSubjects = [];
    this.marksInputB = {};
  }

  trackById(index: number, item: { id: number }): number { return item.id; }
  trackByEntryId(index: number, s: StudentExamSubject): number { return s.examSubjectEntryId; }
  trackByStudentId(index: number, s: { studentId: string }): string { return s.studentId; }
  trackByIndex(index: number): number { return index; }
}
