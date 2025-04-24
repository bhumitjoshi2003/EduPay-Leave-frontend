import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeacherService } from '../../services/teacher.service'; 
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-register-teacher',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-teacher.component.html',
  styleUrls: ['./register-teacher.component.css']
})
export class RegisterTeacherComponent implements OnInit {
  teacherForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private router: Router,
    private authService: AuthService
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
  }

  onSubmit() {
    if (this.teacherForm.valid) {
      this.teacherService.addTeacher(this.teacherForm.value).subscribe({
        next: (response: any) => {
          console.log('Teacher registered successfully:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'New teacher registered successfully.',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            this.authService.register({
              userId: response.teacherId,
              password: this.formatDateForPassword(this.teacherForm.value.dob),
              role: 'TEACHER',
              email: this.teacherForm.value.email
            }).subscribe({
              next: (authResponse) => {
                console.log('User registered in auth service:', authResponse);
              },
              error: (authError) => {
                console.error('Error registering user in auth service:', authError);
              }
            });
            this.teacherForm.reset();
          });
        },
        error: (error) => {
          console.error('Error registering teacher:', error);
          let errorMessage = 'Failed to register new teacher.';
          if (error.status === 409) {
            errorMessage = error.error;
          }
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: errorMessage,
          });
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

  private formatDateForPassword(dob: string): string {
    const date = new Date(dob);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  goBack() {
    this.teacherForm.reset();
  }
}