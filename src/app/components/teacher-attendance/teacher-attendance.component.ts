import { Component, HostListener, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { StudentService } from '../../services/student.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import Swal from 'sweetalert2';
import { AttendanceData } from '../../interfaces/atendance-data';
import { AttendanceService } from '../../services/attendance.service';
import { jwtDecode } from 'jwt-decode';
import { TeacherService } from '../../services/teacher.service';

interface Student {
  studentId: string;
  name: string;
  absent: boolean;
  chargePaid: boolean;
}

@Component({
  selector: 'app-teacher-attendance',
  imports: [
    FormsModule,
    CommonModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './teacher-attendance.component.html',
  styleUrl: './teacher-attendance.component.css',
})
export class TeacherAttendanceComponent implements OnInit {
  students: Student[] = [];
  attendanceDate: Date = new Date();
  selectedClass: string = '';
  absentStudents: string[] = [];

  teacherId: string = '';
  disableDeleteButton: boolean = false;

  constructor(
    private leaveService: LeaveService,
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private teacherService: TeacherService
  ) { }

  ngOnInit(): void {
    this.attendanceDate = this.getTodayDateWithoutTime();
    this.getTeacherId();
  }

  getTodayDateWithoutTime(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  getTeacherId(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.teacherId = decodedToken.userId;
      this.teacherService.getTeacher(this.teacherId).subscribe({
        next: (teacher: any) => {
          this.selectedClass = teacher.classTeacher;
          this.loadStudentsAndApplyAttendance();
        },
        error: (error: any) => {
          console.error('Error fetching teacher details:', error);
          Swal.fire('Error', 'Failed to fetch teacher details.', 'error');
        },
      });
    } else {
      Swal.fire('Error', 'Authentication token not found. Please login.', 'error');
    }
  }

  loadStudentsAndApplyAttendance(): void {
    if (this.isSunday(this.attendanceDate)) {
      this.students = [];
      return;
    }

    this.studentService.getActiveStudentsByClass(this.selectedClass).subscribe({
      next: (studentLeaveDTOs) => {
        this.students = studentLeaveDTOs.map((dto) => ({
          studentId: dto.studentId,
          name: dto.name,
          absent: false,
          chargePaid: true,
        }));
        this.applyAttendanceAndLeavesToStudents();
      },
      error: (error) => {
        console.error('Error loading students:', error);
        Swal.fire('Error', 'Failed to load students for the class.', 'error');
      },
    });
  }

  applyAttendanceAndLeavesToStudents(): void {
    const formattedDate = formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en');

    this.attendanceService.getAttendanceByDateAndClass(formattedDate, this.selectedClass).subscribe({
      next: (attendanceData) => {
        if (attendanceData && attendanceData.length === 0) {
          this.disableDeleteButton = true;
        }
        if (attendanceData && attendanceData.length > 0) {
          this.disableDeleteButton = false;
          const attendanceMap = new Map<string, AttendanceData>();
          attendanceData.forEach((attendance) => {
            attendanceMap.set(attendance.studentId, attendance);
          });

          this.students.forEach((student) => {
            const attendance = attendanceMap.get(student.studentId);
            if (attendance) {
              student.absent = true;
              student.chargePaid = attendance.chargePaid;
            } else {
              student.absent = false;
              student.chargePaid = true;
            }
          });
        } else {
          this.leaveService.getLeavesByDateAndClass(formattedDate, this.selectedClass).subscribe({
            next: (leaves) => {
              this.absentStudents = leaves;
              this.students.forEach((student) => {
                if (this.absentStudents.includes(student.studentId)) {
                  student.absent = true;
                  student.chargePaid = true;
                } else {
                  student.absent = false;
                  student.chargePaid = true;
                }
              });
            },
            error: (error) => {
              console.warn('No leaves found or error fetching leaves:', error);
            },
          });
        }
      },
      error: (error) => {
        console.error('Error loading attendance data:', error);
        this.leaveService.getLeavesByDateAndClass(formattedDate, this.selectedClass).subscribe({
          next: (leaves) => {
            this.absentStudents = leaves;
            this.students.forEach((student) => {
              if (this.absentStudents.includes(student.studentId)) {
                student.absent = true;
                student.chargePaid = true;
              } else {
                student.absent = false;
                student.chargePaid = true;
              }
            });
          },
          error: (leavesError) => {
            console.error('Error loading leaves after attendance failed:', leavesError);
            Swal.fire('Error', 'Failed to load attendance or leave data.', 'error');
          },
        });
      },
    });
  }

  markAbsent(studentId: string): void {
    const student = this.students.find((s) => s.studentId === studentId);
    if (student) {
      student.absent = true;
      student.chargePaid = this.absentStudents.includes(student.studentId);
    }
  }

  markPresent(studentId: string): void {
    const student = this.students.find((s) => s.studentId === studentId);
    if (student) {
      student.absent = false;
      student.chargePaid = true;
    }
  }

  onDateChange(event: any): void {
    const selectedDate = event.value;
    if (selectedDate) {
      const offset = selectedDate.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(selectedDate.getTime() - offset);
      adjustedDate.setHours(0, 0, 0, 0);
      this.attendanceDate = adjustedDate;

      this.loadStudentsAndApplyAttendance();
    }
  }

  saveAttendance(): void {
    Swal.fire({
      title: 'Confirm Save',
      text: 'Are you sure you want to save the attendance?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        const attendanceData: AttendanceData[] = this.students
          .filter((student) => student.absent)
          .map((student) => ({
            studentId: student.studentId,
            chargePaid: student.chargePaid,
            date: formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en'),
            className: this.selectedClass,
          }));

        attendanceData.push({
          studentId: 'X',
          chargePaid: true,
          date: formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en'),
          className: this.selectedClass,
        });

        this.attendanceService.saveAttendance(attendanceData).subscribe({
          next: () => {
            Swal.fire({
              title: 'Attendance Saved!',
              text: 'Attendance data saved successfully.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.applyAttendanceAndLeavesToStudents();
          },
          error: (error) => {
            console.error('Error saving attendance:', error);
            Swal.fire({
              title: 'Error!',
              text: error.error || 'Failed to save attendance. Please try again.',
              icon: 'error',
              timer: 2000,
              showConfirmButton: false,
            });
          },
        });
      }
    });
  }

  isDateWithinAllowedRange(): boolean {
    const today = this.getTodayDateWithoutTime();
    const selected = new Date(this.attendanceDate);
    selected.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return selected.getTime() === today.getTime() || selected.getTime() === yesterday.getTime();
  }

  getRelativeDate(offset: number): string {
    const date = this.getTodayDateWithoutTime();
    date.setDate(date.getDate() + offset);
    return formatDate(date, 'yyyy-MM-dd', 'en');
  }

  isSunday(date: Date | null): boolean {
    return date ? new Date(date).getDay() === 0 : false;
  }

  deleteAttendance(): void {
    if (!this.isDateWithinAllowedRange()) {
      Swal.fire('Not Allowed', 'You can only delete attendance for today or yesterday.', 'warning');
      return;
    }

    if (this.isSunday(this.attendanceDate)) {
      Swal.fire('Invalid Date', 'Cannot delete attendance for Sundays.', 'info');
      return;
    }

    Swal.fire({
      title: 'Confirm Deletion',
      text: 'Are you sure you want to delete the attendance for this date?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        const formattedDate = formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en');
        this.attendanceService.deleteAttendanceByDateAndClass(formattedDate, this.selectedClass).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Attendance has been deleted.', 'success');
            this.loadStudentsAndApplyAttendance(); // refresh the student list
          },
          error: (error) => {
            console.error('Error deleting attendance:', error);
            Swal.fire('Error', error.error || 'Failed to delete attendance.', 'error');
          },
        });
      }
    });
  }

}