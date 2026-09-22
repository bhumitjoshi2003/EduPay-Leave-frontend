export type StaffAdoptionAccountStatus = 'STARTED' | 'NOT_STARTED' | 'DISABLED' | 'ACCOUNT_PENDING';

export interface StaffAdoptionSummary {
  totalTeachers: number;
  startedTeachers: number;
  notStartedTeachers: number;
  attendanceUsedTeachers: number;
  disabledTeachers: number;
}

export interface StaffAdoptionTeacherRow {
  teacherId: string;
  name: string;
  accountStatus: StaffAdoptionAccountStatus;
  lastActiveAt: string | null;
  hasUsedAttendance: boolean;
  lastAttendanceAt: string | null;
}

export interface StaffAdoptionResponse {
  summary: StaffAdoptionSummary;
  teachers: StaffAdoptionTeacherRow[];
}
