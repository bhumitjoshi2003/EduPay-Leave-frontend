import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule, FormsModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  authenticated = false;
  showLoginForm = false;
  studentId = '';
  password = '';
  loginState = 'initial';
  hidePassword = true; 

  constructor(private authService: AuthService, private snackBar: MatSnackBar, private router: Router) { }

  ngOnInit() {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('token')) {
      this.authenticated = true;
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    this.showLoginForm = true;
    this.loginState = 'loginActive'; // Change state
  }

  cancelLogin() {
    this.showLoginForm = false;
    this.loginState = 'initial'; // Reset state
  }

  submitLogin() {
    this.authService.login(this.studentId, this.password).subscribe({
      next: (token) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('token', token);
        }
        this.authenticated = true;
        this.showLoginForm = false;
        this.loginState = 'initial'; // Reset state
  

        const redirectUrl = localStorage.getItem('redirectUrl') || '/dashboard';
        localStorage.removeItem('redirectUrl'); // Clear stored URL after redirecting
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.snackBar.open('Incorrect Credentials', 'Okay', {
          duration: 5000,
          panelClass: ['error-snackbar'], 
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        console.error('Login error:', error);
      }
    });
  }
  

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.authenticated = false;
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }
}