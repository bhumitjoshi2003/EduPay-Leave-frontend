import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { LoggerService } from '../../services/logger.service';
import { StaffAdoptionService } from '../../services/staff-adoption.service';
import { StaffAdoptionResponse } from '../../interfaces/staff-adoption';
import { StaffAdoptionComponent } from './staff-adoption.component';

describe('StaffAdoptionComponent', () => {
  let fixture: ComponentFixture<StaffAdoptionComponent>;
  let response$: BehaviorSubject<StaffAdoptionResponse>;
  let service: jasmine.SpyObj<StaffAdoptionService>;

  const data: StaffAdoptionResponse = {
    summary: { totalTeachers: 4, startedTeachers: 2, notStartedTeachers: 1, attendanceUsedTeachers: 1, disabledTeachers: 1 },
    teachers: [
      { teacherId: 'emp_26000001', name: 'Meenakshi Negi', accountStatus: 'STARTED', lastActiveAt: new Date().toISOString(), hasUsedAttendance: true, lastAttendanceAt: new Date().toISOString() },
      { teacherId: 'emp_26000002', name: 'Tarun Bisht', accountStatus: 'NOT_STARTED', lastActiveAt: null, hasUsedAttendance: false, lastAttendanceAt: null },
      { teacherId: 'emp_26000003', name: 'Asha Verma', accountStatus: 'STARTED', lastActiveAt: new Date().toISOString(), hasUsedAttendance: false, lastAttendanceAt: null },
      { teacherId: 'emp_26000004', name: 'Ravi Kumar', accountStatus: 'DISABLED', lastActiveAt: null, hasUsedAttendance: false, lastAttendanceAt: null },
    ],
  };

  beforeEach(async () => {
    response$ = new BehaviorSubject(data);
    service = jasmine.createSpyObj<StaffAdoptionService>('StaffAdoptionService', ['getStaffAdoption']);
    service.getStaffAdoption.and.returnValue(response$);
    await TestBed.configureTestingModule({
      imports: [StaffAdoptionComponent],
      providers: [
        provideRouter([]),
        { provide: StaffAdoptionService, useValue: service },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error']) },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(StaffAdoptionComponent);
  });

  it('shows loading until the backend responds', () => {
    const pending$ = new Subject<StaffAdoptionResponse>();
    service.getStaffAdoption.and.returnValue(pending$);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading staff adoption');
  });

  it('loads and renders the page with summary values', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Staff Adoption');
    expect(text).toContain('4'); // total teachers
    expect(text).toContain('2'); // started
  });

  it('renders every teacher row', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.sa-table tbody tr');
    expect(rows.length).toBe(4);
  });

  it('shows a recoverable backend error', () => {
    service.getStaffAdoption.and.returnValue(throwError(() => new Error('offline')));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('could not be loaded');
    expect(fixture.nativeElement.textContent).toContain('Retry');
  });

  it('renders the Started chip for a started teacher', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Started');
  });

  it('renders the Not started chip for a never-started teacher', () => {
    fixture.detectChanges();
    const chips = Array.from(fixture.nativeElement.querySelectorAll('.sa-chip')) as HTMLElement[];
    expect(chips.some(c => c.textContent?.trim() === 'Not started')).toBeTrue();
  });

  it('renders the Used chip for attendance used and Not yet used otherwise', () => {
    fixture.detectChanges();
    const chips = Array.from(fixture.nativeElement.querySelectorAll('.sa-chip')) as HTMLElement[];
    expect(chips.some(c => c.textContent?.trim() === 'Used')).toBeTrue();
    expect(chips.some(c => c.textContent?.trim() === 'Not yet used')).toBeTrue();
  });

  it('shows "Never" for a teacher who has never checked in', () => {
    fixture.detectChanges();
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.sa-table tbody tr')) as HTMLElement[];
    const tarunRow = rows.find(r => r.textContent?.includes('Tarun Bisht'));
    expect(tarunRow?.textContent).toContain('Never');
  });

  it('filters by search term across name and teacher ID', () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.sa-search input');
    input.value = 'Tarun';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.sa-table tbody tr');
    expect(rows.length).toBe(1);
  });

  it('filters by account status', () => {
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelectorAll('.sa-filters select')[0];
    select.value = 'STARTED';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.sa-table tbody tr');
    expect(rows.length).toBe(2);
  });

  it('filters by attendance usage', () => {
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelectorAll('.sa-filters select')[1];
    select.value = 'USED';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.sa-table tbody tr');
    expect(rows.length).toBe(1);
  });

  it('shows a friendly empty state when there are no teachers at all', () => {
    response$.next({ summary: { totalTeachers: 0, startedTeachers: 0, notStartedTeachers: 0, attendanceUsedTeachers: 0, disabledTeachers: 0 }, teachers: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No teachers have been added yet.');
  });

  it('shows a friendly empty state when teachers exist but none have started', () => {
    response$.next({
      summary: { totalTeachers: 2, startedTeachers: 0, notStartedTeachers: 2, attendanceUsedTeachers: 0, disabledTeachers: 0 },
      teachers: [
        { teacherId: 'emp_1', name: 'A', accountStatus: 'NOT_STARTED', lastActiveAt: null, hasUsedAttendance: false, lastAttendanceAt: null },
        { teacherId: 'emp_2', name: 'B', accountStatus: 'NOT_STARTED', lastActiveAt: null, hasUsedAttendance: false, lastAttendanceAt: null },
      ],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no one has started using Edunexify yet');
  });
});
