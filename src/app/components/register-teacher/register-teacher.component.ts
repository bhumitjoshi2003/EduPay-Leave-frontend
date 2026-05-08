import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { EMPTY, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { SchoolService } from '../../services/school.service';

@Component({
  selector: 'app-register-teacher',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-teacher.component.html',
  styleUrls: ['./register-teacher.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterTeacherComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  teacherForm: FormGroup;
  classList: string[] = [];

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private router: Router,
    private authService: AuthService,
    private logger: LoggerService,
    private schoolService: SchoolService
  ) {
    this.teacherForm = this.fb.group({
      teacherId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.pattern('^[0-9]{10}$')],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      classTeacher: ['']
    });
  }

  ngOnInit(): void {
    this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
      next: classes => { this.classList = classes; },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.teacherForm.valid) {
      this.teacherService.addTeacher(this.teacherForm.value).pipe(
        switchMap((response: any) => {
          const tempPassword = this.generateTempPassword();
          return this.authService.register({
            userId: response.teacherId,
            password: tempPassword,
            role: 'TEACHER',
            email: this.teacherForm.value.email
          }).pipe(
            map(() => tempPassword),
            catchError((authError) => {
              this.logger.error('Error registering user in auth service:', authError);
              Swal.fire('Error', 'Teacher record created but account setup failed. Please retry.', 'error');
              return EMPTY;
            })
          );
        })
      ).subscribe({
        next: (tempPassword) => {
          Swal.fire({
            icon: 'success',
            title: 'Teacher Registered!',
            html: `Registration complete.<br><br><b>Temporary Password:</b><br><code style="font-size:1.1em;letter-spacing:0.05em">${tempPassword}</code><br><small>Share this with the teacher. They should change it on first login.</small>`,
            confirmButtonText: 'Done'
          });
          this.teacherForm.reset();
        },
        error: (error) => {
          this.logger.error('Error registering teacher:', error);
          let errorMessage = 'Failed to register new teacher.';
          if (error.status === 409) {
            errorMessage = error.error;
          }
          Swal.fire({ icon: 'error', title: 'Error!', text: errorMessage });
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error!',
        text: 'Please fill in all the required fields correctly.',
      });
    }
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    const array = new Uint32Array(10);
    crypto.getRandomValues(array);
    return Array.from(array, v => chars[v % chars.length]).join('');
  }

  goBack() {
    this.teacherForm.reset();
  }
}