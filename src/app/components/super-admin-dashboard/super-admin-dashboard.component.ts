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
import { ToastService } from '../../services/toast.service';

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
  adminName: string;
  adminPhone: string;
  adminDob: string;
  adminGender: string;
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
    private cdr: ChangeDetectorRef,
    private toast: ToastService
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
          this.toast.error('Error', 'Failed to load dashboard data.');
        },
      });
  }

  submitOnboard(): void {
    const error = this.validateOnboardForm();
    if (error) {
      this.toast.warning('Validation Error', error);
      return;
    }

    this.onboarding = true;
    this.cdr.markForCheck();

    this.schoolService
      .onboardSchool(this.onboardForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (school) => {
          this.schools = [school, ...this.schools];
          this.showOnboardForm = false;
          this.onboardForm = this.emptyOnboardForm();
          this.onboarding = false;
          this.cdr.markForCheck();
          this.toast.success('School Onboarded', `${school.name} has been successfully onboarded.`);
        },
        error: (err) => {
          this.logger.error('Onboard failed', err);
          this.onboarding = false;
          this.cdr.markForCheck();
          const msg = err?.error?.message ?? err?.error ?? 'Failed to onboard school.';
          this.toast.error('Error', typeof msg === 'string' ? msg : 'Failed to onboard school.');
        },
      });
  }

  private validateEditForm(): string | null {
    const f = this.editForm;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRx = /^[0-9]{10}$/;

    if (!f.name.trim())                             return 'School name is required.';
    if (f.email && !emailRx.test(f.email.trim()))   return 'School email is not valid.';
    if (f.phone && !phoneRx.test(f.phone.trim()))   return 'School phone must be exactly 10 digits.';
    if (f.newAdminPassword && f.newAdminPassword.length < 6)
                                                    return 'New admin password must be at least 6 characters.';
    return null;
  }

  private validateOnboardForm(): string | null {
    const f = this.onboardForm;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRx = /^[0-9]{10}$/;
    const slugRx  = /^[a-z0-9][a-z0-9-]*$/;

    if (!f.name.trim())                               return 'School name is required.';
    if (!f.slug.trim())                               return 'Slug is required.';
    if (!slugRx.test(f.slug.trim()))                  return 'Slug must be lowercase letters, digits, and hyphens only.';
    if (f.email && !emailRx.test(f.email.trim()))     return 'School email is not valid.';
    if (f.phone && !phoneRx.test(f.phone.trim()))     return 'School phone must be exactly 10 digits.';
    if (!f.adminName.trim())                          return 'Admin name is required.';
    if (!f.adminUserId.trim())                        return 'Admin user ID is required.';
    if (!f.adminEmail.trim())                         return 'Admin email is required.';
    if (!emailRx.test(f.adminEmail.trim()))           return 'Admin email is not a valid email address.';
    if (!f.adminPhone.trim())                         return 'Admin phone is required.';
    if (!phoneRx.test(f.adminPhone.trim()))           return 'Admin phone must be exactly 10 digits.';
    if (!f.adminDob)                                  return 'Admin date of birth is required.';
    if (!f.adminPassword)                             return 'Admin password is required.';
    if (f.adminPassword.length < 6)                   return 'Admin password must be at least 6 characters.';
    return null;
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

    const error = this.validateEditForm();
    if (error) {
      this.toast.warning('Validation Error', error);
      return;
    }

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
                  this.toast.success('Saved', 'School updated and password reset.');
                },
                error: (err) => {
                  this.logger.error('Password reset failed', err);
                  this.saving = false;
                  this.editingSchoolId = null;
                  this.cdr.markForCheck();
                  this.toast.warning('Partial Save', 'School updated, but password reset failed.');
                },
              });
          } else {
            this.saving = false;
            this.editingSchoolId = null;
            this.cdr.markForCheck();
            this.toast.success('Saved');
          }
        },
        error: (err) => {
          this.logger.error('Save failed', err);
          this.saving = false;
          this.cdr.markForCheck();
          this.toast.error('Error', 'Failed to save school settings.');
        },
      });
  }

  confirmToggleActive(school: SchoolSettings): void {
    const action = school.active ? 'deactivate' : 'activate';
    this.toast.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} School?`,
      message: `Are you sure you want to ${action} "${school.name}"?`,
      icon: 'warning',
      confirmText: `Yes, ${action}`,
      cancelText: 'Cancel',
      danger: school.active,
    }).then((confirmed) => {
      if (!confirmed) return;

      this.schoolService
        .deleteSchool(school.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.schools = this.schools.map((s) =>
              s.id === school.id ? { ...s, active: !s.active } : s
            );
            this.cdr.markForCheck();
            this.toast.success(`School ${action}d`);
          },
          error: (err) => {
            this.logger.error('Toggle active failed', err);
            this.toast.error('Error', `Failed to ${action} school.`);
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
      adminName: '',
      adminPhone: '',
      adminDob: '',
      adminGender: '',
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
