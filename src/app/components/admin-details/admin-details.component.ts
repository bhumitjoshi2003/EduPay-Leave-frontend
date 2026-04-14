import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
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

  private readonly eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  private readonly eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.01 10.01 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M15 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><path d="M3 3l18 18"/></svg>`;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private authService: AuthService,
    private authStateService: AuthStateService
  ) { }

  ngOnInit(): void {
    const user = this.authStateService.getUser();
    if (user) {
      this.loggedInUserRole = user.role;
      this.loggedInUserId = user.userId;
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
    this.updatedDetails = { adminId: '', name: '', email: '', phoneNumber: '', dob: '', gender: '' };
  }

  canEdit(): boolean {
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
      form.control.markAllAsTouched();
      Swal.fire('Error', 'Please correct the invalid fields.', 'error');
      return;
    }

    const action = this.isNewAdmin
      ? this.adminService.createAdmin(this.updatedDetails)
      : this.adminService.updateAdmin(this.adminId, this.updatedDetails);

    Swal.fire({
      title: 'Confirm Save',
      text: 'Save administrator details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Save'
    }).then((result) => {
      if (result.isConfirmed) {
        action.pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: () => {
            Swal.fire('Saved!', 'Admin details updated successfully.', 'success');
            this.isEditing = false;
            this.updatedDetails = { ...this.adminDetails! };
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Server error occurred', 'error')
        });
      }
    });
  }

  changePassword(): void {
    const isOwnAccount = (this.loggedInUserId === this.adminId);
    const isSuperAdminResettingOther = (this.loggedInUserRole === 'SUPER_ADMIN' && !isOwnAccount);

    const showOldPasswordField = isOwnAccount;

    Swal.fire({
      title: isOwnAccount ? 'Change Your Password' : 'Reset Admin Password',
      html: `
        <div class="swal-password-container">
          ${showOldPasswordField ? `
            <div class="pw-wrapper">
              <input id="oldPw" type="password" class="swal2-input" placeholder="Current Password">
              <span id="toggleOld" class="pw-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span>
            </div>` : ''}
          <div class="pw-wrapper">
            <input id="newPw" type="password" class="swal2-input" placeholder="New Password">
            <span id="toggleNew" class="pw-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span>
          </div>
          <div class="pw-wrapper">
            <input id="confirmPw" type="password" class="swal2-input" placeholder="Confirm New Password">
            <span id="toggleConfirm" class="pw-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span>
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Update Password',
      preConfirm: () => {
        const oldP = showOldPasswordField ? (document.getElementById('oldPw') as HTMLInputElement).value : '';
        const newP = (document.getElementById('newPw') as HTMLInputElement).value;
        const confP = (document.getElementById('confirmPw') as HTMLInputElement).value;
        return { oldP, newP, confP };
      },
      didRender: () => {
        const setup = (btnId: string, inputId: string) => {
          const btn = document.getElementById(btnId);
          if (!btn) return;
          btn.addEventListener('click', () => {
            const input = document.getElementById(inputId) as HTMLInputElement;
            const isShowing = input.type === 'text';
            input.type = isShowing ? 'password' : 'text';
            (btn.children[0] as HTMLElement).style.display = isShowing ? 'none' : '';
            (btn.children[1] as HTMLElement).style.display = isShowing ? '' : 'none';
          });
        };
        if (showOldPasswordField) setup('toggleOld', 'oldPw');
        setup('toggleNew', 'newPw');
        setup('toggleConfirm', 'confirmPw');
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { oldP, newP, confP } = result.value as any;

        if (showOldPasswordField && !oldP) {
          Swal.fire('Error', 'Current password is required to verify identity.', 'error');
          return;
        }
        if (newP.length < 6) {
          Swal.fire('Error', 'New password must be at least 6 characters.', 'error');
          return;
        }
        if (newP !== confP) {
          Swal.fire('Error', 'New passwords do not match.', 'error');
          return;
        }

        const payload = {
          userId: this.adminId,
          oldPassword: oldP,
          newPassword: newP,
          isAdministrativeReset: isSuperAdminResettingOther
        };

        this.authService.changePassword(payload).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: () => Swal.fire('Success', 'Password updated successfully', 'success'),
          error: (err) => Swal.fire('Error', err.error || 'Failed to update password', 'error')
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
        this.adminService.deleteAdmin(this.adminId).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
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