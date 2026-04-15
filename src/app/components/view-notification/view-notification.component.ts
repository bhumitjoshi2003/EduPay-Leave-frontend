import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { UserNotification } from '../../interfaces/user-notification';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-view-notification',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  providers: [DatePipe],
  templateUrl: './view-notification.component.html',
  styleUrls: ['./view-notification.component.css']
})
export class ViewNotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  userNotifications: UserNotification[] = [];
  isLoading: boolean = true;

  constructor(
    private notificationService: NotificationService,
    private datePipe: DatePipe,
    private logger: LoggerService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadUserNotifications();
  }

  loadUserNotifications(): void {
    this.isLoading = true;
    this.notificationService.getUserNotifications().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.userNotifications = data;
        this.isLoading = false;

        if (this.userNotifications.some(n => !n.isRead)) {
          this.notificationService.markAllNotificationsAsRead().subscribe({
            next: () => {
              this.userNotifications.forEach(n => n.isRead = true);
            },
            error: (err) => {
              this.logger.error('Mark read error:', err);
            }
          });
        }
      },
      error: (err) => {
        this.logger.error('Fetch error:', err);
        this.isLoading = false;
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.userNotifications.forEach(n => n.isRead = true);
      },
      error: (err) => {
        this.logger.error('Mark all read error:', err);
      }
    });
  }

  get isMarkAllAsReadDisabled(): boolean {
    return this.userNotifications.length === 0 || this.userNotifications.every(n => n.isRead);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }

    const notificationDate = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) {
      return seconds === 0 ? 'just now' : `${seconds} second${seconds === 1 ? '' : 's'} ago`;
    } else if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (hours < 24) {
      return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    } else if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (weeks < 4) {
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (months <= 12) {
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      return this.datePipe.transform(notificationDate, 'MMM d, y') || '';
    }
  }

  trackByNotificationId(index: number, notif: UserNotification): number { return notif.id ?? index; }

  getNotificationClass(isRead: boolean): string {
    return isRead ? 'notification-item read' : 'notification-item unread';
  }

  getTypeClass(type: string | undefined): string {
    switch (type?.toUpperCase()) {
      case 'Meeting': return 'type-meeting';
      case 'Function': return 'type-function';
      case 'Sports': return 'type-sports';
      case 'Payment': return 'type-payment';
      case 'Holiday': return 'type-holiday';
      case 'Announcement': return 'type-announcement';
      case 'Reminder': return 'type-reminder';
      default: return `type-others`;
    }
  }

  getTypeIcon(type: string | undefined): string {
    switch (type?.toUpperCase()) {
      case 'Meeting': return '🗓️ Meeting';
      case 'Function': return '✨ Function';
      case 'Sports': return '⚽ Sports';
      case 'Payment': return '💳 Payment';
      case 'Holiday': return '📣 Holiday';
      case 'Announcement': return '📣 Announcement';
      default: return `🛎️ ${type}`;
    }
  }

}
