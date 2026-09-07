import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FeeGenerationTargetComponent } from './fee-generation-target.component';
import {
  FeeGenerationService, FeeGenerationStudentPreviewRow, FeeGenerationStudentResult
} from '../../services/fee-generation.service';
import { AcademicSessionService } from '../../services/academic-session.service';
import { AcademicSession } from '../../interfaces/academic-session';
import { SchoolService, SchoolClass } from '../../services/school.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';

/**
 * E5B: target-enrollment-driven fee generation admin page. Exercises the full
 * preview → select → confirm → generate → result workflow, stale-preview invalidation,
 * warning/blocking-error surfacing, and per-student partial-success result rendering.
 */
describe('FeeGenerationTargetComponent', () => {
  let component: FeeGenerationTargetComponent;
  let fixture: ComponentFixture<FeeGenerationTargetComponent>;
  let feeGenerationServiceSpy: jasmine.SpyObj<FeeGenerationService>;
  let academicSessionServiceSpy: jasmine.SpyObj<AcademicSessionService>;
  let schoolServiceSpy: jasmine.SpyObj<SchoolService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let queryParamValue: string | null;

  const session = (id: number, label: string, startDate: string, endDate: string, current = false): AcademicSession =>
    ({ id, label, startDate, endDate, current });

  const CURRENT = session(1, '2025-2026', '2025-04-01', '2026-03-31', true);
  const TARGET = session(2, '2026-2027', '2026-04-01', '2027-03-31', false);
  const UNRELATED = session(3, '2024-2025', '2024-04-01', '2025-03-31', false);

  const schoolClass = (id: number, name: string, displayOrder: number): SchoolClass =>
    ({ id, name, displayOrder, active: true, streamEligible: false });

  function row(overrides: Partial<FeeGenerationStudentPreviewRow> = {}): FeeGenerationStudentPreviewRow {
    return {
      studentId: 'S1',
      studentName: 'Student One',
      targetEnrollmentId: 500,
      targetEnrollmentStatus: 'ACTIVE',
      targetClassId: 10,
      targetClassName: '9',
      targetSectionId: 20,
      targetSectionName: 'A',
      repeatingSameClass: null,
      totalDue: 12000,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, alreadyGenerated: false, baseAmountDue: 1000, discountAmount: 0, busFeeDue: 0, total: 1000, message: null
      })),
      alreadyGeneratedMonths: [],
      warnings: [],
      blockingErrors: [],
      eligible: true,
      ...overrides,
    };
  }

  beforeEach(async () => {
    queryParamValue = null;
    feeGenerationServiceSpy = jasmine.createSpyObj('FeeGenerationService', ['getTargetPreview', 'generateTargetFees', 'getTargetDrift']);
    academicSessionServiceSpy = jasmine.createSpyObj('AcademicSessionService', ['getAllSessions']);
    schoolServiceSpy = jasmine.createSpyObj('SchoolService', ['getManagedClasses']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info', 'confirm']);

    academicSessionServiceSpy.getAllSessions.and.returnValue(of([CURRENT, TARGET, UNRELATED]));
    schoolServiceSpy.getManagedClasses.and.returnValue(of([schoolClass(10, '9', 1), schoolClass(11, '10', 2)]));

    await TestBed.configureTestingModule({
      imports: [FeeGenerationTargetComponent],
      providers: [
        { provide: FeeGenerationService, useValue: feeGenerationServiceSpy },
        { provide: AcademicSessionService, useValue: academicSessionServiceSpy },
        { provide: SchoolService, useValue: schoolServiceSpy },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']) },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ ...(queryParamValue ? { targetSessionId: queryParamValue } : {}) }) } }
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeeGenerationTargetComponent);
    component = fixture.componentInstance;
  });

  // ─── Session loading + defaulting ───────────────────────────────────────

  it('loads sessions and classes, and defaults target to the session contiguous with the current one', () => {
    fixture.detectChanges();

    expect(academicSessionServiceSpy.getAllSessions).toHaveBeenCalled();
    expect(schoolServiceSpy.getManagedClasses).toHaveBeenCalled();
    expect(component.sessionsLoading).toBeFalse();
    expect(component.targetSessionId).toBe(TARGET.id);
  });

  it('leaves target unset when no existing session is contiguous with the current one', () => {
    academicSessionServiceSpy.getAllSessions.and.returnValue(of([CURRENT, UNRELATED]));
    fixture.detectChanges();

    expect(component.targetSessionId).toBeNull();
  });

  it('degrades safely on a session-loading error', () => {
    academicSessionServiceSpy.getAllSessions.and.returnValue(throwError(() => new Error('network error')));
    fixture.detectChanges();

    expect(component.sessionsLoading).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('prefers a deep-linked targetSessionId query param over the contiguous-session default', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FeeGenerationTargetComponent],
      providers: [
        { provide: FeeGenerationService, useValue: feeGenerationServiceSpy },
        { provide: AcademicSessionService, useValue: academicSessionServiceSpy },
        { provide: SchoolService, useValue: schoolServiceSpy },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']) },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ targetSessionId: String(UNRELATED.id) }) } }
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FeeGenerationTargetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.targetSessionId).toBe(UNRELATED.id);
  });

  // ─── Preview loading ─────────────────────────────────────────────────────

  it('loads the preview and seeds selection with every eligible, not-fully-generated row', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row(), row({ studentId: 'S2', eligible: false, blockingErrors: ['No fee rule configured'] })]));
    fixture.detectChanges();

    component.loadPreview();

    expect(feeGenerationServiceSpy.getTargetPreview).toHaveBeenCalledWith(TARGET.id, null, null);
    expect(component.preview.length).toBe(2);
    expect(component.isSelected('S1')).toBeTrue();
    expect(component.isSelected('S2')).toBeFalse();
  });

  it('does not preselect a row that is already fully generated', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row({ alreadyGeneratedMonths: Array.from({ length: 12 }, (_, i) => i + 1) })]));
    fixture.detectChanges();
    component.loadPreview();

    expect(component.isSelected('S1')).toBeFalse();
    expect(component.fullyGeneratedCount).toBe(1);
  });

  it('shows a toast and stops loading on a preview error', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    component.loadPreview();

    expect(component.previewLoading).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalled();
  });

  // ─── Stale-preview protection ────────────────────────────────────────────

  it('marks the preview stale the instant the target session or a filter changes', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    expect(component.previewIsStale).toBeFalse();

    component.targetSessionId = UNRELATED.id;
    component.onTargetSessionChange();

    expect(component.previewIsStale).toBeTrue();
    expect(component.preview.length).toBe(0);
    expect(component.canGenerate).toBeFalse();
  });

  it('never allows generate while the preview is stale, even with selections present', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    component.classFilter = 10;

    expect(component.previewIsStale).toBeTrue();
    expect(component.canGenerate).toBeFalse();
  });

  // ─── Selection ───────────────────────────────────────────────────────────

  it('toggles selection for an eligible row but ignores toggles on a blocked row', () => {
    const blocked = row({ studentId: 'S2', eligible: false, blockingErrors: ['No fee rule configured'] });
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row(), blocked]));
    fixture.detectChanges();
    component.loadPreview();

    component.toggleSelected(component.preview[0]);
    expect(component.isSelected('S1')).toBeFalse();

    component.toggleSelected(blocked);
    expect(component.isSelected('S2')).toBeFalse();
  });

  it('computes eligible/blocked counts and the selected-rows total', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([
      row({ studentId: 'S1', totalDue: 1000 }),
      row({ studentId: 'S2', totalDue: 2000 }),
      row({ studentId: 'S3', eligible: false, blockingErrors: ['x'] }),
    ]));
    fixture.detectChanges();
    component.loadPreview();

    expect(component.eligibleCount).toBe(2);
    expect(component.blockedCount).toBe(1);
    expect(component.selectedRows.length).toBe(2);
  });

  // ─── Warnings / PLANNED messaging ────────────────────────────────────────

  it('carries a PLANNED enrollment warning and a missing-transport-assignment warning through to the row without blocking it', () => {
    const planned = row({
      targetEnrollmentStatus: 'PLANNED',
      warnings: ['This enrollment is recorded for the upcoming session and is not yet active.',
        'No transport assignment recorded for the target session; current transport status will be used.']
    });
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([planned]));
    fixture.detectChanges();
    component.loadPreview();

    expect(component.preview[0].eligible).toBeTrue();
    expect(component.preview[0].warnings.length).toBe(2);
    expect(component.isSelected('S1')).toBeTrue();
  });

  // ─── Confirmation + generate ─────────────────────────────────────────────

  it('does nothing when the admin cancels the confirmation dialog', async () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    toastSpy.confirm.and.returnValue(Promise.resolve(false));

    await component.confirmAndGenerate();

    expect(feeGenerationServiceSpy.generateTargetFees).not.toHaveBeenCalled();
  });

  it('builds the generate request from the loaded preview\'s authoritative IDs after confirmation', async () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row({ targetEnrollmentId: 777, targetClassId: 42 })]));
    fixture.detectChanges();
    component.loadPreview();
    toastSpy.confirm.and.returnValue(Promise.resolve(true));
    feeGenerationServiceSpy.generateTargetFees.and.returnValue(of([
      { studentId: 'S1', outcome: 'GENERATED', generatedMonths: 12, skippedMonths: 0, message: 'Generation completed.' }
    ]));

    await component.confirmAndGenerate();

    expect(feeGenerationServiceSpy.generateTargetFees).toHaveBeenCalledWith({
      targetSessionId: TARGET.id,
      decisions: [{ studentId: 'S1', expectedTargetEnrollmentId: 777, expectedTargetClassId: 42 }],
    });
  });

  it('reloads the preview after a successful generate to reflect authoritative state', async () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    toastSpy.confirm.and.returnValue(Promise.resolve(true));
    feeGenerationServiceSpy.generateTargetFees.and.returnValue(of([
      { studentId: 'S1', outcome: 'GENERATED', generatedMonths: 12, skippedMonths: 0, message: 'Generation completed.' }
    ]));

    await component.confirmAndGenerate();

    expect(feeGenerationServiceSpy.getTargetPreview).toHaveBeenCalledTimes(2);
    expect(component.results?.length).toBe(1);
  });

  it('shows an error toast and never clears the preview on a generate failure', async () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    toastSpy.confirm.and.returnValue(Promise.resolve(true));
    feeGenerationServiceSpy.generateTargetFees.and.returnValue(throwError(() => new Error('boom')));

    await component.confirmAndGenerate();

    expect(toastSpy.error).toHaveBeenCalled();
    expect(component.executing).toBeFalse();
    expect(component.preview.length).toBe(1);
  });

  // ─── Double-submit prevention ────────────────────────────────────────────

  it('blocks a second generate call while one is already in flight', async () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    toastSpy.confirm.and.returnValue(Promise.resolve(true));
    feeGenerationServiceSpy.generateTargetFees.and.returnValue(of([]));

    component.executing = true;
    await component.confirmAndGenerate();

    expect(feeGenerationServiceSpy.generateTargetFees).not.toHaveBeenCalled();
  });

  // ─── Result rendering ────────────────────────────────────────────────────

  it('classifies outcomes and summarizes per-student results without a single generic toast', () => {
    component.results = [
      { studentId: 'S1', outcome: 'GENERATED', generatedMonths: 12, skippedMonths: 0, message: 'Generation completed.' },
      { studentId: 'S2', outcome: 'ALREADY_GENERATED', generatedMonths: 0, skippedMonths: 12, message: 'All months already generated.' },
      { studentId: 'S3', outcome: 'ENROLLMENT_CHANGED', generatedMonths: 0, skippedMonths: 0, message: 'Target class has changed since preview.' },
    ] as FeeGenerationStudentResult[];

    expect(component.isSuccessOutcome('GENERATED')).toBeTrue();
    expect(component.isSuccessOutcome('PARTIALLY_GENERATED')).toBeTrue();
    expect(component.isInfoOutcome('ALREADY_GENERATED')).toBeTrue();
    expect(component.isSuccessOutcome('ENROLLMENT_CHANGED')).toBeFalse();
    expect(component.isInfoOutcome('ENROLLMENT_CHANGED')).toBeFalse();

    const summary = component.summaryEntries();
    expect(summary).toContain({ code: 'GENERATED', count: 1 });
    expect(summary).toContain({ code: 'ALREADY_GENERATED', count: 1 });
    expect(summary).toContain({ code: 'ENROLLMENT_CHANGED', count: 1 });
  });

  it('dismisses results without touching the loaded preview', () => {
    feeGenerationServiceSpy.getTargetPreview.and.returnValue(of([row()]));
    fixture.detectChanges();
    component.loadPreview();
    component.results = [{ studentId: 'S1', outcome: 'GENERATED', generatedMonths: 12, skippedMonths: 0, message: 'ok' }];

    component.dismissResults();

    expect(component.results).toBeNull();
    expect(component.preview.length).toBe(1);
  });

  // ─── E5C read-only drift review ───

  const driftRow = (status: any = 'CLASS_MISMATCH') => ({
    studentId: status === 'CLEAN' ? 'S-CLEAN' : 'S-DRIFT', studentName: 'Student',
    targetSessionId: TARGET.id, targetSessionLabel: TARGET.label,
    authoritativeEnrollmentId: 500, authoritativeEnrollmentStatus: 'PLANNED',
    enrollmentClassId: 10, enrollmentClassName: '9', generatedClassId: status === 'CLEAN' ? 10 : 11,
    generatedClassName: status === 'CLEAN' ? '9' : '10', generatedClassIds: [status === 'CLEAN' ? 10 : 11],
    generatedClassNames: [status === 'CLEAN' ? '9' : '10'], generatedMonths: [1, 2],
    expectedMonths: Array.from({ length: 12 }, (_, i) => i + 1), missingMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    driftStatus: status, warnings: status === 'CLEAN' ? [] : ['Generated fee class evidence differs.'],
  });

  it('loads drift using the selected session, class, and student filters', () => {
    feeGenerationServiceSpy.getTargetDrift.and.returnValue(of([driftRow()]));
    fixture.detectChanges();
    component.classFilter = 10; component.studentIdFilter = ' S1 ';

    component.loadDrift();

    expect(feeGenerationServiceSpy.getTargetDrift).toHaveBeenCalledWith(TARGET.id, 10, 'S1');
    expect(component.driftLoading).toBeFalse();
    expect(component.driftRows.length).toBe(1);
  });

  it('filters drift status and renders clean/action-needed guidance without a fix button', () => {
    feeGenerationServiceSpy.getTargetDrift.and.returnValue(of([driftRow('CLEAN'), driftRow()]));
    fixture.detectChanges(); component.toggleDriftReview(); fixture.detectChanges();
    let text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Clean'); expect(text).toContain('action-needed');
    expect(text).toContain("Review this student's enrollment and use the existing explicit fee recalculation workflow if correction is required.");
    expect(text).not.toContain('Fix');

    component.driftStatusFilter = 'CLEAN'; fixture.detectChanges();
    expect(component.visibleDriftRows.length).toBe(1);
  });

  it('surfaces drift API errors and leaves the workflow read-only', () => {
    feeGenerationServiceSpy.getTargetDrift.and.returnValue(throwError(() => new Error('offline')));
    fixture.detectChanges(); component.loadDrift();
    expect(component.driftLoading).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalledWith('Error', 'Failed to load fee and enrollment mismatches.');
    expect(feeGenerationServiceSpy.generateTargetFees).not.toHaveBeenCalled();
  });
});
