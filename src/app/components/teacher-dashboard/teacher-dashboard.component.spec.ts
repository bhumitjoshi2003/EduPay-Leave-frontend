import { of, throwError } from 'rxjs';
import { TeacherDashboardComponent } from './teacher-dashboard.component';
import { TimetableEntry } from '../../interfaces/timetable';

describe('TeacherDashboardComponent today classes', () => {
  let authState: any;
  let teacherService: any;
  let studentService: any;
  let attendanceService: any;
  let leaveService: any;
  let cdr: any;
  let logger: any;
  let toast: any;
  let checkinService: any;
  let teacherLeaveService: any;
  let timetableService: any;

  const build = () => new TeacherDashboardComponent(
    authState, teacherService, studentService, attendanceService, leaveService,
    logger, cdr, toast, checkinService, teacherLeaveService, timetableService
  );

  const timetableEntry = (overrides: Partial<TimetableEntry> = {}): TimetableEntry => ({
    id: 1, className: 'X', sectionName: null, day: 'THURSDAY', periodNumber: 1,
    startTime: '09:10', endTime: '09:50', subjectName: 'English', teacherId: 'T1',
    ...overrides,
  });

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 17, 9, 30, 0));
    authState = jasmine.createSpyObj('AuthStateService', ['getUser', 'hasFeature']);
    authState.getUser.and.returnValue({ userId: 'T1' });
    authState.hasFeature.and.returnValue(false);
    teacherService = jasmine.createSpyObj('TeacherService', ['getTeacher']);
    teacherService.getTeacher.and.returnValue(of({ name: 'Ms Rao', classTeacher: null }));
    studentService = jasmine.createSpyObj('StudentService', ['getActiveStudentsByClass']);
    attendanceService = jasmine.createSpyObj('AttendanceService', ['getAttendanceByDateAndClass', 'getClassSummary']);
    leaveService = jasmine.createSpyObj('LeaveService', ['getLeavesPaginated', 'updateLeaveStatus']);
    logger = jasmine.createSpyObj('LoggerService', ['error']);
    cdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'info', 'error']);
    checkinService = jasmine.createSpyObj('TeacherCheckinService', ['getMyAttendance']);
    checkinService.getMyAttendance.and.returnValue(of({
      totalWorkingDays: 0, presentDays: 0, lateDays: 0, absentDays: 0,
      halfDayDays: 0, onLeaveDays: 0, onTimePercentage: 0,
      attendancePercentage: 0, trackingStartDate: null, records: [],
    }));
    teacherLeaveService = jasmine.createSpyObj('TeacherLeaveService', ['getMyLeaves']);
    teacherLeaveService.getMyLeaves.and.returnValue(of({ content: [], totalElements: 0, totalPages: 0 }));
    timetableService = jasmine.createSpyObj('TimetableService', ['getTeacherTimetable']);
    timetableService.getTeacherTimetable.and.returnValue(of([]));
  });

  afterEach(() => jasmine.clock().uninstall());

  it('reuses the teacher timetable API and builds the current/next view', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ id: 1, startTime: '09:10', endTime: '09:50' }),
      timetableEntry({ id: 2, startTime: '10:00', endTime: '10:40', className: 'IX' }),
    ]));
    const component = build();
    component.ngOnInit();
    expect(timetableService.getTeacherTimetable).toHaveBeenCalledWith('T1');
    expect(component.todayView.current?.key).toBe('1');
    expect(component.todayView.upcoming[0].key).toBe('2');
  });

  it('renders untimed entries using Period N', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ periodNumber: 4, startTime: null as any, endTime: null as any }),
    ]));
    const component = build();
    component.ngOnInit();
    expect(component.classTimeLabel(component.todayView.upcoming[0])).toBe('Period 4');
  });

  it('distinguishes no timetable from no classes today and completed classes', () => {
    const component = build();
    component.ngOnInit();
    expect(component.timetableEntries).toEqual([]);
    expect(component.todayView.hasAnyToday).toBeFalse();

    timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ day: 'MONDAY' })]));
    component.retryTodayClasses();
    expect(component.timetableEntries.length).toBe(1);
    expect(component.todayView.hasAnyToday).toBeFalse();

    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ startTime: '08:00', endTime: '08:40' }),
    ]));
    component.retryTodayClasses();
    expect(component.todayView.allDone).toBeTrue();
  });

  it('shows an isolated timetable error and Retry reloads only timetable data', () => {
    timetableService.getTeacherTimetable.and.returnValue(throwError(() => ({ error: { message: 'Timetable unavailable.' } })));
    const component = build();
    component.ngOnInit();
    expect(component.todayClassesError).toBe('Timetable unavailable.');
    expect(component.isLoading).toBeFalse();
    expect(component.teacherName).toBe('Ms Rao');

    timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry()]));
    component.retryTodayClasses();
    expect(component.todayClassesError).toBeNull();
    expect(timetableService.getTeacherTimetable).toHaveBeenCalledTimes(2);
    expect(teacherService.getTeacher).toHaveBeenCalledTimes(1);
  });

  it('keeps existing class-teacher dashboard loading independent', () => {
    teacherService.getTeacher.and.returnValue(of({ name: 'Mr Shah', classTeacher: 'X' }));
    studentService.getActiveStudentsByClass.and.returnValue(of([{ studentId: 'S1' }]));
    attendanceService.getAttendanceByDateAndClass.and.returnValue(of([]));
    leaveService.getLeavesPaginated.and.returnValue(of({ content: [], totalElements: 0, totalPages: 0 }));
    attendanceService.getClassSummary.and.returnValue(of([]));
    const component = build();
    component.ngOnInit();
    expect(component.isClassTeacher).toBeTrue();
    expect(component.totalStudents).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('uses the existing timetable route for the dashboard action', () => {
    expect(build().timetableRoute).toBe('/dashboard/timetable');
  });
});
