import {
  buildTodayClasses,
  buildTodayClassesView,
  TeacherTimetableEntryLike,
  todayDayCode,
} from './teacher-timetable-today.util';

describe('teacher today classes', () => {
  const at = (hour: number, minute: number) => new Date(2026, 8, 17, hour, minute, 0); // Thursday
  const entry = (overrides: Partial<TeacherTimetableEntryLike> = {}): TeacherTimetableEntryLike => ({
    id: 1,
    day: 'THURSDAY',
    className: 'X',
    sectionName: null,
    subjectName: 'English',
    periodNumber: 1,
    startTime: '09:10',
    endTime: '09:50',
    ...overrides,
  });

  it('filters entries to the current local weekday', () => {
    expect(todayDayCode(at(8, 0))).toBe('THURSDAY');
    expect(buildTodayClasses([
      entry({ id: 1 }), entry({ id: 2, day: 'FRIDAY' }),
    ], at(8, 0)).map(item => item.key)).toEqual(['1']);
  });

  it('detects current using startTime <= now < endTime and selects the next class', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, startTime: '09:10', endTime: '09:50' }),
      entry({ id: 2, startTime: '10:00', endTime: '10:40' }),
    ], at(9, 30));
    expect(view.current?.key).toBe('1');
    expect(view.upcoming.map(item => item.key)).toEqual(['2']);
  });

  it('shows the earliest upcoming class as next when nothing is current', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, startTime: '09:10', endTime: '09:50' }),
      entry({ id: 2, startTime: '10:00', endTime: '10:40' }),
    ], at(8, 0));
    expect(view.current).toBeNull();
    expect(view.upcoming[0].key).toBe('1');
  });

  it('sorts timed entries by actual startTime when period numbers conflict', () => {
    const view = buildTodayClassesView([
      entry({ id: 3, periodNumber: 3, startTime: '10:30', endTime: '11:10' }),
      entry({ id: 4, periodNumber: 4, startTime: '09:45', endTime: '10:25' }),
    ], at(7, 0));
    expect(view.upcoming.map(item => item.key)).toEqual(['4', '3']);
  });

  it('places every timed entry before untimed entries', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, periodNumber: 1, startTime: null, endTime: null }),
      entry({ id: 2, periodNumber: 5, startTime: '11:00', endTime: '11:40' }),
    ], at(7, 0));
    expect(view.upcoming.map(item => item.key)).toEqual(['2', '1']);
  });

  it('orders untimed entries by periodNumber and never marks them current', () => {
    const view = buildTodayClassesView([
      entry({ id: 5, periodNumber: 5, startTime: null, endTime: null }),
      entry({ id: 2, periodNumber: 2, startTime: null, endTime: null }),
    ], at(9, 30));
    expect(view.current).toBeNull();
    expect(view.upcoming.map(item => item.key)).toEqual(['2', '5']);
    expect(view.upcoming.every(item => item.status === 'scheduled')).toBeTrue();
  });

  it('treats invalid times as untimed scheduled entries', () => {
    const item = buildTodayClasses([entry({ startTime: 'not-a-time' })], at(9, 30))[0];
    expect(item.status).toBe('scheduled');
    expect(item.startTime).toBeNull();
  });

  it('limits the dashboard to three total rows including the current class', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, startTime: '09:00', endTime: '09:40' }),
      entry({ id: 2, startTime: '09:50', endTime: '10:30' }),
      entry({ id: 3, startTime: '10:40', endTime: '11:20' }),
      entry({ id: 4, startTime: '11:30', endTime: '12:10' }),
    ], at(9, 15));
    expect(view.current?.key).toBe('1');
    expect(view.upcoming.map(item => item.key)).toEqual(['2', '3']);
  });

  it('distinguishes no classes today from a completed day', () => {
    const noToday = buildTodayClassesView([entry({ day: 'MONDAY' })], at(12, 0));
    expect(noToday.hasAnyToday).toBeFalse();
    expect(noToday.allDone).toBeFalse();

    const complete = buildTodayClassesView([entry({ endTime: '09:50' })], at(12, 0));
    expect(complete.hasAnyToday).toBeTrue();
    expect(complete.allDone).toBeTrue();
  });

  // ─── Cover-class visibility — a substitution follows the same rules as any other
  //     period: once its time has passed, it's 'done' and drops off the list. ───

  it('a cover class whose period has already ended is not shown, same as a normal completed class', () => {
    const view = buildTodayClassesView([
      entry({ id: 9, startTime: '09:00', endTime: '09:40', isSubstitution: true, originalTeacherName: 'Mr Original' }),
    ], at(12, 0)); // well past 09:40

    expect(view.current).toBeNull();
    expect(view.upcoming).toEqual([]);
    expect(view.allDone).toBeTrue();
  });

  it('a completed cover class alongside other completed classes still reports allDone', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, startTime: '08:00', endTime: '08:40' }),
      entry({ id: 9, startTime: '09:00', endTime: '09:40', isSubstitution: true }),
    ], at(12, 0));

    expect(view.allDone).toBeTrue();
    expect(view.upcoming).toEqual([]);
  });

  it('an upcoming cover class is still subject to the normal 3-row visible cap, like any other period', () => {
    const view = buildTodayClassesView([
      entry({ id: 1, startTime: '09:00', endTime: '09:40' }),
      entry({ id: 2, startTime: '09:50', endTime: '10:30' }),
      entry({ id: 3, startTime: '10:40', endTime: '11:20' }),
      entry({ id: 9, startTime: '11:30', endTime: '12:10', isSubstitution: true }),
    ], at(9, 15));

    expect(view.current?.key).toBe('1');
    expect(view.upcoming.map(item => item.key)).toEqual(['2', '3']);
    expect(view.upcoming.some(item => item.key === '9')).toBeFalse();
  });

  it('exposes the real timetable entry id: own periods use their id, covered periods their timetableEntryId', () => {
    const entries = buildTodayClasses([
      { id: 100, day: todayDayCode(new Date(2026, 8, 23)), className: '8', subjectName: 'Science', periodNumber: 1, startTime: '09:00', endTime: '09:40' },
      { id: -7, day: todayDayCode(new Date(2026, 8, 23)), className: '7', subjectName: 'English', periodNumber: 2,
        startTime: '10:00', endTime: '10:40', isSubstitution: true, timetableEntryId: 300 },
      { id: -8, day: todayDayCode(new Date(2026, 8, 23)), className: '6', subjectName: 'Art', periodNumber: 3,
        startTime: '11:00', endTime: '11:40', isSubstitution: true },
    ], new Date(2026, 8, 23, 8, 0));
    expect(entries.map(e => e.timetableEntryId)).toEqual([100, 300, null]);
  });
});
