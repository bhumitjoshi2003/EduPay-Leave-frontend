import { of, throwError } from 'rxjs';
import { WhatsNewService } from './whats-new.service';
import { ReleaseNote } from '../interfaces/release-note';

const LAST_SEEN_KEY = 'edunexify.whatsnew.lastSeenVersion';

describe('WhatsNewService', () => {
  let service: WhatsNewService;
  let releaseService: any;
  let dialog: any;
  let toast: any;
  let logger: any;
  let dialogRef: any;

  const release: ReleaseNote = {
    version: '1.4.0',
    title: "What's New in Edunexify",
    summary: 'A few recent improvements.',
    items: ['Item one', 'Item two'],
    publishedAt: '2026-09-21',
  };

  beforeEach(() => {
    localStorage.removeItem(LAST_SEEN_KEY);
    dialogRef = { afterClosed: () => of(undefined) };
    releaseService = { getLatest: jasmine.createSpy() };
    dialog = { open: jasmine.createSpy().and.returnValue(dialogRef) };
    toast = jasmine.createSpyObj('ToastService', ['info', 'success', 'error', 'warning']);
    logger = jasmine.createSpyObj('LoggerService', ['error']);
    service = new WhatsNewService(releaseService, dialog, toast, logger);
  });

  afterEach(() => {
    localStorage.removeItem(LAST_SEEN_KEY);
  });

  it('opens the dialog when the latest release is newer than what was last seen', () => {
    releaseService.getLatest.and.returnValue(of(release));

    service.checkOnStartup();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.calls.mostRecent().args[1].data).toEqual(release);
  });

  it('does not open the dialog on startup when the release was already seen', () => {
    localStorage.setItem(LAST_SEEN_KEY, '1.4.0');
    releaseService.getLatest.and.returnValue(of(release));

    service.checkOnStartup();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('saves lastSeenVersion once the dialog is dismissed', () => {
    releaseService.getLatest.and.returnValue(of(release));

    service.checkOnStartup();

    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe('1.4.0');
  });

  it('runs the startup check only once per service instance, even if called twice', () => {
    releaseService.getLatest.and.returnValue(of(release));

    service.checkOnStartup();
    service.checkOnStartup();

    expect(releaseService.getLatest).toHaveBeenCalledTimes(1);
  });

  it('openManually always fetches and opens, ignoring lastSeen', () => {
    localStorage.setItem(LAST_SEEN_KEY, '1.4.0');
    releaseService.getLatest.and.returnValue(of(release));

    service.openManually();

    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('openManually shows a lightweight toast instead of a dialog when there is nothing to show', () => {
    releaseService.getLatest.and.returnValue(of(null));

    service.openManually();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalled();
  });

  it('a null/empty response on startup never opens the dialog and never throws', () => {
    releaseService.getLatest.and.returnValue(of(null));

    expect(() => service.checkOnStartup()).not.toThrow();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('a backend error on startup is swallowed — no dialog, no throw, just logged', () => {
    releaseService.getLatest.and.returnValue(throwError(() => new Error('offline')));

    expect(() => service.checkOnStartup()).not.toThrow();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('a backend error on manual open never throws and never shows a disruptive error modal', () => {
    releaseService.getLatest.and.returnValue(throwError(() => new Error('offline')));

    expect(() => service.openManually()).not.toThrow();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
