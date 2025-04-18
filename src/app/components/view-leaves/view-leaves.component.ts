import { Component, OnInit, OnDestroy } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap, map, concatMap } from 'rxjs'; // Import concatMap and from
import { TeacherService } from '../../services/teacher.service';
import { jwtDecode } from 'jwt-decode';
import { StudentService } from '../../services/student.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2'; // Import SweetAlert
import { from } from 'rxjs'; // Import 'from'
import { ActivatedRoute } from '@angular/router';

interface LeaveApplication {
  id: string;
  studentId: string;
  name: string;
  leaveDate: string;
  reason: string;
  className: string;
}

interface Student {
  studentId: string;
  name: string;
}

@Component({
  selector: 'app-view-leaves',
  templateUrl: './view-leaves.component.html',
  styleUrls: ['./view-leaves.component.css'], // Using similar CSS
  imports: [CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule],
})
export class ViewLeavesComponent implements OnInit, OnDestroy {
  studentNameMap: Map<string, string> = new Map();
  loggedInUserRole: string = '';
  loggedInUserId: string = '';
  loggedInUserClass: string = '';
  allLeaves: LeaveApplication[] = [];
  filteredLeaves: LeaveApplication[] = [];
  userId: string = '';
  classList: string[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  ];
  selectedClass: string = '';
  selectedDate: any = ''; 
  studentIdFilter: string = ''; 
  private ngUnsubscribe = new Subject<void>();

  constructor(private route: ActivatedRoute, private leaveService: LeaveService, private studentService: StudentService, private authService: AuthService, private teacherService: TeacherService) { }

  ngOnInit(): void {
      this.route.params.subscribe(params => {
        const studentIdFromParams = params['studentId'];
        if (studentIdFromParams) {
          this.studentIdFilter = studentIdFromParams;
        }
      });
      this.loadInitialData();
  }

  loadInitialData(){
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.loggedInUserRole = decodedToken.role;
      this.loggedInUserId = decodedToken.userId;

      if (this.loggedInUserRole === 'ADMIN') {
        this.selectedClass = localStorage.getItem('lastSelectedClass') ? localStorage.getItem('lastSelectedClass')! : this.classList[0];
        this.loadLeavesAndStudentsForClass(this.selectedClass);
      } else if (this.loggedInUserRole === 'TEACHER') {
        this.getTeacherClassAndLoadLeavesAndStudents();
      }
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getTeacherClassAndLoadLeavesAndStudents(): void {
    this.teacherService.getTeacher(this.loggedInUserId).pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap((teacher: any) => {
        this.selectedClass = teacher.classTeacher;
        return this.studentService.getStudentsByClass(this.selectedClass);
      }),
      switchMap((students) => {
        this.createStudentNameMap(students);
        return this.leaveService.getLeavesByClass(this.selectedClass);
      }),
      map((leaves) => this.assignStudentNamesToLeaves(leaves))
    ).subscribe({
      next: (leavesWithNames) => {
        this.allLeaves = leavesWithNames;
        this.sortAndFilterLeaves();
      },
      error: (error: any) => {
        console.error('Error fetching teacher details or student/leaves:', error);
      }
    });
  }

  loadLeavesAndStudentsForClass(className: string): void {
    this.studentService.getStudentsByClass(className).pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap((students) => {
        this.createStudentNameMap(students);
        return this.leaveService.getLeavesByClass(className);
      }),
      map((leaves) => this.assignStudentNamesToLeaves(leaves))
    ).subscribe({
      next: (leavesWithNames) => {
        this.allLeaves = leavesWithNames;
        this.sortAndFilterLeaves();
        localStorage.setItem('lastSelectedClass', className);
      },
      error: (error) => {
        console.error(`Error loading leaves and students for class ${className}:`, error);
      }
    });
  }

  createStudentNameMap(students: Student[]): void {
    this.studentNameMap.clear();
    students.forEach(student => {
      this.studentNameMap.set(student.studentId, student.name);
    });
  }

  assignStudentNamesToLeaves(leaves: any[]): LeaveApplication[] {
    return leaves.map(leave => ({
      ...leave,
      name: this.studentNameMap.get(leave.studentId) || 'Unknown Student'
    }));
  }

  sortAndFilterLeaves(): void {
    this.filteredLeaves = this.allLeaves.sort((a, b) => {
      const dateA = new Date(a.leaveDate);
      const dateB = new Date(b.leaveDate);
      return dateB.getTime() - dateA.getTime();
    }).filter((leave) => {
      const classFilter = !this.selectedClass || leave.className === this.selectedClass;
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
    this.selectedClass = selectedClass;
    this.loadLeavesAndStudentsForClass(selectedClass);
  }

  onDateSelect(): void {
    this.sortAndFilterLeaves();
  }

  onStudentIdInput(): void {
    this.sortAndFilterLeaves();
  }

  clearFilter(): void {
    this.selectedDate = ''; // Reset the selected date
    this.studentIdFilter = ''; // Reset the student ID filter
    this.selectedClass = localStorage.getItem('lastSelectedClass') ? localStorage.getItem('lastSelectedClass')! : this.classList[0]; // Reset to the last selected or default class
    this.loadLeavesAndStudentsForClass(this.selectedClass); // Reload data for the default/last selected class
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
            console.log('Leave deleted:', response); // Optional: Log success
          },
          complete: () => {
            Swal.fire(
              'Deleted!',
              'All filtered leave applications deleted successfully.',
              'success'
            );
            this.loadLeavesAndStudentsForClass(this.selectedClass); // Reload leaves after deletion
          },
          error: (error) => {
            console.error('Error deleting leaves:', error);
            Swal.fire(
              'Error!',
              'Failed to delete one or more leave applications.',
              'error'
            );
            this.loadLeavesAndStudentsForClass(this.selectedClass); // Still reload to reflect any successful deletions
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
            this.loadLeavesAndStudentsForClass(this.selectedClass);
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