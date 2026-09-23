import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotificationDeliveryLogComponent } from './notification-delivery-log.component';
import { NotificationDeliveryService } from '../../services/notification-delivery.service';
import { SchoolService } from '../../services/school.service';
import { LoggerService } from '../../services/logger.service';
import { DeliveryDetail, DeliveryRow, deliveryStatusLabel, eventCodeLabel } from '../../interfaces/notification-delivery';

describe('NotificationDeliveryLogComponent', () => {
  let fixture: ComponentFixture<NotificationDeliveryLogComponent>;
  let component: NotificationDeliveryLogComponent;
  let service: jasmine.SpyObj<NotificationDeliveryService>;

  const row = (overrides: Partial<DeliveryRow> = {}): DeliveryRow => ({
    id: 21, channel: 'PUSH', status: 'SENT', schoolId: 1, schoolName: 'Indra Academy',
    recipientUserId: 'S1', recipientRole: 'STUDENT', notificationId: 7, eventCode: 'FEE_REMINDER',
    title: 'Fee due', attemptCount: 1, lastError: null, providerMessageId: 'projects/p/messages/abc',
    createdAt: '2026-09-20T10:00:00', sentAt: '2026-09-20T10:00:01', nextAttemptAt: null, read: null, readAt: null,
    ...overrides,
  });

  const detail = (overrides: Partial<DeliveryDetail> = {}): DeliveryDetail => ({
    ...row(), maskedDestination: null, category: 'FEES', message: 'Your fee is due.',
    sourceEntityType: null, sourceEntityId: null, maxAttempts: 5, processingStartedAt: null,
    relatedChannels: [], ...overrides,
  });

  beforeEach(() => {
    service = jasmine.createSpyObj('NotificationDeliveryService', ['search', 'eventCodes', 'detail']);
    service.search.and.returnValue(of({ content: [row()], page: 0, size: 25, hasNext: false }));
    service.eventCodes.and.returnValue(of(['FEE_REMINDER', 'SUPPORT_TICKET_RESOLVED']));

    TestBed.configureTestingModule({
      imports: [NotificationDeliveryLogComponent],
      providers: [
        { provide: NotificationDeliveryService, useValue: service },
        { provide: SchoolService, useValue: { listAllSchools: () => of([{ id: 1, name: 'Indra Academy' }]) } },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error']) },
      ],
    });
    fixture = TestBed.createComponent(NotificationDeliveryLogComponent);
    component = fixture.componentInstance;
  });

  it('loads the first page unfiltered plus the school and event-type filter options', () => {
    fixture.detectChanges();
    expect(service.search).toHaveBeenCalledWith(0, 25, jasmine.objectContaining({ status: null, channel: null, schoolId: null }));
    expect(component.rows.length).toBe(1);
    expect(component.schools.length).toBe(1);
    expect(component.eventCodes).toContain('FEE_REMINDER');
    expect(fixture.nativeElement.textContent).toContain('Indra Academy');
  });

  it('applies every filter and restarts from the first page', () => {
    fixture.detectChanges();
    component.page = 3;
    component.filterStatus = 'FAILED_FINAL';
    component.filterChannel = 'EMAIL';
    component.filterEventCode = 'FEE_REMINDER';
    component.filterSchoolId = 1;
    component.filterRecipient = 'S1';
    component.filterFrom = '2026-09-01';
    component.filterTo = '2026-09-30';

    component.applyFilters();

    expect(service.search).toHaveBeenCalledWith(0, 25, {
      status: 'FAILED_FINAL', channel: 'EMAIL', eventCode: 'FEE_REMINDER', schoolId: 1,
      recipient: 'S1', from: '2026-09-01', to: '2026-09-30',
    });
  });

  it('pages with Next only while the backend reports more rows', () => {
    service.search.and.returnValue(of({ content: [row()], page: 0, size: 25, hasNext: true }));
    fixture.detectChanges();
    component.nextPage();
    expect(service.search).toHaveBeenCalledWith(1, 25, jasmine.any(Object));

    service.search.calls.reset();
    component.hasNext = false;
    component.nextPage();
    expect(service.search).not.toHaveBeenCalled();
  });

  it('never labels anything "Delivered" — SENT reads as accepted by the provider', () => {
    service.search.and.returnValue(of({ content: [
      row(), row({ id: 22, channel: 'EMAIL' }), row({ id: 70, channel: 'IN_APP', status: 'STORED', read: true }),
    ], page: 0, size: 25, hasNext: false }));
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Accepted by FCM');
    expect(text).toContain('Accepted by mail server');
    expect(text).toContain('In inbox');
    expect(text).toContain('Opened');
    expect(text.toLowerCase()).not.toContain('delivered');
  });

  it('opening a row loads its detail with the status meaning and the other channels', () => {
    fixture.detectChanges();
    service.detail.and.returnValue(of(detail({
      channel: 'EMAIL', status: 'FAILED_FINAL', maskedDestination: 'pr***@gmail.com', attemptCount: 5,
      lastError: 'Retry limit reached: MailSendException', providerMessageId: null,
      relatedChannels: [
        { id: 70, channel: 'IN_APP', status: 'STORED', attemptCount: 0, sentAt: null, lastError: null, read: false, readAt: null },
        { id: 21, channel: 'PUSH', status: 'SENT', attemptCount: 1, sentAt: '2026-09-20T10:00:01', lastError: null, read: null, readAt: null },
      ],
    })));

    component.open(component.rows[0]);
    fixture.detectChanges();

    expect(service.detail).toHaveBeenCalledWith('PUSH', 21);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('pr***@gmail.com');
    expect(text).toContain('5 of 5');
    expect(text).toContain('Retry limit reached');
    expect(text).toContain('Not provided by the mail integration');
    expect(text).toContain('Other channels for this recipient');
    expect(text).toContain('Not opened');
  });

  it('shows a truthful fallback when a detail record cannot be loaded, and close clears it', () => {
    fixture.detectChanges();
    service.detail.and.returnValue(throwError(() => ({ status: 404 })));
    component.open(component.rows[0]);
    fixture.detectChanges();
    expect(component.detailFailed).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('could not be loaded');

    component.close();
    expect(component.selected).toBeNull();
  });

  it('shows the backend validation message on a 400 and a generic fallback otherwise', () => {
    service.search.and.returnValue(throwError(() => ({ status: 400, error: { detail: 'The end date is before the start date.' } })));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The end date is before the start date.');

    service.search.and.returnValue(throwError(() => ({ status: 500 })));
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
  });

  it('humanises labels', () => {
    expect(eventCodeLabel('SUPPORT_TICKET_IN_PROGRESS')).toBe('Support ticket in progress');
    expect(deliveryStatusLabel('FAILED_RETRYABLE')).toBe('Retrying');
    expect(deliveryStatusLabel('SKIPPED')).toBe('Skipped');
  });
});
