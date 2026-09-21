import { TeacherOnboardingService } from './teacher-onboarding.service';

describe('TeacherOnboardingService', () => {
  const key = 'edunexify.teacher-onboarding.v1.T1';
  afterEach(() => localStorage.removeItem(key));

  it('persists one structured per-teacher state object', async () => {
    const service = new TeacherOnboardingService();
    const state = await service.load('T1');
    const updated = await service.markVisited('T1', state, 'profileVisited');
    expect(updated.profileVisited).toBeTrue();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(updated);
  });

  it('fails open when localStorage is unavailable', async () => {
    const service = new TeacherOnboardingService();
    spyOn(localStorage, 'getItem').and.throwError('blocked');
    const state = await service.load('T1');
    expect(state.profileVisited).toBeFalse();
  });
});
