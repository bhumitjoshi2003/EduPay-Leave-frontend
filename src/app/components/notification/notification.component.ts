import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'; // Ensure ViewChild and ElementRef are imported
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Notification } from '../../interfaces/notification';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule
  ],
  providers: [DatePipe],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit {

  notificationForm!: FormGroup;
  notifications: Notification[] = [];
  displayedColumns: string[] = ['title', 'message', 'type', 'audience', 'actions'];

  isEditing: boolean = false;
  selectedNotificationId: number | null = null;

  audienceOptions: string[] = ['ALL', 'STUDENTS', 'TEACHERS'];
  typeOptions: string[] = ['Meeting', 'Function', 'Sports', 'Payment', 'Holiday', 'Announcement', 'Reminder'];

  // Map for dynamic class names and icons
  typeStyles = new Map<string, { className: string, icon: string }>();

  // Get a reference to the notification form title element
  @ViewChild('editNotificationTitle') editNotificationTitle!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) { }

  isMobile: boolean = false;

  ngOnInit(): void {
    this.isMobile = window.innerWidth <= 768;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
    });
    this.initForm();
    this.initTypeStyles();
    this.loadNotifications();
  }

  initForm(): void {
    this.notificationForm = this.fb.group({
      title: ['', Validators.required],
      message: ['', Validators.required],
      type: ['', Validators.required],
      audience: ['', Validators.required]
    });
  }

  private initTypeStyles(): void {
    this.typeStyles.set('Meeting', { className: 'type-meeting', icon: 'meeting_room' });
    this.typeStyles.set('Function', { className: 'type-function', icon: 'event' });
    this.typeStyles.set('Sports', { className: 'type-sports', icon: 'sports_soccer' });
    this.typeStyles.set('Payment', { className: 'type-payment', icon: 'payment' });
    this.typeStyles.set('Holiday', { className: 'type-holiday', icon: 'notifications' });
    this.typeStyles.set('Announcement', { className: 'type-announcement', icon: 'announcement' });
    this.typeStyles.set('Default', { className: 'type-others', icon: 'notifications' });
    this.typeStyles.set('Others', { className: 'type-others', icon: 'notifications' });
  }

  getTypeClass(type: string | undefined): string {
    if (!type) return this.typeStyles.get('DEFAULT')?.className || '';
    return this.typeStyles.get(type.toUpperCase())?.className || this.typeStyles.get('DEFAULT')?.className || '';
  }

  getTypeIcon(type: string | undefined): string {
    if (!type) return this.typeStyles.get('DEFAULT')?.icon || 'notifications';
    return this.typeStyles.get(type.toUpperCase())?.icon || this.typeStyles.get('DEFAULT')?.icon || 'notifications';
  }

  loadNotifications(): void {
    this.notificationService.getAllNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        this.snackBar.open('Failed to load notifications.', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    if (this.notificationForm.valid) {
      const notification: Notification = this.notificationForm.value;
      if (this.isEditing && this.selectedNotificationId) {
        this.notificationService.updateNotification(this.selectedNotificationId, notification).subscribe({
          next: (res) => {
            this.snackBar.open('Notification updated successfully!', 'Close', { duration: 3000 });
            this.loadNotifications();
            this.resetForm();
          },
          error: (err) => {
            console.error('Error updating notification:', err);
            this.snackBar.open('Failed to update notification.', 'Close', { duration: 3000 });
          }
        });
      } else {
        console.log("NOT=> " + notification.message);
        console.log(notification.type);
        console.log(notification.audience);
        console.log(notification.title);

        this.notificationService.createNotification(notification).subscribe({
          next: (res) => {
            this.snackBar.open('Notification created successfully!', 'Close', { duration: 3000 });
            this.loadNotifications();
            this.resetForm();
          },
          error: (err) => {
            console.error('Error creating notification:', err);
            this.snackBar.open('Failed to create notification.', 'Close', { duration: 3000 });
          }
        });
      }
    } else {
      this.notificationForm.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields.', 'Close', { duration: 3000 });
    }
  }

  editNotification(notification: Notification): void {
    this.isEditing = true;
    this.selectedNotificationId = notification.id!;
    this.notificationForm.patchValue({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      audience: notification.audience
    });

    if (this.editNotificationTitle) {
      const element = this.editNotificationTitle.nativeElement;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offset = 80;

      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  }

  deleteNotification(id: number): void {
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(id).subscribe({
        next: () => {
          this.snackBar.open('Notification deleted successfully!', 'Close', { duration: 3000 });
          this.loadNotifications();
          this.resetForm();
        },
        error: (err) => {
          console.error('Error deleting notification:', err);
          this.snackBar.open('Failed to delete notification.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  resetForm(): void {
    this.notificationForm.reset();
    this.isEditing = false;
    this.selectedNotificationId = null;
    Object.keys(this.notificationForm.controls).forEach(key => {
      this.notificationForm.get(key)?.setErrors(null);
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return this.datePipe.transform(dateString, 'medium') || '';
  }
}