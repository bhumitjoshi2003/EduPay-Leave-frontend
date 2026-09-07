export interface SessionCopyRequest {
  sourceAcademicSessionId: number;
  targetAcademicSessionId: number;
}
export interface SessionCopyResult {
  sourceAcademicSessionId: number;
  targetAcademicSessionId: number;
  scanned: number;
  copied: number;
  alreadyCopied: number;
  skippedIneligibleTeacher: number;
  skippedInvalidClass: number;
  skippedInvalidSection: number;
  conflicts: number;
  failures: number;
  details: { sourceEntryId?: number; targetEntryId?: number; sourceId?: number; targetId?: number; outcome: string; reason: string | null }[];
}
export interface ResponsibilityRequest {
  academicSessionId: number;
  classId: number;
  sectionId: number | null;
  teacherId: string;
}
export interface Responsibility {
  id: number;
  academicSessionId: number;
  classId: number;
  className: string | null;
  sectionId: number | null;
  sectionName: string | null;
  configuredTeacherId: string;
  configuredTeacherName: string | null;
  liveTeacherId: string | null;
  liveTeacherName: string | null;
  liveMatchesConfigured: boolean;
}
export type ActivationState = 'NEVER_APPLIED' | 'APPLIED_IN_SYNC' | 'APPLIED_BUT_DRIFTED';
export interface ActivationRow {
  classId: number | null;
  className: string | null;
  sectionId: number | null;
  sectionName: string | null;
  configuredTeacherId: string | null;
  configuredTeacherName: string | null;
  priorLiveTeacherId: string | null;
  priorLiveTeacherName: string | null;
  outcome: string;
  reason: string | null;
}
export interface ActivationResult {
  academicSessionId: number;
  activationState: ActivationState;
  lastAppliedAt: string | null;
  lastAppliedBy: string | null;
  unchanged: number;
  ineligibleTeacher: number;
  invalidClassOrSection: number;
  details: ActivationRow[];
}
export interface ActivationPreview extends ActivationResult {
  inSync: boolean;
  hasIssues: boolean;
  becomingLive: number;
  changing: number;
  clearing: number;
}
export interface ActivationApply extends ActivationResult { applied: number; cleared: number; }
