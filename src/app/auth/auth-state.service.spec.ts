import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthStateService, UserInfo } from './auth-state.service';

describe('AuthStateService — mustChangePassword', () => {
  let service: AuthStateService;

  const baseUser: UserInfo = {
    userId: 'S1',
    role: 'STUDENT',
    name: 'Test Student',
    className: '10',
    schoolSlug: 'demo',
    featureKeys: null,
    planTier: null,
    planVersion: null,
    subscriptionStatus: null,
    trialEndsAt: null,
    expiresAt: null,
    graceEndsAt: null,
    permissionKeys: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthStateService);
  });

  it('returns false when no user is loaded', () => {
    expect(service.mustChangePassword()).toBeFalse();
  });

  it('returns false for a normal session (flag absent)', () => {
    service.setUser({ ...baseUser });
    expect(service.mustChangePassword()).toBeFalse();
  });

  it('returns false when the backend explicitly sends false', () => {
    service.setUser({ ...baseUser, mustChangePassword: false });
    expect(service.mustChangePassword()).toBeFalse();
  });

  it('returns true for a restricted first-login session', () => {
    service.setUser({ ...baseUser, mustChangePassword: true });
    expect(service.mustChangePassword()).toBeTrue();
  });

  it('returns false again after clearUser()', () => {
    service.setUser({ ...baseUser, mustChangePassword: true });
    service.clearUser();
    expect(service.mustChangePassword()).toBeFalse();
  });

  it('grants only explicitly entitled paid features', () => {
    service.setUser({ ...baseUser, featureKeys: ['FEE_MANAGEMENT', 'EXAM_MARKS'] });

    expect(service.hasFeature('FEE_MANAGEMENT')).toBeTrue();
    expect(service.hasFeature('AI_COPILOT')).toBeFalse();
  });

  it('denies paid features when no effective entitlement is available', () => {
    service.setUser({ ...baseUser, featureKeys: [] });
    expect(service.hasFeature('AI_COPILOT')).toBeFalse();

    service.setUser({ ...baseUser, featureKeys: null });
    expect(service.hasFeature('AI_COPILOT')).toBeFalse();
  });
});
