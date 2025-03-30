import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { StudentService } from '../../services/student.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import Swal from 'sweetalert2';
import { AttendanceData } from '../../interfaces/atendance-data';
import { AttendanceService } from '../../services/attendance.service';

interface Student {
  studentId: string;
  name: string;
  absent: boolean;
  chargePaid: boolean;
}

@Component({
  selector: 'app-teacher-attendance',
  imports: [FormsModule, HttpClientModule,
    CommonModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,],
  templateUrl: './teacher-attendance.component.html',
  styleUrl: './teacher-attendance.component.css',
})
export class TeacherAttendanceComponent implements OnInit {
  students: Student[] = [];
  leaves: string[] = [];
  attendanceDate: Date = new Date();
  selectedClass: string = '1';
  absentStudents: string[] = [];

  constructor(
    private leaveService: LeaveService,
    private studentService: StudentService,
    private attendanceService: AttendanceService 
  ) {}

  ngOnInit(): void {
    this.loadStudents();
    this.loadLeaves();
  }

  loadStudents(): void {
    this.studentService.getStudentsByClass(this.selectedClass).subscribe((studentLeaveDTOs) => {
      this.students = studentLeaveDTOs.map((dto) => ({
        studentId: dto.studentId,
        name: dto.name,
        absent: false,
        chargePaid: true,
      }));
    });
  }

  loadLeaves(): void {
    const formattedDate = this.attendanceDate.toISOString().split('T')[0];

    this.attendanceService.getAttendanceByDateAndClass(formattedDate, this.selectedClass).subscribe((attendanceData) => {
      if (attendanceData && attendanceData.length > 0) {
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
        console.log("leave");
        this.leaveService.getLeavesByDateAndClass(formattedDate, this.selectedClass).subscribe((leaves) => {
          this.absentStudents = leaves;

          this.students.forEach((student) => {
            if (this.absentStudents.includes(student.studentId)) {
              student.absent = true;
            } else {
              student.absent = false;
              student.chargePaid = true;
            }
          });
        });
      }
    });
  }

  markAbsent(studentId: string): void {
    const student = this.students.find((s) => s.studentId === studentId);
    if (student) {
      student.absent = true;
      if (this.absentStudents.includes(student.studentId)) student.chargePaid = true;
      else student.chargePaid = false;
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
        this.attendanceDate = adjustedDate;
        this.loadLeaves();
    }
  }

  saveAttendance(): void {
    const attendanceData: AttendanceData[] = this.students
      .filter((student) => student.absent)
      .map((student) => ({
        studentId: student.studentId,
        chargePaid: student.chargePaid,
        absentDate: this.attendanceDate.toISOString().split('T')[0],
        className: this.selectedClass,
      }));

    attendanceData.push({
      studentId: 'X',
      chargePaid: true, 
      absentDate: this.attendanceDate.toISOString().split('T')[0],
      className: this.selectedClass,
    });

    const formattedDate = this.attendanceDate.toISOString().split('T')[0];
    this.attendanceService.saveAttendance(attendanceData).subscribe({
      next: () => {
        Swal.fire({
          title: 'Attendance Saved!',
          text: 'Attendance data saved successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        console.error('Error saving attendance:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to save attendance. Please try again.',
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      },
    });
  }
}