import { TeacherGettingStartedComponent } from './teacher-getting-started.component';
import { TeacherOnboardingState } from '../../services/teacher-onboarding.service';

describe('TeacherGettingStartedComponent', () => {
  const initial: TeacherOnboardingState = { profileVisited: false, todaysClassesVisited: false, attendanceVisited: false, leaveVisited: false, minimized: false, completedAt: null };
  let auth: any, onboarding: any, router: any, cdr: any, component: TeacherGettingStartedComponent;

  beforeEach(() => {
    auth = { getUser: () => ({ userId: 'T1', role: 'TEACHER' }) };
    onboarding = jasmine.createSpyObj('TeacherOnboardingService', ['load', 'save', 'markVisited', 'permissions', 'requestLocation', 'enableNotifications']);
    onboarding.load.and.resolveTo({ ...initial }); onboarding.save.and.resolveTo();
    onboarding.markVisited.and.callFake(async (_id: string, state: TeacherOnboardingState, field: keyof TeacherOnboardingState) => ({ ...state, [field]: true }));
    onboarding.permissions.and.resolveTo({ location: 'prompt', notifications: 'unavailable' });
    onboarding.requestLocation.and.resolveTo('granted'); onboarding.enableNotifications.and.resolveTo('unavailable');
    router = jasmine.createSpyObj('Router', ['navigateByUrl']); router.navigateByUrl.and.resolveTo(true);
    cdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);
    component = new TeacherGettingStartedComponent(auth, onboarding, router, cdr);
  });

  it('shows a five-item web checklist only to teachers and excludes unsupported browser push', async () => {
    await component.ngOnInit();
    expect(component.visible).toBeTrue(); expect(component.items.length).toBe(5);
    expect(component.items.map(item => item.id)).not.toContain('notifications');
    auth.getUser = () => ({ userId: 'A1', role: 'ADMIN' });
    const admin = new TeacherGettingStartedComponent(auth, onboarding, router, cdr);
    await admin.ngOnInit(); expect(admin.visible).toBeFalse();
  });

  it('tracks completion and navigates each local CTA to a real route', async () => {
    await component.ngOnInit();
    const routes: Record<string, string> = { profile: '/dashboard/teacher-details/T1', classes: '/dashboard/timetable', attendance: '/dashboard/teacher-checkin', leave: '/dashboard/apply-teacher-leave' };
    for (const [id, route] of Object.entries(routes)) {
      await component.run(component.items.find(item => item.id === id)!);
      expect(router.navigateByUrl).toHaveBeenCalledWith(route);
    }
  });

  it('persists minimize/reopen and removes unavailable tasks', async () => {
    onboarding.permissions.and.resolveTo({ location: 'unavailable', notifications: 'unavailable' });
    await component.ngOnInit(); expect(component.items.map(item => item.id)).not.toContain('location');
    await component.setMinimized(true); expect(component.state?.minimized).toBeTrue();
    await component.setMinimized(false); expect(component.state?.minimized).toBeFalse();
  });

  it('disappears safely if onboarding state cannot be loaded', async () => {
    onboarding.load.and.rejectWith(new Error('storage failed'));
    await component.ngOnInit(); expect(component.visible).toBeFalse();
  });
});
