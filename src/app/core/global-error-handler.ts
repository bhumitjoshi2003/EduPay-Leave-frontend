import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  constructor(private logger: LoggerService, private zone: NgZone) {}

  handleError(error: unknown): void {
    // Run outside Angular's zone so the error handler itself
    // doesn't trigger additional change detection cycles.
    this.zone.runOutsideAngular(() => {
      const message = this.extractMessage(error);
      this.logger.error('[GlobalErrorHandler]', message, error);

      // Production hook: replace the logger.error call above with
      // your monitoring service (e.g. Sentry.captureException(error))
      // when you add error tracking.
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred';
  }
}
