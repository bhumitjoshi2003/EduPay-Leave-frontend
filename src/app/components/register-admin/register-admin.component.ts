import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import Swal from 'sweetalert2';
import { Component } from '@angular/core';

@Component({
  selector: 'app-register-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-admin.component.html',
  styleUrl: './register-admin.component.css'
})
export class RegisterAdminComponent {
  // Initializing with empty strings for the registration form
  adminData = {
    adminId: '',
    name: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dob: ''
  };

  constructor(private adminService: AdminService, private router: Router) { }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach(control => control.markAsTouched());

      Swal.fire({
        icon: 'error',
        title: 'Form Invalid',
        text: 'Please fill in all required fields correctly.',
        confirmButtonColor: '#1f6f8b'
      });
      return;
    }

    Swal.fire({
      title: 'Registering...',
      text: 'Creating administrator account...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.adminService.createAdmin(this.adminData).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'New Administrator has been registered.',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/dashboard/admin-list']);
        });
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to register admin. Check if ID/Email exists.', 'error');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/admin-list']);
  }
}