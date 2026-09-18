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

  it('renders untimed entries using Period N and no time range', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ periodNumber: 4, startTime: null as any, endTime: null as any }),
    ]));
    const component = build();
    component.ngOnInit();
    const entry = component.todayView.upcoming[0];
    expect(component.periodClassLabel(entry)).toBe('Period 4 · Class X');
    expect(component.classTimeRange(entry)).toBeNull();
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

  // ─── Show Time parity — a per-device viewer preference, not a school/admin setting ───

  describe('show-times preference (shared localStorage key with the Timetable page)', () => {
    afterEach(() => localStorage.removeItem('tt_showTimes'));

    it('A: show times ON (the default) renders a valid time range', () => {
      localStorage.removeItem('tt_showTimes'); // unset == on
      timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ startTime: '09:10', endTime: '09:50' })]));
      const component = build();
      component.ngOnInit();
      expect(component.showTimes).toBeTrue();
      expect(component.classTimeRange(component.todayView.current!)).toBe('9:10 AM – 9:50 AM');
    });

    it('B: show times OFF suppresses the time range entirely (never renders a placeholder)', () => {
      localStorage.setItem('tt_showTimes', 'false');
      timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ startTime: '09:10', endTime: '09:50' })]));
      const component = build();
      component.ngOnInit();
      expect(component.showTimes).toBeFalse();
      expect(component.classTimeRange(component.todayView.current!)).toBeNull();
    });

    it('C: show times OFF still allows internal current/next classification using real start/end times', () => {
      localStorage.setItem('tt_showTimes', 'false');
      timetableService.getTeacherTimetable.and.returnValue(of([
        timetableEntry({ id: 1, startTime: '09:10', endTime: '09:50' }), // covers mocked "now" 09:30
        timetableEntry({ id: 2, startTime: '10:00', endTime: '10:40', className: 'IX' }),
      ]));
      const component = build();
      component.ngOnInit();
      expect(component.todayView.current?.key).toBe('1');
      expect(component.todayView.upcoming[0].key).toBe('2');
    });

    it('D: re-enabling show times (new component instance) renders the time again', () => {
      timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ startTime: '09:10', endTime: '09:50' })]));

      localStorage.setItem('tt_showTimes', 'false');
      const off = build();
      off.ngOnInit();
      expect(off.classTimeRange(off.todayView.current!)).toBeNull();

      localStorage.setItem('tt_showTimes', 'true');
      const on = build();
      on.ngOnInit();
      expect(on.classTimeRange(on.todayView.current!)).toBe('9:10 AM – 9:50 AM');
    });

    it('N: the preference is read synchronously at construction, so it can never briefly show times before the real value is known', () => {
      localStorage.setItem('tt_showTimes', 'false');
      const component = build(); // showTimes is already correct before ngOnInit or any subscription resolves
      expect(component.showTimes).toBeFalse();
    });
  });

  // ─── Period number + subject icon — reused from the existing timetable, never hidden ───

  it('E/F: period number renders and remains visible regardless of the show-times preference', () => {
    localStorage.setItem('tt_showTimes', 'false');
    timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ periodNumber: 3, startTime: '09:10', endTime: '09:50' })]));
    const component = build();
    component.ngOnInit();
    expect(component.periodClassLabel(component.todayView.current!)).toBe('Period 3 · Class X');
    localStorage.removeItem('tt_showTimes');
  });

  it('G: reuses the existing timetable subject-icon mapping rather than a separate one', () => {
    const component = build();
    expect(component.getSubjectIcon('Physics')).toBe('⚛️');
    expect(component.getSubjectIcon('Mathematics')).toBe('🔢');
    expect(component.getSubjectIcon('Something Unmapped')).toBe('📚');
  });

  it('H: a missing/zero period number still degrades cleanly (no crash, no invented label)', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ periodNumber: 0 as any })]));
    const component = build();
    component.ngOnInit();
    const entry = component.todayView.current!; // default times (09:10-09:50) cover mocked "now" 09:30
    expect(() => component.periodClassLabel(entry)).not.toThrow();
    expect(component.periodClassLabel(entry)).toBe('Period 0 · Class X');
  });

  it('I/J: an untimed entry follows Period N behaviour and is never classified Current', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ id: 1, periodNumber: 2, startTime: null as any, endTime: null as any }),
    ]));
    const component = build();
    component.ngOnInit();
    expect(component.todayView.current).toBeNull();
    expect(component.todayView.upcoming[0].status).toBe('scheduled');
  });

  it('K: current/next/later classification and labels remain correct with the new row layout', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ id: 1, startTime: '09:10', endTime: '09:50' }), // current at mocked 09:30
      timetableEntry({ id: 2, startTime: '10:00', endTime: '10:40' }),
      timetableEntry({ id: 3, startTime: '11:00', endTime: '11:40' }),
    ]));
    const component = build();
    component.ngOnInit();
    expect(component.todayView.current?.key).toBe('1');
    expect(component.todayView.upcoming.map(e => e.key)).toEqual(['2', '3']);
  });

  it('L: the visible list is still capped at 3 rows total (current + upcoming)', () => {
    timetableService.getTeacherTimetable.and.returnValue(of([
      timetableEntry({ id: 1, startTime: '09:10', endTime: '09:50' }),
      timetableEntry({ id: 2, startTime: '10:00', endTime: '10:40' }),
      timetableEntry({ id: 3, startTime: '11:00', endTime: '11:40' }),
      timetableEntry({ id: 4, startTime: '12:00', endTime: '12:40' }),
    ]));
    const component = build();
    component.ngOnInit();
    expect(1 + component.todayView.upcoming.length).toBeLessThanOrEqual(3);
  });

  it('M: empty/error/completed states remain intact', () => {
    const component = build();
    component.ngOnInit();
    expect(component.todayView.hasAnyToday).toBeFalse(); // no timetable / no classes today

    timetableService.getTeacherTimetable.and.returnValue(of([timetableEntry({ startTime: '08:00', endTime: '08:40' })]));
    component.retryTodayClasses();
    expect(component.todayView.allDone).toBeTrue(); // completed (mocked "now" 09:30 is after 08:40)

    timetableService.getTeacherTimetable.and.returnValue(throwError(() => ({ error: { message: 'boom' } })));
    component.retryTodayClasses();
    expect(component.todayClassesError).toBe('boom');
  });
});
