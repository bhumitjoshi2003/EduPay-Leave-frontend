import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SchoolService, SchoolSettings } from '../../services/school.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { LoggerService } from '../../services/logger.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-school-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './school-settings.component.html',
  styleUrl: './school-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  role = '';
  settings: SchoolSettings | null = null;
  loading = false;
  saving = false;
  savingRazorpay = false;

  isEditing = false;
  editForm: Partial<SchoolSettings> = {};

  activeTab: 'general' | 'razorpay' = 'general';
  razorpayKeyId = '';
  razorpayKeySecret = '';

  readonly boardTypes = ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE', 'OTHER'];

  constructor(
    private schoolService: SchoolService,
    private authStateService: AuthStateService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const user = this.authStateService.getUser();
    this.role = user?.role ?? '';
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSettings(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.schoolService.getSettings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.settings = s;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.logger.error('Failed to load school settings', e);
        Swal.fire({ title: 'Error', text: 'Failed to load school settings.', icon: 'error', confirmButtonColor: '#4f46e5' });
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  startEdit(): void {
    if (!this.settings) return;
    this.editForm = {
      name: this.settings.name,
      address: this.settings.address,
      city: this.settings.city,
      state: this.settings.state,
      pincode: this.settings.pincode,
      phone: this.settings.phone,
      email: this.settings.email,
      website: this.settings.website,
      boardType: this.settings.boardType,
    };
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm = {};
  }

  saveSettings(): void {
    if (!this.editForm.name?.trim()) {
      Swal.fire({ title: 'Validation', text: 'School name is required.', icon: 'warning', confirmButtonColor: '#4f46e5' });
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    this.schoolService.updateSettings(this.editForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.settings = updated;
        this.isEditing = false;
        this.editForm = {};
        this.saving = false;
        Swal.fire({ title: 'Saved', text: 'School settings updated successfully.', icon: 'success', timer: 1800, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.logger.error('Failed to save school settings', e);
        Swal.fire({ title: 'Error', text: 'Failed to save settings. Please try again.', icon: 'error', confirmButtonColor: '#4f46e5' });
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveRazorpayKeys(): void {
    if (!this.razorpayKeyId.trim() || !this.razorpayKeySecret.trim()) {
      Swal.fire({ title: 'Validation', text: 'Both Razorpay Key ID and Key Secret are required.', icon: 'warning', confirmButtonColor: '#4f46e5' });
      return;
    }
    this.savingRazorpay = true;
    this.cdr.markForCheck();
    this.schoolService.updateRazorpayKeys(this.razorpayKeyId.trim(), this.razorpayKeySecret.trim())
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.razorpayKeySecret = '';
          this.savingRazorpay = false;
          if (this.settings) this.settings.razorpayConfigured = true;
          Swal.fire({ title: 'Saved', text: 'Razorpay keys updated successfully.', icon: 'success', timer: 1800, showConfirmButton: false });
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('Failed to save Razorpay keys', e);
          Swal.fire({ title: 'Error', text: 'Failed to save Razorpay keys. Please try again.', icon: 'error', confirmButtonColor: '#4f46e5' });
          this.savingRazorpay = false;
          this.cdr.markForCheck();
        }
      });
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }
}
