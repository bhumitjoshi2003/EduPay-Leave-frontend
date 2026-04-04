import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Admin } from '../../interfaces/admin';

@Component({
  selector: 'app-admin-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-list.component.html',
  styleUrl: './admin-list.component.css'
})
export class AdminListComponent implements OnInit, OnDestroy {
  admins: Admin[] = [];
  loggedInUserRole: string = '';
  currentUserId: string = '';
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkAccessAndLoadAdmins();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  checkAccessAndLoadAdmins(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.loggedInUserRole = decodedToken.role;
      this.currentUserId = decodedToken.userId;

      if (this.loggedInUserRole === 'ADMIN' || this.loggedInUserRole === 'SUPER_ADMIN') {
        this.loadAdmins();
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadAdmins(): void {
    this.adminService.getAllAdmins()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (data) => this.admins = data,
        error: (err) => console.error('Error fetching admins:', err)
      });
  }

  viewAdminDetails(adminId: string): void {
    this.router.navigate(['/dashboard/admin-details', adminId]);
  }

  deleteAdmin(event: Event, adminId: string): void {
    event.stopPropagation();

    if (adminId === this.currentUserId) {
      Swal.fire('Error', 'You cannot delete your own account.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: "This admin will be permanently removed!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteAdmin(adminId).subscribe({
          next: () => {
            this.admins = this.admins.filter(a => a.adminId !== adminId);
            Swal.fire('Deleted!', 'Admin has been deleted.', 'success');
          },
          error: (err) => Swal.fire('Error', 'Failed to delete admin.', 'error')
        });
      }
    });
  }
}