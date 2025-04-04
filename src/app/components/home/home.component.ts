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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  authenticated = false;
  showLoginForm = false;
  studentId = '';
  password = '';
  loginState = 'initial'; // Added state variable

  constructor(private authService: AuthService, private snackBar: MatSnackBar, private router: Router) { }

  ngOnInit() {
    if (typeof localStorage !== 'undefined') {
      this.authenticated = !!localStorage.getItem('token');
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
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.snackBar.open('Login failed. Invalid credentials.', 'Close', { duration: 3000 });
        console.error('Login error:', error);
      }
    });
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.authenticated = false;
    this.snackBar.open('Logout successful!', 'Close', { duration: 3000 });
  }
}