import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { LeaveService } from '../../services/leave.service';
import { StudentService } from '../../services/student.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { ToastService } from '../../services/toast.service';
import { AttendanceData } from '../../interfaces/atendance-data';
import { AttendanceService } from '../../services/attendance.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { TeacherService } from '../../services/teacher.service';
import { Subject, takeUntil } from 'rxjs';
import { SchoolService, SchoolClass } from '../../services/school.service';
import { SectionService } from '../../services/section.service';
import { Section } from '../../interfaces/section';
import { SchoolHolidayService } from '../../services/school-holiday.service';

interface Student {
  studentId: string;
  name: string;
  absent: boolean;
  chargePaid: boolean;
  status: 'ABSENT' | 'HALF_DAY' | 'LATE' | 'EXCUSED';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAttendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  students: Student[] = [];
  attendanceDate: Date = new Date();
  selectedClass: string = '';
  absentStudents: string[] = [];

  teacherId: string = '';
  disableDeleteButton: boolean = false;
  loggedInUserRole: string = '';
  hasStudents: boolean = false;

  classList: string[] = [];
  managedClasses: SchoolClass[] = [];
  sections: Section[] = [];
  selectedSectionId: number | null = null;

  constructor(
    private leaveService: LeaveService,
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private teacherService: TeacherService,
    private authStateService: AuthStateService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private schoolService: SchoolService,
    private toast: ToastService,
    private sectionService: SectionService,
    private holidayService: SchoolHolidayService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.attendanceDate = this.getTodayDateWithoutTime();
    this.schoolService.getManagedClasses().pipe(takeUntil(this.destroy$)).subscribe({
      next: classes => { this.managedClasses = classes; },
      error: (err) => this.logger.error('Failed to load managed classes', err)
    });
    this.getUserRoleAndLoadData();
  }

  getTodayDateWithoutTime(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  getUserRoleAndLoadData(): void {
    const user = this.authStateService.getUser();

    if (user) {
      this.loggedInUserRole = user.role;
      this.teacherId = user.userId;

      if (this.loggedInUserRole === 'ADMIN') {
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => {
            this.classList = classes;
            this.selectedClass = localStorage.getItem('lastSelectedClass') || this.classList[0];
            this.cdr.markForCheck();
            if (this.selectedClass) this.loadSectionsForClass(this.selectedClass);
            this.loadStudentsAndApplyAttendance();
          },
          error: (err) => {
            this.logger.error('Failed to load classes:', err);
            this.toast.error('Error', 'Failed to load class list.');
          }
        });
      } else {
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => { this.classList = classes; this.cdr.markForCheck(); },
          error: (err) => {
            this.logger.error('Failed to load classes:', err);
            this.toast.error('Error', 'Failed to load class list.');
          }
        });
        this.getTeacherClassAndLoadStudents();
      }
    }
  }


  getTeacherClassAndLoadStudents(): void {
    this.teacherService.getTeacher(this.teacherId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (teacher: any) => {
        this.selectedClass = teacher.classTeacher;
        this.loadStudentsAndApplyAttendance();
      },
      error: () => {
        this.toast.error('Error', 'Failed to fetch teacher details.');
      },
    });
  }

  onClassSelect(selectedClass: string): void {
    this.selectedClass = selectedClass;
    this.selectedSectionId = null;
    this.sections = [];
    localStorage.setItem('lastSelectedClass', selectedClass);
    this.loadSectionsForClass(selectedClass);
    this.loadStudentsAndApplyAttendance();
  }

  loadSectionsForClass(className: string): void {
    const cls = this.managedClasses.find(c => c.name === className);
    if (!cls) return;
    this.sectionService.getSectionsForClass(cls.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: sections => { this.sections = sections; this.cdr.markForCheck(); },
      error: (err) => this.logger.error('Failed to load sections', err)
    });
  }

  onSectionSelect(sectionId: number | null): void {
    this.selectedSectionId = sectionId;
    this.loadStudentsAndApplyAttendance();
  }

  loadStudentsAndApplyAttendance(): void {
    if (this.isSunday(this.attendanceDate)) {
      this.students = [];
      this.cdr.markForCheck();
      return;
    }

    const dateStr = formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en');
    this.holidayService.getHolidaysByRange(dateStr, dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (holidays) => {
          if (holidays.length > 0) {
            const holidayName = holidays[0].name;
            const confirmed = await this.toast.confirm({
              title: 'Holiday: ' + holidayName,
              message: `This date is marked as a holiday (${holidayName}). Do you still want to mark attendance?`,
              confirmText: 'Yes, continue',
              cancelText: 'Cancel',
            });
            if (!confirmed) {
              this.students = [];
              this.hasStudents = false;
              this.cdr.markForCheck();
              return;
            }
          }
          this.doLoadStudents();
        },
        error: () => {
          // If holiday check fails, proceed anyway
          this.doLoadStudents();
        }
      });
  }

  private doLoadStudents(): void {
    const classAtRequest = this.selectedClass;
    const dateAtRequest = this.attendanceDate;

    const secId = this.selectedSectionId ?? undefined;
    this.studentService.getActiveStudentsByClass(classAtRequest, secId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (studentLeaveDTOs) => {
        if (this.selectedClass !== classAtRequest || this.attendanceDate !== dateAtRequest) return;
        this.students = studentLeaveDTOs.map((dto) => ({
          studentId: dto.studentId,
          name: dto.name,
          absent: false,
          chargePaid: true,
          status: 'ABSENT' as const,
        }));
        this.hasStudents = this.students.length > 0;
        this.cdr.markForCheck();
        this.applyAttendanceAndLeavesToStudents();
      },
      error: (error) => {
        this.logger.error('Error loading students:', error);
        this.toast.error('Error', 'Failed to load students.');
      },
    });
  }

  applyAttendanceAndLeavesToStudents(): void {
    const formattedDate = formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en');
    const classAtRequest = this.selectedClass;
    const dateAtRequest = this.attendanceDate;

    this.attendanceService.getAttendanceByDateAndClass(formattedDate, classAtRequest).pipe(takeUntil(this.destroy$)).subscribe({
      next: (attendanceData) => {
        if (this.selectedClass !== classAtRequest || this.attendanceDate !== dateAtRequest) return;
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
              student.status = attendance.status as Student['status'] || 'ABSENT';
            } else {
              student.absent = false;
              student.chargePaid = true;
              student.status = 'ABSENT';
            }
          });
          this.cdr.markForCheck();
        } else {
          this.leaveService.getLeavesByDateAndClass(formattedDate, classAtRequest).pipe(takeUntil(this.destroy$)).subscribe({
            next: (leaves) => {
              if (this.selectedClass !== classAtRequest || this.attendanceDate !== dateAtRequest) return;
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
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.logger.error('No leaves found or error fetching leaves:', error);
            },
          });
        }
      },
      error: (error) => {
        this.logger.error('Error loading attendance data:', error);
        this.leaveService.getLeavesByDateAndClass(formattedDate, classAtRequest).pipe(takeUntil(this.destroy$)).subscribe({
          next: (leaves) => {
            if (this.selectedClass !== classAtRequest || this.attendanceDate !== dateAtRequest) return;
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
            this.cdr.markForCheck();
          },
          error: (leavesError) => {
            this.logger.error('Error loading leaves after attendance failed:', leavesError);
            this.toast.error('Error', 'Failed to load attendance or leave data.');
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
      student.status = 'ABSENT';
    }
  }

  markPresent(studentId: string): void {
    const student = this.students.find((s) => s.studentId === studentId);
    if (student) {
      student.absent = false;
      student.chargePaid = true;
      student.status = 'ABSENT';
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

  async saveAttendance(): Promise<void> {
    const confirmed = await this.toast.confirm({
      title: 'Save Attendance',
      message: `You are about to save attendance for ${this.students.length} students. Are you sure?`,
      icon: 'question',
      confirmText: 'Yes, Save',
      cancelText: 'Cancel',
      danger: false,
    });
    if (!confirmed) return;

    const attendanceData: AttendanceData[] = this.students
      .filter((student) => student.absent)
      .map((student) => ({
        studentId: student.studentId,
        chargePaid: student.chargePaid,
        date: formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en'),
        className: this.selectedClass,
        status: student.status,
      }));

    attendanceData.push({
      studentId: 'X',
      chargePaid: true,
      date: formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en'),
      className: this.selectedClass,
      status: 'ABSENT',
    });

    this.attendanceService.saveAttendance(attendanceData).subscribe({
      next: () => {
        this.toast.success('Attendance Saved!', 'Attendance data saved successfully.');
        this.applyAttendanceAndLeavesToStudents();
      },
      error: (error) => {
        this.logger.error('Error saving attendance:', error);
        this.toast.error('Error!', error.error || 'Failed to save attendance. Please try again.');
      },
    });
  }

  isDateWithinAllowedRange(): boolean {
    if (this.loggedInUserRole === 'ADMIN') { return true; }

    const today = this.getTodayDateWithoutTime();
    const selected = new Date(this.attendanceDate);
    selected.setHours(0, 0, 0, 0);

    const pastLimit = new Date(today);
    pastLimit.setDate(today.getDate() - 3);

    return selected >= pastLimit && selected <= today;
  }

  getRelativeDate(offset: number): string {
    const date = this.getTodayDateWithoutTime();
    date.setDate(date.getDate() + offset);
    return formatDate(date, 'yyyy-MM-dd', 'en');
  }

  trackByStudentId(index: number, student: Student): string { return student.studentId; }
  trackByClass(index: number, className: string): string { return className; }

  isSunday(date: Date | null): boolean {
    return date ? new Date(date).getDay() === 0 : false;
  }

  deleteAttendance(): void {
    if (!this.isDateWithinAllowedRange()) {
      this.toast.warning('Not Allowed', 'You can only delete attendance for today or yesterday.');
      return;
    }

    if (this.isSunday(this.attendanceDate)) {
      this.toast.info('Invalid Date', 'Cannot delete attendance for Sundays.');
      return;
    }

    this.toast.confirm({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete the attendance for this date?',
      icon: 'warning',
      confirmText: 'Yes, delete it!',
      cancelText: 'Cancel',
      danger: true,
    }).then((confirmed) => {
      if (confirmed) {
        const formattedDate = formatDate(this.attendanceDate, 'yyyy-MM-dd', 'en');
        this.attendanceService.deleteAttendanceByDateAndClass(formattedDate, this.selectedClass).subscribe({
          next: () => {
            this.toast.success('Deleted!', 'Attendance has been deleted.');
            this.loadStudentsAndApplyAttendance();
          },
          error: (error) => {
            this.logger.error('Error deleting attendance:', error);
            this.toast.error('Error', error.error || 'Failed to delete attendance.');
          },
        });
      }
    });
  }

}
