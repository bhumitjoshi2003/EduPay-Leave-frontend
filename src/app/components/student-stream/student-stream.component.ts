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
  // One selection per optional group, keyed by group id
  editOptionalSubjectIds: Record<number, number | null> = {};

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

    // Initialize one slot per group; try to match the existing optional subject name
    this.editOptionalSubjectIds = {};
    const currentName = current.optionalSubjectName;
    for (const group of this.optionalGroups) {
      const match = currentName
        ? group.subjects.find(s => s.subjectName === currentName)?.id ?? null
        : null;
      this.editOptionalSubjectIds[group.id] = match;
    }
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingStudentId = null;
    this.editStreamId = null;
    this.editOptionalSubjectIds = {};
    this.cdr.markForCheck();
  }

  saveAssignment(student: StudentStreamOverview): void {
    if (!this.editStreamId) {
      Swal.fire('Incomplete', 'Please select a stream.', 'warning');
      return;
    }

    // Collect one selection per group; all groups must have a selection
    const selectedIds: number[] = [];
    for (const group of this.optionalGroups) {
      const chosen = this.editOptionalSubjectIds[group.id];
      if (!chosen) {
        Swal.fire('Incomplete', `Please select an optional subject for group "${group.groupName}".`, 'warning');
        return;
      }
      selectedIds.push(chosen);
    }

    const isNew = !student.streamName;
    const op = isNew
      ? this.streamService.assignStream(student.studentId, this.editStreamId, selectedIds)
      : this.streamService.updateStream(student.studentId, this.editStreamId, selectedIds);

    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        // Immutable update so OnPush detects the change
        this.students = this.students.map(st =>
          st.studentId === student.studentId
            ? { ...st, streamName: result.streamName, optionalSubjectName: result.optionalSubjectName }
            : st
        );
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
          // Immutable update so OnPush detects the change
          this.students = this.students.map(st =>
            st.studentId === studentId
              ? { ...st, streamName: null, optionalSubjectName: null }
              : st
          );
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Error removing stream:', e);
          Swal.fire('Error', 'Could not remove assignment.', 'error');
        },
      });
    });
  }

  trackByStudentId(index: number, s: StudentStreamOverview): string { return s.studentId; }
  trackById(index: number, item: { id: number }): number { return item.id; }
  trackByIndex(index: number): number { return index; }
}
