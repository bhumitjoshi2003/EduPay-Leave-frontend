import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminService } from '../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notice',
  templateUrl: './notice.component.html',
  styleUrls: ['./notice.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MatFormFieldModule, MatInputModule]
})
export class NoticeComponent implements OnInit {
  emailForm: FormGroup;
  loading = false;
  isAdmin = false;

  classList: string[] = [
    'All', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService
  ) {
    this.emailForm = this.fb.group({
      title: ['', Validators.required],
      subject: ['', Validators.required],
      body: ['', Validators.required],
      targetClass: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.getUserRole() !== 'ADMIN') {
      this.router.navigate(['/dashboard']);
    }
    this.isAdmin = true;
  }

  sendEmail(): void {
    if (this.emailForm.invalid) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Form',
        text: 'Please fill in all required fields before sending.',
        confirmButtonColor: '#007BFF'
      });
      return;
    }
  
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to send this notice to all students.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007BFF',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, send it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const emailData = this.emailForm.value;
  
        Swal.fire({
          title: 'Sending Emails...',
          text: 'Please wait while the emails are being sent.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
  
        this.loading = true;
        this.adminService.sendNoticeToStudents(emailData).subscribe(
          (response: any) => {
            this.loading = false;
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Emails Sent Successfully',
              confirmButtonColor: '#007BFF'
            });
            this.emailForm.reset();
          },
          (error: any) => {
            this.loading = false;
            Swal.fire({
              icon: 'error',
              title: 'Failed!',
              text: 'Failed to send emails. Please try again.',
              confirmButtonColor: '#007BFF'
            });
            console.error('Error sending emails:', error);
          }
        );
      }
    });
  }

  get f() {
    return this.emailForm.controls;
  }
}
