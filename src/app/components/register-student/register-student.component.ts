import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentService } from '../../services/student.service'; // Assuming you have a StudentService
import { Router } from '@angular/router';
import Swal from 'sweetalert2'; // For success/error messages
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-register-student',
  templateUrl: './register-student.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./register-student.component.css']
})
export class RegisterStudentComponent implements OnInit {
  studentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private router: Router,
    private authService: AuthService
  ) {
    this.studentForm = this.fb.group({
      studentId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.pattern('^[0-9]{10}$')], 
      dob: ['', Validators.required],
      className: ['', Validators.required],
      gender: ['', Validators.required],
      fatherName: [''],
      motherName: ['']
    });
  }

  ngOnInit(): void {
  }

  onSubmit() {
    if (this.studentForm.valid) {
      this.studentService.addStudent(this.studentForm.value).subscribe({
        next: (response: any) => {
          console.log('Student registered successfully:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'New student registered successfully.',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            this.authService.register({
              userId: response.studentId,
              password: this.formatDateForPassword(this.studentForm.value.dob),
              role: 'STUDENT',
              email: this.studentForm.value.email
            }).subscribe({
              next: (authResponse) => {
                console.log('User registered in auth service:', authResponse);
              },
              error: (authError) => {
                console.error('Error registering user in auth service:', authError);
              }
            });
            this.studentForm.reset();
          });
        },
        error: (error) => {
          console.error('Error registering student:', error);
          let errorMessage = 'Failed to register new student.';
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
    this.studentForm.reset(); 
  }
}