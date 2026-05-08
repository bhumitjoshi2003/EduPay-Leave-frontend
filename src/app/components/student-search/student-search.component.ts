import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import { StudentService } from '../../services/student.service';
import { Student } from '../../interfaces/student';

@Component({
  selector: 'app-student-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-search.component.html',
  styleUrl: './student-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSearchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  query = '';
  results: Student[] = [];
  isLoading = false;
  hasSearched = false;
  error: string | null = null;

  constructor(
    private studentService: StudentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.isLoading = false;
            this.hasSearched = false;
            this.cdr.markForCheck();
            return of([]);
          }
          this.isLoading = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.studentService.searchStudents(q.trim());
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (students) => {
          this.results = students;
          this.isLoading = false;
          this.hasSearched = this.query.trim().length >= 2;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Search failed. Please try again.';
          this.isLoading = false;
          this.hasSearched = true;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQueryChange(): void {
    this.search$.next(this.query);
  }

  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.hasSearched = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  viewStudent(studentId: string): void {
    this.router.navigate(['/dashboard/student-details', studentId]);
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'status-active';
      case 'INACTIVE':
        return 'status-inactive';
      case 'NEW':
        return 'status-new';
      default:
        return 'status-unknown';
    }
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  trackByStudentId(_: number, student: Student): string {
    return student.studentId;
  }
}
