import { getStoredSelectedClass, setStoredSelectedClass, clearStoredSelectedClass } from './class-selection-storage.util';

describe('class-selection-storage.util', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('restores a stored class when it is present in the current class list', () => {
    setStoredSelectedClass('school-a', '10');
    expect(getStoredSelectedClass('school-a', ['9', '10', '11'], '')).toBe('10');
  });

  it('falls back when the stored class is not in the current class list (stale value)', () => {
    setStoredSelectedClass('school-a', '1');
    // Class "1" was never configured for this school — must not be trusted.
    expect(getStoredSelectedClass('school-a', ['9', '10', '11'], '9')).toBe('9');
  });

  it('a class stored under one school never resurfaces for a different school', () => {
    setStoredSelectedClass('school-a', '10');
    // school-b happens to also have a class named "10", but the stored value belongs
    // to school-a's key — a different school must not read school-a's selection at all
    // (it reads its own, separately-namespaced, empty key).
    expect(getStoredSelectedClass('school-b', ['10', '11'], '')).toBe('');
  });

  it('falls back when nothing is stored', () => {
    expect(getStoredSelectedClass('school-a', ['9', '10'], '9')).toBe('9');
  });

  it('falls back when the school has no configured classes at all', () => {
    setStoredSelectedClass('school-a', '10');
    expect(getStoredSelectedClass('school-a', [], '')).toBe('');
  });

  it('clearStoredSelectedClass removes only that school\'s key', () => {
    setStoredSelectedClass('school-a', '10');
    setStoredSelectedClass('school-b', '11');
    clearStoredSelectedClass('school-a');
    expect(getStoredSelectedClass('school-a', ['10'], 'fallback')).toBe('fallback');
    expect(getStoredSelectedClass('school-b', ['11'], 'fallback')).toBe('11');
  });
});
