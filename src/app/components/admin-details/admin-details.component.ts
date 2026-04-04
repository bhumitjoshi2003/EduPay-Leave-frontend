import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';

interface Admin {
  adminId: string;
  name: string;
  email: string;
  phoneNumber: string;
  dob: string;
  gender: string;
}

@Component({
  selector: 'app-admin-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-details.component.html',
  styleUrl: './admin-details.component.css'
})
export class AdminDetailsComponent implements OnInit, OnDestroy {
  adminId: string = '';
  adminDetails: Admin | null = null;
  updatedDetails: Admin | null = null;

  loggedInUserRole: string = '';
  loggedInUserId: string = '';
  isEditing: boolean = false;
  isNewAdmin: boolean = false;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.loggedInUserRole = decoded.role;
      this.loggedInUserId = decoded.userId;
    }

    this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe(params => {
      this.adminId = params['adminId'];
      if (this.adminId === 'new') {
        this.prepareCreateMode();
      } else if (this.adminId) {
        this.loadAdminDetails(this.adminId);
      }
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadAdminDetails(id: string): void {
    this.adminService.getAdminById(id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (data) => {
        this.adminDetails = data;
        this.updatedDetails = { ...data };
      },
      error: () => Swal.fire('Error', 'Could not load admin details', 'error')
    });
  }

  prepareCreateMode(): void {
    if (this.loggedInUserRole !== 'SUPER_ADMIN') {
      this.router.navigate(['/dashboard/admin-list']);
      return;
    }
    this.isNewAdmin = true;
    this.isEditing = true;
    this.updatedDetails = {
      adminId: '',
      name: '',
      email: '',
      phoneNumber: '',
      dob: '',
      gender: ''
    };
  }

  canEdit(): boolean {
    // Super Admin can edit anyone; Admin can only edit themselves
    return this.loggedInUserRole === 'SUPER_ADMIN' || this.loggedInUserId === this.adminId;
  }

  enableEditMode(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    if (this.isNewAdmin) {
      this.router.navigate(['/dashboard/admin-list']);
    } else {
      this.isEditing = false;
      this.updatedDetails = { ...this.adminDetails! };
    }
  }

  saveAdmin(form: NgForm): void {
    if (form.invalid) {
      Swal.fire('Error', 'Please fill all required fields correctly.', 'error');
      return;
    }

    const action = this.isNewAdmin
      ? this.adminService.createAdmin(this.updatedDetails)
      : this.adminService.updateAdmin(this.adminId, this.updatedDetails);

    Swal.fire({
      title: 'Confirm Save',
      text: 'Do you want to save these administrator details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Save'
    }).then((result) => {
      if (result.isConfirmed) {
        action.pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: () => {
            Swal.fire('Saved!', 'Admin details updated successfully.', 'success');
            this.router.navigate(['/dashboard/admin-list']);
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Server error occurred', 'error')
        });
      }
    });
  }

  deleteAdmin(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete Admin'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteAdmin(this.adminId).subscribe({
          next: () => {
            Swal.fire('Deleted', 'Administrator removed.', 'success');
            this.router.navigate(['/dashboard/admin-list']);
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin-list']);
  }
}