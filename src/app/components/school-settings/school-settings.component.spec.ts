import { of } from 'rxjs';
import { SchoolSettingsComponent } from './school-settings.component';
import { SchoolSettings } from '../../services/school.service';

describe('Teacher attendance reminder settings', () => {
  let c: SchoolSettingsComponent;
  let schoolService: any;
  let toast: any;
  let logger: any;

  const baseSettings = (): SchoolSettings => ({
    id: 1, name: 'Test School', slug: 'test-school',
    address: null, city: null, state: null, pincode: null, phone: null, email: null,
    website: null, logoUrl: null, themeColor: null, contactPersonName: null, boardType: null,
    plan: null, maxStudents: null, expiryDate: null, active: true, razorpayConfigured: false,
    academicYearStartMonth: 4, workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
    periodsPerDay: 8, gradingSystem: 'CBSE',
    schoolLatitude: 28.6, schoolLongitude: 77.2, geofenceRadius: 200,
    schoolStartTime: '08:00', lateThresholdMinutes: 5,
    checkinWindowStart: '07:30', checkinWindowEnd: '08:30',
    staffAttendanceTrackingStartDate: '2026-01-01',
    timezone: 'Asia/Kolkata',
    teacherAttendanceReminderEnabled: false,
    teacherAttendanceReminderTime: null,
  });

  beforeEach(() => {
    schoolService = { updateSettings: jasmine.createSpy().and.returnValue(of(baseSettings())) };
    toast = { warning: jasmine.createSpy(), success: jasmine.createSpy(), error: jasmine.createSpy() };
    logger = { error: jasmine.createSpy() };
    c = new SchoolSettingsComponent(
      schoolService, {} as any, {} as any, { markForCheck: () => {} } as any, logger, toast,
      { snapshot: { queryParamMap: { get: () => null } } } as any, {} as any, {} as any, {} as any
    );
  });

  it('hydrates the reminder toggle and time from existing settings when starting an edit', () => {
    c.settings = { ...baseSettings(), teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '07:45' };
    c.startStaffAttendanceEdit();
    expect(c.staffAttendanceForm.teacherAttendanceReminderEnabled).toBeTrue();
    expect(c.staffAttendanceForm.teacherAttendanceReminderTime).toBe('07:45');
  });

  it('defaults the reminder to disabled with no time when never configured', () => {
    c.settings = baseSettings(); // enabled: false, time: null
    c.startStaffAttendanceEdit();
    expect(c.staffAttendanceForm.teacherAttendanceReminderEnabled).toBeFalse();
    expect(c.staffAttendanceForm.teacherAttendanceReminderTime).toBe('');
  });

  it('renders the read-only summary as Disabled when the reminder is off', () => {
    c.settings = { ...baseSettings(), teacherAttendanceReminderEnabled: false, teacherAttendanceReminderTime: null };
    // Read-only summary state is template-driven off c.settings directly — assert the
    // exact data the *ngIf branches in the template key off.
    expect(c.settings.teacherAttendanceReminderEnabled).toBeFalse();
  });

  it('exposes the configured time and timezone for the read-only summary when enabled', () => {
    c.settings = { ...baseSettings(), teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '07:45', timezone: 'Asia/Kolkata' };
    expect(c.settings.teacherAttendanceReminderEnabled).toBeTrue();
    expect(c.settings.teacherAttendanceReminderTime).toBe('07:45');
    expect(c.settings.timezone).toBe('Asia/Kolkata');
    expect(c.formatReminderTime(c.settings.teacherAttendanceReminderTime)).toBe('7:45 AM');
  });

  it('blocks saving when the reminder is enabled without a time, matching backend validation', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '';

    c.saveStaffAttendanceSettings();

    expect(toast.warning).toHaveBeenCalledWith('Validation', jasmine.stringMatching(/[Rr]eminder time is required/));
    expect(schoolService.updateSettings).not.toHaveBeenCalled();
  });

  it('allows saving with the reminder disabled even without a time', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = false;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '';

    c.saveStaffAttendanceSettings();

    expect(schoolService.updateSettings).toHaveBeenCalled();
  });

  it('disabling without touching the time field resends the previously configured time unchanged', () => {
    c.settings = { ...baseSettings(), teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '07:45' };
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = false; // time field never touched

    c.saveStaffAttendanceSettings();

    const payload = schoolService.updateSettings.calls.mostRecent().args[0];
    expect(payload.teacherAttendanceReminderEnabled).toBeFalse();
    expect(payload.teacherAttendanceReminderTime).toBe('07:45');
  });

  it('sends the reminder fields to updateSettings and applies the returned settings', () => {
    const saved = { ...baseSettings(), teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '08:15' };
    schoolService.updateSettings.and.returnValue(of(saved));
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '08:15';

    c.saveStaffAttendanceSettings();

    expect(schoolService.updateSettings).toHaveBeenCalledWith(
      jasmine.objectContaining({ teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '08:15' })
    );
    expect(c.settings).toEqual(saved);
    expect(c.isEditingStaffAttendance).toBeFalse();
  });

  it('values persist correctly across a save-then-reload cycle (re-opening edit hydrates the saved values)', () => {
    const saved = { ...baseSettings(), teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '08:15' };
    schoolService.updateSettings.and.returnValue(of(saved));
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '08:15';
    c.saveStaffAttendanceSettings();

    // Re-opening edit after the save must reflect exactly what was persisted, not stale form state.
    c.startStaffAttendanceEdit();
    expect(c.staffAttendanceForm.teacherAttendanceReminderEnabled).toBeTrue();
    expect(c.staffAttendanceForm.teacherAttendanceReminderTime).toBe('08:15');
  });

  it('leaves unrelated staff attendance settings unchanged when only the reminder is edited', () => {
    const settings = baseSettings();
    schoolService.updateSettings.and.returnValue(of({ ...settings, teacherAttendanceReminderEnabled: true, teacherAttendanceReminderTime: '07:00' }));
    c.settings = settings;
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '07:00';

    c.saveStaffAttendanceSettings();

    const payload = schoolService.updateSettings.calls.mostRecent().args[0];
    expect(payload.schoolStartTime).toBe('08:00');
    expect(payload.checkinWindowStart).toBe('07:30');
    expect(payload.checkinWindowEnd).toBe('08:30');
    expect(payload.geofenceRadius).toBe(200);
  });

  // ─── reminderTimeWarning — non-blocking guidance only, ported from the Android implementation ───

  it('warns when the reminder time is before the check-in window opens', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.checkinWindowStart = '07:30';
    c.staffAttendanceForm.teacherAttendanceReminderTime = '07:00';

    expect(c.reminderTimeWarning).toContain('before the check-in window opens');
  });

  it('warns when the reminder time is well after the check-in window closes', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.checkinWindowEnd = '08:30';
    c.staffAttendanceForm.teacherAttendanceReminderTime = '14:00';

    expect(c.reminderTimeWarning).toContain('after the check-in window closes');
  });

  it('has no warning when the reminder time falls inside the check-in window', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.checkinWindowStart = '07:30';
    c.staffAttendanceForm.checkinWindowEnd = '08:30';
    c.staffAttendanceForm.teacherAttendanceReminderTime = '08:00';

    expect(c.reminderTimeWarning).toBeNull();
  });

  it('has no warning while the reminder is disabled, regardless of any leftover time value', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = false;
    c.staffAttendanceForm.teacherAttendanceReminderTime = '02:00';

    expect(c.reminderTimeWarning).toBeNull();
  });

  it('a reminder-time warning never blocks a valid save', () => {
    c.settings = baseSettings();
    c.startStaffAttendanceEdit();
    c.staffAttendanceForm.teacherAttendanceReminderEnabled = true;
    c.staffAttendanceForm.checkinWindowStart = '07:30';
    c.staffAttendanceForm.teacherAttendanceReminderTime = '05:00'; // triggers the warning

    expect(c.reminderTimeWarning).not.toBeNull();
    c.saveStaffAttendanceSettings();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(schoolService.updateSettings).toHaveBeenCalled();
  });
});
