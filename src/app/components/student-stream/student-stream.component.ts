import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { StudentStreamService, StudentStreamOverview } from '../../services/student-stream.service';
import { SubjectConfigService, AcademicStream, OptionalSubjectGroup } from '../../services/subject-config.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-student-stream',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-stream.component.html',
  styleUrl: './student-stream.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentStreamComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  classOptions = ['11', '12'];
  selectedClass = '11';

  students: StudentStreamOverview[] = [];
  streams: AcademicStream[] = [];
  optionalGroups: OptionalSubjectGroup[] = [];
  loading = false;

  editingStudentId: string | null = null;
  editStreamId: number | null = null;
  editOptionalSubjectId: number | null = null;

  constructor(
    private streamService: StudentStreamService,
    private subjectService: SubjectConfigService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    forkJoin([
      this.subjectService.getStreams(),
      this.subjectService.getOptionalGroups(),
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([streams, groups]) => {
        this.streams = streams;
        this.optionalGroups = groups;
        this.cdr.markForCheck();
        this.loadStudents();
      },
      error: (e) => this.logger.error('Error loading config:', e),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStudents(): void {
    this.loading = true;
    this.students = [];
    this.streamService.getClassStreamOverview(this.selectedClass)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.students = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Error loading students:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  startEdit(studentId: string, current: StudentStreamOverview): void {
    this.editingStudentId = studentId;
    this.editStreamId = this.streams.find(s => s.streamName === current.streamName)?.id ?? null;
    this.editOptionalSubjectId = this.allOptionalSubjects.find(s => s.subjectName === current.optionalSubjectName)?.id ?? null;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingStudentId = null;
    this.editStreamId = null;
    this.editOptionalSubjectId = null;
    this.cdr.markForCheck();
  }

  saveAssignment(student: StudentStreamOverview): void {
    if (!this.editStreamId || !this.editOptionalSubjectId) {
      Swal.fire('Incomplete', 'Please select both a stream and an optional subject.', 'warning');
      return;
    }

    const isNew = !student.streamName;
    const op = isNew
      ? this.streamService.assignStream(student.studentId, this.editStreamId, this.editOptionalSubjectId)
      : this.streamService.updateStream(student.studentId, this.editStreamId, this.editOptionalSubjectId);

    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        const s = this.students.find(st => st.studentId === student.studentId);
        if (s) {
          s.streamName = result.streamName;
          s.optionalSubjectName = result.optionalSubjectName;
        }
        this.cancelEdit();
        this.cdr.markForCheck();
        Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false });
      },
      error: (e) => {
        this.logger.error('Error saving stream:', e);
        Swal.fire('Error', 'Could not save assignment.', 'error');
      },
    });
  }

  removeAssignment(studentId: string): void {
    Swal.fire({
      title: 'Remove stream assignment?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.streamService.deleteStream(studentId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const s = this.students.find(st => st.studentId === studentId);
          if (s) { s.streamName = null; s.optionalSubjectName = null; }
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Error removing stream:', e);
          Swal.fire('Error', 'Could not remove assignment.', 'error');
        },
      });
    });
  }

  get allOptionalSubjects() {
    return this.optionalGroups.flatMap(g => g.subjects);
  }

  trackByStudentId(index: number, s: StudentStreamOverview): string { return s.studentId; }
  trackById(index: number, item: { id: number }): number { return item.id; }
  trackByIndex(index: number): number { return index; }
}
