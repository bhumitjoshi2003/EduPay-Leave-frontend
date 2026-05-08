import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
  SchoolService,
  SuperAdminStats,
  SchoolSettings,
} from '../../services/school.service';
import { LoggerService } from '../../services/logger.service';

interface OnboardForm {
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  boardType: string;
  adminUserId: string;
  adminEmail: string;
  adminPassword: string;
}

interface EditForm {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  contactPersonName: string;
  boardType: string;
  plan: string;
  maxStudents: number;
  expiryDate: string;
  newAdminPassword: string;
}

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: 'overview' | 'schools' = 'overview';
  stats: SuperAdminStats | null = null;
  schools: SchoolSettings[] = [];
  loading = false;

  // Onboard form
  showOnboardForm = false;
  onboarding = false;
  onboardForm: OnboardForm = this.emptyOnboardForm();

  // Edit form
  editingSchoolId: number | null = null;
  editForm: EditForm = this.emptyEditForm();
  saving = false;
  showPasswordField = false;

  readonly plans = ['TRIAL', 'FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];
  readonly boardTypes = ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE', 'OTHER'];

  constructor(
    private schoolService: SchoolService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOverview(): void {
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      stats: this.schoolService.getDashboard(),
      schools: this.schoolService.listAllSchools(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stats, schools }) => {
          this.stats = stats;
          this.schools = schools;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load super admin data', err);
          this.loading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load dashboard data.', 'error');
        },
      });
  }

  submitOnboard(): void {
    const f = this.onboardForm;
    if (!f.name || !f.slug || !f.adminEmail || !f.adminPassword || !f.adminUserId) {
      Swal.fire('Validation Error', 'Please fill in all required fields.', 'warning');
      return;
    }

    this.onboarding = true;
    this.cdr.markForCheck();

    this.schoolService
      .onboardSchool(f)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (school) => {
          this.schools = [school, ...this.schools];
          this.showOnboardForm = false;
          this.onboardForm = this.emptyOnboardForm();
          this.onboarding = false;
          this.cdr.markForCheck();
          Swal.fire({
            icon: 'success',
            title: 'School Onboarded',
            text: `${school.name} has been successfully onboarded.`,
          });
        },
        error: (err) => {
          this.logger.error('Onboard failed', err);
          this.onboarding = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to onboard school.', 'error');
        },
      });
  }

  startEdit(school: SchoolSettings): void {
    this.editingSchoolId = school.id;
    this.editForm = {
      name: school.name,
      address: school.address,
      city: school.city,
      state: school.state,
      pincode: school.pincode,
      phone: school.phone,
      email: school.email,
      website: school.website ?? '',
      contactPersonName: school.contactPersonName ?? '',
      boardType: school.boardType,
      plan: school.plan,
      maxStudents: school.maxStudents,
      expiryDate: school.expiryDate,
      newAdminPassword: '',
    };
    this.showPasswordField = false;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingSchoolId = null;
    this.editForm = this.emptyEditForm();
    this.cdr.markForCheck();
  }

  saveEdit(): void {
    if (!this.editingSchoolId) return;

    this.saving = true;
    this.cdr.markForCheck();

    const { newAdminPassword, ...payload } = this.editForm;

    this.schoolService
      .updateSchoolAll(this.editingSchoolId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.schools = this.schools.map((s) =>
            s.id === updated.id ? updated : s
          );

          if (newAdminPassword && this.editingSchoolId) {
            this.schoolService
              .resetAdminPassword(this.editingSchoolId, newAdminPassword)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.saving = false;
                  this.editingSchoolId = null;
                  this.cdr.markForCheck();
                  Swal.fire('Saved', 'School updated and password reset.', 'success');
                },
                error: (err) => {
                  this.logger.error('Password reset failed', err);
                  this.saving = false;
                  this.editingSchoolId = null;
                  this.cdr.markForCheck();
                  Swal.fire('Partial Save', 'School updated, but password reset failed.', 'warning');
                },
              });
          } else {
            this.saving = false;
            this.editingSchoolId = null;
            this.cdr.markForCheck();
            Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
          }
        },
        error: (err) => {
          this.logger.error('Save failed', err);
          this.saving = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to save school settings.', 'error');
        },
      });
  }

  confirmToggleActive(school: SchoolSettings): void {
    const action = school.active ? 'deactivate' : 'activate';
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} School?`,
      text: `Are you sure you want to ${action} "${school.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      confirmButtonColor: school.active ? '#dc2626' : '#059669',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.schoolService
        .deleteSchool(school.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.schools = this.schools.map((s) =>
              s.id === school.id ? { ...s, active: !s.active } : s
            );
            this.cdr.markForCheck();
            Swal.fire({
              icon: 'success',
              title: `School ${action}d`,
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (err) => {
            this.logger.error('Toggle active failed', err);
            Swal.fire('Error', `Failed to ${action} school.`, 'error');
          },
        });
    });
  }

  generateSlug(): void {
    this.onboardForm.slug = this.onboardForm.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.cdr.markForCheck();
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  trackById(_: number, school: SchoolSettings): number {
    return school.id;
  }

  get activeCount(): number {
    return this.schools.filter((s) => s.active).length;
  }

  private emptyOnboardForm(): OnboardForm {
    return {
      name: '',
      slug: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      website: '',
      boardType: 'CBSE',
      adminUserId: '',
      adminEmail: '',
      adminPassword: '',
    };
  }

  private emptyEditForm(): EditForm {
    return {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      website: '',
      contactPersonName: '',
      boardType: 'CBSE',
      plan: 'BASIC',
      maxStudents: 500,
      expiryDate: '',
      newAdminPassword: '',
    };
  }
}
