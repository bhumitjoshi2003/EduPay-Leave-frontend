import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimetableService } from './timetable.service';
import { ClassTeacherResponsibilityService } from './class-teacher-responsibility.service';
import { environment } from '../../environments/environment';
import { TimetableEntryRequest } from '../interfaces/timetable';

describe('F6A endpoint contracts', () => {
  let http: HttpTestingController;
  let timetable: TimetableService;
  let responsibility: ClassTeacherResponsibilityService;
  const base = environment.apiUrl;
  const body: TimetableEntryRequest = { academicSessionId: 42, classId: 8, sectionId: null, day: 'MONDAY', periodNumber: 1, startTime: '09:00', endTime: '10:00', subjectName: 'Math', teacherId: 'T1' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    timetable = TestBed.inject(TimetableService);
    responsibility = TestBed.inject(ClassTeacherResponsibilityService);
  });
  afterEach(() => http.verify());
  for (const sessionId of [1, 42, 99]) {
    it(`reads explicitly selected session ${sessionId} for ADMIN`, () => {
      timetable.getClassTimetable('Class / 8', 3, null, sessionId).subscribe();
      const req = http.expectOne(r => r.url.endsWith('/timetable/class/Class%20%2F%208'));
      expect(req.request.params.get('academicSessionId')).toBe(String(sessionId));
      expect(req.request.params.get('sectionId')).toBe('3'); req.flush([]);
    });
  }
  it('keeps teacher operational reads current-only without session selection', () => {
    timetable.getTeacherTimetable('T1').subscribe();
    const req = http.expectOne(`${base}/timetable/teacher/T1`);
    expect(req.request.params.has('academicSessionId')).toBeFalse(); req.flush([]);
  });
  it('supports explicit ADMIN teacher schedule reads', () => {
    timetable.getTeacherTimetable('T1', 42).subscribe();
    const req = http.expectOne(`${base}/timetable/teacher/T1?academicSessionId=42`); req.flush([]);
  });
  for (const sectionId of [null, 3]) {
    it(`creates with canonical class and section ${sectionId}`, () => {
      timetable.createEntry({ ...body, sectionId }).subscribe();
      const req = http.expectOne(`${base}/timetable`);
      expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual({ ...body, sectionId }); req.flush({});
    });
  }
  it('updates with explicit matching session authority', () => {
    timetable.updateEntry(10, body).subscribe();
    const req = http.expectOne(`${base}/timetable/10`);
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual(body); req.flush({});
  });
  it('deletes using the session query parameter', () => {
    timetable.deleteEntry(10, 42).subscribe();
    const req = http.expectOne(`${base}/timetable/10?academicSessionId=42`);
    expect(req.request.method).toBe('DELETE'); req.flush(null);
  });
  it('uploads CSV unchanged with explicit session outside CSV', () => {
    const file = new File(['Class,Section'], 'timetable.csv');
    timetable.bulkImport(file, 42).subscribe();
    const req = http.expectOne(`${base}/timetable/bulk?academicSessionId=42`);
    expect(req.request.body.get('file')).toBe(file); expect(req.request.body.has('academicSessionId')).toBeFalse(); req.flush({});
  });
  it('copies timetable with explicit current-target confirmation', () => {
    const copy = { sourceAcademicSessionId: 41, targetAcademicSessionId: 42, confirmCurrentTarget: true };
    timetable.copySession(copy).subscribe();
    const req = http.expectOne(`${base}/timetable/copy-session`); expect(req.request.body).toEqual(copy); req.flush({});
  });
  it('lists, creates, updates and deletes responsibility configuration', () => {
    const data = { academicSessionId: 42, classId: 8, sectionId: 3, teacherId: 'T1' };
    responsibility.list(42).subscribe(); http.expectOne(`${base}/class-teacher-responsibilities?academicSessionId=42`).flush([]);
    responsibility.create(data).subscribe();
    const create = http.expectOne(`${base}/class-teacher-responsibilities`); expect(create.request.body).toEqual(data); expect(create.request.method).toBe('POST'); create.flush({});
    responsibility.update(10, data).subscribe();
    const update = http.expectOne(`${base}/class-teacher-responsibilities/10`); expect(update.request.body).toEqual(data); expect(update.request.method).toBe('PUT'); update.flush({});
    responsibility.delete(10, 42).subscribe();
    const remove = http.expectOne(`${base}/class-teacher-responsibilities/10?academicSessionId=42`); expect(remove.request.method).toBe('DELETE'); remove.flush(null);
  });
  it('copies responsibility configuration without a timetable-only flag', () => {
    const body = { sourceAcademicSessionId: 1, targetAcademicSessionId: 42 };
    responsibility.copy(body).subscribe();
    const req = http.expectOne(`${base}/class-teacher-responsibilities/copy-session`); expect(req.request.body).toEqual(body); req.flush({});
  });
  it('uses parameterless current-session activation preview and apply', () => {
    responsibility.preview().subscribe();
    const preview = http.expectOne(`${base}/class-teacher-responsibilities/activation/preview`); expect(preview.request.method).toBe('GET'); preview.flush({});
    responsibility.apply().subscribe();
    const apply = http.expectOne(`${base}/class-teacher-responsibilities/activation/apply`); expect(apply.request.method).toBe('POST'); expect(apply.request.body).toEqual({}); apply.flush({});
  });
});
