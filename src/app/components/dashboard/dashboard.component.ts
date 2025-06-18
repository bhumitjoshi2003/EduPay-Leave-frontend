// src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../auth/auth.service';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { AdminService } from '../../services/admin.service';
import { MatDialog } from '@angular/material/dialog';
import { WelcomeDialogComponent } from '../welcome-dialog/welcome-dialog.component';
import { Subject, takeUntil, interval, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { ViewNotificationComponent } from '../view-notification/view-notification.component';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatTabsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    CommonModule,
    MatBadgeModule // <--- Added MatBadgeModule to imports array
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  Role: string = '';
  Id: string = '';
  Name: string = '';
  Class: string = '';
  ClassTeacher: string = '';
  hasShownWelcomeMessage: boolean = false;
  private ngUnsubscribe = new Subject<void>();
  private welcomeMessageKey = 'hasShownWelcome';
  unreadNotificationCount: number = 0;
  private pollingIntervalSubscription: Subscription | undefined; // Changed type to Subscription

  constructor(
    private router: Router,
    private authService: AuthService,
    private studentService: StudentService,
    private teacherService: TeacherService,
    private adminService: AdminService,
    private dialog: MatDialog, // MatDialog injected
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadWelcomeMessageState();
    this.getDetails();
    this.handleInitialNavigation();
    this.setupNotificationPolling();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.pollingIntervalSubscription) {
      this.pollingIntervalSubscription.unsubscribe();
    }
  }

  loadWelcomeMessageState() {
    const storedState = localStorage.getItem(this.welcomeMessageKey);
    if (storedState === 'true') {
      this.hasShownWelcomeMessage = true;
    } else {
      this.hasShownWelcomeMessage = false;
    }
  }

  saveWelcomeMessageState() {
    localStorage.setItem(this.welcomeMessageKey, 'true');
  }

  getDetails() {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.Role = decodedToken.role;
      this.Id = decodedToken.userId;
      this.fetchUserDetails();
      this.getUnreadCount();
    }
  }

  fetchUserDetails() {
    if (this.Role === 'STUDENT' && this.Id) {
      this.studentService.getStudent(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (student) => {
          this.Name = student.name;
          this.Class = student.className;
          this.showWelcomeMessageOnce();
        },
        error: (error) => {
          console.error('Error fetching student details:', error);
        }
      });
    } else if (this.Role === 'TEACHER' && this.Id) {
      this.teacherService.getTeacher(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (teacher) => {
          this.Name = teacher.name;
          this.ClassTeacher = teacher.classTeacher;
          this.showWelcomeMessageOnce();
        },
        error: (error) => {
          console.error('Error fetching teacher details:', error);
        }
      });
    } else if (this.Role === 'ADMIN' && this.Id) {
      this.adminService.getAdmin(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (admin) => {
          this.Name = admin.name;
          this.showWelcomeMessageOnce();
        },
        error: (error) => {
          console.error('Error fetching admin details:', error);
        }
      });
    }
  }

  showWelcomeMessageOnce() {
    if (!this.hasShownWelcomeMessage) {
      this.openWelcomeMessage();
      this.hasShownWelcomeMessage = true;
      this.saveWelcomeMessageState();
    }
  }

  openWelcomeMessage() {
    const dialogRef = this.dialog.open(WelcomeDialogComponent, {
      maxWidth: '520px',
      width: '100%',
      height: 'auto',
      disableClose: true,
      data: { name: this.Name },
      panelClass: 'custom-dialog-container'
    });

    setTimeout(() => {
      dialogRef.close();
    }, 3000);
  }

  handleInitialNavigation(): void {
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/dashboard/payment-history-details/')) {
      if (this.Role === 'STUDENT') {
        this.router.navigate(['/dashboard/fees']);
      } else if (this.Role === 'TEACHER') {
        this.router.navigate(['/dashboard/teacher-attendance']);
      } else if (this.Role === 'ADMIN' || this.Role === 'SUB-ADMIN') {
        this.router.navigate(['/dashboard/fee-structure']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  setupNotificationPolling(): void {
    this.pollingIntervalSubscription = interval(30000)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.getUnreadCount();
      });
  }

  getUnreadCount(): void {
    if (this.Role && this.Id && localStorage.getItem('token')) {
      this.notificationService.getUnreadNotificationCount().pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (count) => {
          this.unreadNotificationCount = count;
        },
        error: (err) => {
          console.error('Error fetching unread notification count:', err);
          this.unreadNotificationCount = 0;
        }
      });
    } else {
      this.unreadNotificationCount = 0;
    }
  }

  // --- IMPORTANT CHANGE HERE ---
  navigateToNotifications(): void {
    // Open ViewNotificationComponent as a MatDialog
    const dialogRef = this.dialog.open(ViewNotificationComponent, {
      maxWidth: '800px', // Set a max width for the dialog
      width: '90%',      // Set a percentage width
      maxHeight: '90vh', // Set a max height to keep it responsive
      height: 'auto',    // Allow height to adjust based on content
      panelClass: 'custom-notification-dialog', // Optional: for custom styling
      data: {} // No specific data needed for ViewNotificationComponent based on its current implementation
    });

    // You might want to update the unread count when the dialog is closed
    dialogRef.afterClosed().subscribe(result => {
      console.log('Notification dialog was closed', result);
      this.getUnreadCount(); // Refresh the unread count after the user closes the dialog
    });
  }
  // -----------------------------

  isStudent(): boolean {
    return this.Role === 'STUDENT';
  }

  isTeacher(): boolean {
    return this.Role === 'TEACHER';
  }

  isAdmin(): boolean {
    return this.Role === 'ADMIN' || this.Role === 'SUB-ADMIN';
  }

  logout() {
    localStorage.removeItem(this.welcomeMessageKey);
    this.authService.logout();
    this.router.navigate(['/home']);
  }

  navigateToMyProfile(): void {
    if (this.isStudent() && this.Id) {
      this.router.navigate(['/dashboard/student-details', this.Id]);
    }
    if (this.isTeacher() && this.Id) {
      this.router.navigate(['/dashboard/teacher-details', this.Id]);
    }
  }
}