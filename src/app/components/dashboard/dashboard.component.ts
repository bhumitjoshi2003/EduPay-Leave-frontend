import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../auth/auth.service';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { AdminService } from '../../services/admin.service';
import { MatDialog } from '@angular/material/dialog';
import { WelcomeDialogComponent } from '../welcome-dialog/welcome-dialog.component';
import { Subject, takeUntil } from 'rxjs';

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
    CommonModule
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

  constructor(
    private router: Router,
    private authService: AuthService,
    private studentService: StudentService,
    private teacherService: TeacherService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.loadWelcomeMessageState();
    this.getDetails();
    this.handleInitialNavigation();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
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