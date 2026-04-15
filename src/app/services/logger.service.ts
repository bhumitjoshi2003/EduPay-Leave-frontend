import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  log(...args: any[]): void {
    if (!environment.production) {
      console.log(...args);
    }
  }

  error(...args: any[]): void {
    if (!environment.production) {
      console.error(...args);
    }
  }
}
