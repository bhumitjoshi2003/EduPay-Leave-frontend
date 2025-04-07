import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { jwtDecode } from 'jwt-decode'; // Correct Import
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, MatMenuModule, MatIconModule, MatDividerModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  Role: string = '';
  Id: string = '';

  constructor(private router: Router, private authService: AuthService, private snackBar: MatSnackBar) { }

  ngOnInit() {
    this.getDetails();
  }

  getDetails() {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token); 
      this.Role = decodedToken.role;
      this.Id = decodedToken.studentId;
    }
  }

  isStudent(): boolean{
    return this.Role === 'STUDENT';
  }

  isTeacherOrAdmin(): boolean {
    return this.Role === 'TEACHER' || this.Role === 'ADMIN' || this.Role === 'SUB-ADMIN';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
    this.snackBar.open('Logout successful!', 'Close', { duration: 3000 });
  }
}