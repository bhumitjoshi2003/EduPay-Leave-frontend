import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { SchoolService, SchoolSettings } from '../../services/school.service';
import { AuthStateService } from '../../auth/auth-state.service';
import Swal from 'sweetalert2';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-register-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-admin.component.html',
  styleUrl: './register-admin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterAdminComponent implements OnInit {
  adminData = {
    adminId: '',
    name: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dob: '',
    schoolId: null as number | null
  };

  isSuperAdmin = false;
  schools: SchoolSettings[] = [];
  schoolsLoading = false;

  constructor(
    private adminService: AdminService,
    private schoolService: SchoolService,
    private authState: AuthStateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authState.getUserRole() === 'SUPER_ADMIN';
    if (this.isSuperAdmin) {
      this.schoolsLoading = true;
      this.schoolService.listAllSchools().subscribe({
        next: (schools) => {
          this.schools = schools.filter(s => s.active);
          this.schoolsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.schoolsLoading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load school list.', 'error');
        }
      });
    }
  }

  schoolLabel(school: SchoolSettings): string {
    return `${school.name}  ·  ${school.slug}`;
  }

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

    if (this.isSuperAdmin && !this.adminData.schoolId) {
      Swal.fire('Validation Error', 'Please select a school for this admin.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Registering...',
      text: 'Creating administrator account...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.adminService.createAdmin(this.adminData as any).subscribe({
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