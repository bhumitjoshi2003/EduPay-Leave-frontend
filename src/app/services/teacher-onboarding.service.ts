import { Injectable } from '@angular/core';

export type TeacherOnboardingVisit = 'profileVisited' | 'todaysClassesVisited' | 'attendanceVisited' | 'leaveVisited';
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';
export interface TeacherOnboardingState { profileVisited: boolean; todaysClassesVisited: boolean; attendanceVisited: boolean; leaveVisited: boolean; minimized: boolean; completedAt: string | null; }
export interface TeacherPermissionState { location: PermissionState; notifications: PermissionState; }

const DEFAULT_STATE: TeacherOnboardingState = { profileVisited: false, todaysClassesVisited: false, attendanceVisited: false, leaveVisited: false, minimized: false, completedAt: null };

@Injectable({ providedIn: 'root' })
export class TeacherOnboardingService {
  private key(userId: string): string { return `edunexify.teacher-onboarding.v1.${userId}`; }

  async load(userId: string): Promise<TeacherOnboardingState> {
    try {
      const value = localStorage.getItem(this.key(userId));
      return value ? { ...DEFAULT_STATE, ...JSON.parse(value) } : { ...DEFAULT_STATE };
    } catch { return { ...DEFAULT_STATE }; }
  }

  async save(userId: string, state: TeacherOnboardingState): Promise<void> {
    try { localStorage.setItem(this.key(userId), JSON.stringify(state)); } catch { /* optional UI */ }
  }

  async markVisited(userId: string, state: TeacherOnboardingState, field: TeacherOnboardingVisit): Promise<TeacherOnboardingState> {
    const next = { ...state, [field]: true };
    await this.save(userId, next);
    return next;
  }

  async permissions(): Promise<TeacherPermissionState> {
    return { location: await this.locationPermission(), notifications: 'unavailable' };
  }

  async requestLocation(): Promise<PermissionState> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unavailable';
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(
      () => resolve('granted'), error => resolve(error.code === 1 ? 'denied' : 'prompt'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    ));
  }

  async enableNotifications(): Promise<PermissionState> { return 'unavailable'; }

  private async locationPermission(): Promise<PermissionState> {
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) return 'unavailable';
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch { return 'unavailable'; }
  }
}
