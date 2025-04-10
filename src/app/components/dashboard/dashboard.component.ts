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
 import { StudentService } from '../../services/student.service'; 

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
   Name: string = '';
   Class: string = '';

   constructor(
     private router: Router,
     private authService: AuthService,
     private snackBar: MatSnackBar,
     private studentService: StudentService, // Inject StudentService
   ) { }

   ngOnInit() {
     this.getDetails();
     this.handleInitialNavigation();
   }

   getDetails() {
     const token = localStorage.getItem('token');
     if (token) {
       const decodedToken: any = jwtDecode(token);
       this.Role = decodedToken.role;
       this.Id = decodedToken.studentId || decodedToken.teacherId || decodedToken.adminId || decodedToken['sub-adminId'] || null;
       this.fetchUserDetails(); 
     }
   }

   fetchUserDetails() {
     if (this.Role === 'STUDENT' && this.Id) {
       this.studentService.getStudent(this.Id).subscribe({
         next: (student) => {
           this.Name = student.name;
           this.Class = student.className;
         },
         error: (error) => {
           console.error('Error fetching student details:', error);
         }
       });
     }
   }

   handleInitialNavigation(): void {
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

   isStudent(): boolean {
     return this.Role === 'STUDENT';
   }

   isTeacherOrAdmin(): boolean {
     return this.Role === 'TEACHER' || this.Role === 'ADMIN' || this.Role === 'SUB-ADMIN';
   }

   logout() {
     this.authService.logout();
     this.router.navigate(['/home']);
   }
 }