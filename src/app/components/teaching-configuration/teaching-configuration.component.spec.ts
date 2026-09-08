import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { TeachingConfigurationComponent } from './teaching-configuration.component';
import { ClassTeacherResponsibilityService } from '../../services/class-teacher-responsibility.service';
import { AcademicSessionService } from '../../services/academic-session.service';
import { TimetableService } from '../../services/timetable.service';
import { SectionService } from '../../services/section.service';
import { ToastService } from '../../services/toast.service';
import { ActivationPreview, Responsibility } from '../../interfaces/teaching-configuration';

const current = { id: 1, label: 'Current', startDate: '2020-01-01', endDate: '2999-01-01', current: true };
const future = { ...current, id: 2, label: 'Future', startDate: '2998-01-01', current: false };
const historical = { ...current, id: 3, label: 'Past', endDate: '2001-01-01', current: false };
const preview: ActivationPreview = { academicSessionId: 1, activationState: 'NEVER_APPLIED', inSync: true, hasIssues: false, lastAppliedAt: null, lastAppliedBy: null, becomingLive: 0, changing: 0, clearing: 0, unchanged: 0, ineligibleTeacher: 0, invalidClassOrSection: 0, details: [] };
const row: Responsibility = { id: 10, academicSessionId: 1, classId: 8, className: '8', sectionId: null, sectionName: null, configuredTeacherId: 'T1', configuredTeacherName: 'Teacher', liveTeacherId: null, liveTeacherName: null, liveMatchesConfigured: false };
describe('F6A responsibility management and activation', () => {
  let fixture: ComponentFixture<TeachingConfigurationComponent>;
  let c: TeachingConfigurationComponent;
  let service: any;
  let timetable: any;
  let toast: any;
  let academics: any;
  beforeEach(async () => {
    service = jasmine.createSpyObj('Responsibilities', ['list', 'create', 'update', 'delete', 'copy', 'preview', 'apply']);
    service.list.and.returnValue(of([row])); service.preview.and.returnValue(of(preview));
    service.apply.and.returnValue(of({ ...preview, activationState: 'APPLIED_IN_SYNC', applied: 0, cleared: 0 }));
    for (const name of ['create', 'update', 'delete', 'copy']) service[name].and.returnValue(of({}));
    timetable = { copySession: jasmine.createSpy().and.returnValue(of({})) };
    toast = { confirm: jasmine.createSpy().and.resolveTo(true) };
    academics = { getAllSessions: () => of([current, future, historical]), getCurrentSession: jasmine.createSpy().and.returnValue(of(current)) };
    await TestBed.configureTestingModule({ imports: [TeachingConfigurationComponent], providers: [
      { provide: ClassTeacherResponsibilityService, useValue: service }, { provide: TimetableService, useValue: timetable },
      { provide: AcademicSessionService, useValue: academics }, { provide: SectionService, useValue: { getSectionsForClass: () => of([]) } },
      { provide: ToastService, useValue: toast }
    ] }).compileComponents();
    fixture = TestBed.createComponent(TeachingConfigurationComponent); c = fixture.componentInstance;
    fixture.componentRef.setInput('session', current); fixture.detectChanges();
  });
  it('renders NEVER_APPLIED separately from inSync=true', () => {
    c.loadPreview(); fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('NEVER_APPLIED'); expect(text).toContain('inSync): true');
    expect(text).toContain('has never been explicitly applied'); expect(service.apply).not.toHaveBeenCalled();
  });
  it('renders drift, provenance, gains, changes, removals and issues', () => {
    service.preview.and.returnValue(of({ ...preview, activationState: 'APPLIED_BUT_DRIFTED', inSync: false, becomingLive: 2, changing: 3, clearing: 4, hasIssues: true, ineligibleTeacher: 1, lastAppliedBy: 'admin', lastAppliedAt: '2026-09-01T10:00:00', details: [{ className: '8', outcome: 'INELIGIBLE_TEACHER', reason: 'Teacher is inactive' }] }));
    c.loadPreview(); fixture.detectChanges(); const text = fixture.nativeElement.textContent;
    for (const expected of ['APPLIED_BUT_DRIFTED', 'Gains 2', 'changes 3', 'removals 4', 'admin', 'Teacher is inactive']) expect(text).toContain(expected);
  });
  it('requires explicit confirmation before apply, even if in sync', async () => {
    c.loadPreview(); await c.apply(); expect(toast.confirm).toHaveBeenCalled(); expect(service.apply).toHaveBeenCalledTimes(1);
  });
  it('does not apply on cancelled confirmation', async () => { toast.confirm.and.resolveTo(false); c.loadPreview(); await c.apply(); expect(service.apply).not.toHaveBeenCalled(); });
  it('rechecks current-session authority before apply', async () => {
    academics.getCurrentSession.and.returnValue(of(future)); c.loadPreview(); await c.apply();
    expect(service.apply).not.toHaveBeenCalled(); expect(c.error).toContain('current session changed');
  });
  it('rejects preview from a different current session', () => { service.preview.and.returnValue(of({ ...preview, academicSessionId: 2 })); c.loadPreview(); expect(c.preview).toBeNull(); });
  for (const session of [future, historical]) {
    it(`hides and blocks activation for ${session.label}`, async () => {
      fixture.componentRef.setInput('session', session); fixture.detectChanges(); c.loadPreview(); await c.apply();
      expect(service.preview).not.toHaveBeenCalled(); expect(service.apply).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).not.toContain('Resync Current Session Class Teachers');
    });
  }
  it('creates and updates canonical responsibility configuration', () => {
    c.classId = 8; c.teacherId = 'T1'; c.sectionsLoaded = true; c.save();
    expect(service.create).toHaveBeenCalledWith({ academicSessionId: 1, classId: 8, sectionId: null, teacherId: 'T1' });
    c.edit(row); c.save(); expect(service.update).toHaveBeenCalledWith(10, { academicSessionId: 1, classId: 8, sectionId: null, teacherId: 'T1' });
  });
  it('deletes selected-session responsibility after confirmation', async () => { await c.remove(row); expect(service.delete).toHaveBeenCalledWith(10, 1); });
  it('blocks historical and no-session configuration writes', () => {
    for (const session of [historical, null]) { fixture.componentRef.setInput('session', session); fixture.detectChanges(); c.classId = 8; c.teacherId = 'T1'; c.sectionsLoaded = true; c.save(); expect(c.canSave()).toBeFalse(); }
    expect(service.create).not.toHaveBeenCalled();
  });
  it('requires explicit distinct copy sessions and disallows historical targets', () => {
    c.sourceId = 1; c.targetId = 1; expect(c.canCopy()).toBeFalse(); c.targetId = 3; expect(c.canCopy()).toBeFalse();
    c.sourceId = 3; c.targetId = 2; expect(c.canCopy()).toBeTrue();
  });
  it('copies historical timetable to current with confirmed flag', async () => {
    c.sourceId = 3; c.targetId = 1; await c.copy('timetable');
    expect(timetable.copySession).toHaveBeenCalledWith({ sourceAcademicSessionId: 3, targetAcademicSessionId: 1, confirmCurrentTarget: true });
  });
  it('copies responsibilities to future without live activation', async () => {
    c.sourceId = 1; c.targetId = 2; await c.copy('responsibilities');
    expect(service.copy).toHaveBeenCalledWith({ sourceAcademicSessionId: 1, targetAcademicSessionId: 2 }); expect(service.apply).not.toHaveBeenCalled();
  });
});
