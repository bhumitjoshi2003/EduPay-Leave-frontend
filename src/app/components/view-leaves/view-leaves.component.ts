import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { TeacherService } from '../../services/teacher.service';
import { jwtDecode } from 'jwt-decode';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { from, concatMap } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { LeaveApplication, LeaveService } from '../../services/leave.service';

@Component({
  selector: 'app-view-leaves',
  templateUrl: './view-leaves.component.html',
  styleUrls: ['./view-leaves.component.css'],
  imports: [CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule],
})
export class ViewLeavesComponent implements OnInit, OnDestroy {
  loggedInUserRole: string = '';
  loggedInUserId: string = '';
  loggedInUserClass: string = '';
  allLeaves: LeaveApplication[] = [];
  filteredLeaves: LeaveApplication[] = [];
  userId: string = '';
  classList: string[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  ];
  selectedClass: string = 'all'; // Initialize to 'all'
  selectedDate: any = '';
  studentIdFilter: string = '';
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private leaveService: LeaveService,
    private teacherService: TeacherService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const studentIdFromParams = params['studentId'];
      if (studentIdFromParams) {
        this.studentIdFilter = studentIdFromParams;
      }
    });
    this.loadInitialData();
  }

  loadInitialData() {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.loggedInUserRole = decodedToken.role;
      this.loggedInUserId = decodedToken.userId;

      if (this.loggedInUserRole === 'ADMIN') {
        this.selectedClass = localStorage.getItem('lastSelectedClass') ? localStorage.getItem('lastSelectedClass')! : 'all';
        this.loadLeaves(this.selectedClass);
      } else if (this.loggedInUserRole === 'TEACHER') {
        this.getTeacherClassAndLoadLeaves();
      }
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getTeacherClassAndLoadLeaves(): void {
    this.teacherService.getTeacher(this.loggedInUserId).pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap((teacher: any) => {
        this.selectedClass = teacher.classTeacher;
        return this.leaveService.getLeavesByClass(this.selectedClass);
      })
    ).subscribe({
      next: (leaves) => {
        this.allLeaves = leaves;
        this.sortAndFilterLeaves();
      },
      error: (error: any) => {
        console.error('Error fetching teacher details or leaves:', error);
      }
    });
  }

  loadLeaves(className: string): void {
    this.selectedClass = className;
    if (className === 'all') {
      this.leaveService.getAllLeaves().pipe(
        takeUntil(this.ngUnsubscribe)
      ).subscribe({
        next: (leaves) => {
          this.allLeaves = leaves;
          this.sortAndFilterLeaves();
          localStorage.removeItem('lastSelectedClass'); // Optionally remove last selected class
        },
        error: (error) => {
          console.error('Error loading all leaves:', error);
          Swal.fire('Error!', 'Failed to load all leave applications.', 'error');
        }
      });
    } else {
      this.leaveService.getLeavesByClass(className).pipe(
        takeUntil(this.ngUnsubscribe)
      ).subscribe({
        next: (leaves) => {
          this.allLeaves = leaves;
          this.sortAndFilterLeaves();
          localStorage.setItem('lastSelectedClass', className);
        },
        error: (error) => {
          console.error(`Error loading leaves for class ${className}:`, error);
          Swal.fire('Error!', `Failed to load leave applications for class ${className}.`, 'error');
        }
      });
    }
  }

  sortAndFilterLeaves(): void {
    this.filteredLeaves = this.allLeaves.sort((a, b) => {
      const dateA = new Date(a.leaveDate);
      const dateB = new Date(b.leaveDate);
      return dateB.getTime() - dateA.getTime();
    }).filter((leave) => {
      const classFilter = this.selectedClass === 'all' || leave.className === this.selectedClass;
      let dateFilter = true;
      if (this.selectedDate) {
        const selectedDateObject = new Date(this.selectedDate);
        const year = selectedDateObject.getFullYear();
        const month = (selectedDateObject.getMonth() + 1).toString().padStart(2, '0');
        const day = selectedDateObject.getDate().toString().padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        dateFilter = leave.leaveDate === formattedSelectedDate;
      }
      const studentIdFilter = !this.studentIdFilter || leave.studentId.toLowerCase().includes(this.studentIdFilter.toLowerCase());
      return classFilter && dateFilter && studentIdFilter;
    });
  }

  onClassSelect(selectedClass: string): void {
    this.loadLeaves(selectedClass);
  }

  onDateSelect(): void {
    this.sortAndFilterLeaves();
  }

  onStudentIdInput(): void {
    this.sortAndFilterLeaves();
  }

  clearFilter(): void {
    this.selectedDate = '';
    this.studentIdFilter = '';
    this.selectedClass = localStorage.getItem('lastSelectedClass') ? localStorage.getItem('lastSelectedClass')! : 'all';
    this.loadLeaves(this.selectedClass);
  }

  deleteAllFilteredLeaves(): void {
    if (this.filteredLeaves.length === 0) {
      Swal.fire('Info', 'No leaves are currently filtered to delete.', 'info');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `You want to delete all ${this.filteredLeaves.length} leave applications?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all!',
    }).then((result) => {
      if (result.isConfirmed) {
        from(this.filteredLeaves).pipe(
          concatMap(leave => this.leaveService.deleteLeaveById(leave.id)),
          takeUntil(this.ngUnsubscribe)
        ).subscribe({
          next: (response) => {
            console.log('Leave deleted:', response);
          },
          complete: () => {
            Swal.fire(
              'Deleted!',
              'All filtered leave applications deleted successfully.',
              'success'
            );
            this.loadLeaves(this.selectedClass);
          },
          error: (error) => {
            console.error('Error deleting leaves:', error);
            Swal.fire(
              'Error!',
              'Failed to delete one or more leave applications.',
              'error'
            );
            this.loadLeaves(this.selectedClass);
          }
        });
      }
    });
  }

  deleteLeave(leaveId: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this leave application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.leaveService.deleteLeaveById(leaveId).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: (response) => {
            Swal.fire(
              'Deleted!',
              response,
              'success'
            );
            this.loadLeaves(this.selectedClass);
          },
          error: (error) => {
            console.error('Error deleting leave:', error);
            Swal.fire(
              'Error!',
              'Failed to delete the leave application.',
              'error'
            );
          }
        });
      }
    });
  }
}