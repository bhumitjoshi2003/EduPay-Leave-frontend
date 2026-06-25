import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  Inject, OnDestroy, OnInit, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { MarksService, ExamResult } from '../../services/marks.service';
import {
  ReportCardTemplateService, ReportCardData, TemplateSection, BrandingConfig,
  ExamColumn, SubjectRow
} from '../../services/report-card-template.service';
import { LoggerService } from '../../services/logger.service';
import { SchoolService } from '../../services/school.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { Capacitor } from '@capacitor/core';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-report-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-card.component.html',
  styleUrl: './report-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  studentId = '';
  session = '';

  // ── Demo mode ─────────────────────────────────────────────────────────
  demoMode = false;
  demoStyleName = '';

  // ── Legacy exam-based mode ────────────────────────────────────────────
  examId: number | null = null;
  allResults: ExamResult[] = [];
  displayResults: ExamResult[] = [];
  studentName = '';
  className = '';
  legacyGradingSystem = 'CBSE';

  // ── Template-based mode ───────────────────────────────────────────────
  templateId: number | null = null;
  reportCardData: ReportCardData | null = null;

  loading = true;
  notPublished = false;  // true when STUDENT hits a 403 (report not yet published)
  private originalTitle = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private titleService: Title,
    private marksService: MarksService,
    private rcTemplateService: ReportCardTemplateService,
    private schoolService: SchoolService,
    private authState: AuthStateService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService,
    private toast: ToastService,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

  ngOnInit(): void {
    this.originalTitle = this.titleService.getTitle();
    const params = this.route.snapshot.queryParamMap;
    this.studentId = params.get('studentId') ?? '';
    this.session   = params.get('session') ?? '';
    const examIdStr    = params.get('examId');
    const templateIdStr = params.get('templateId');
    this.examId     = examIdStr     ? Number(examIdStr)     : null;
    this.templateId = templateIdStr ? Number(templateIdStr) : null;

    this.demoMode = params.get('demo') === 'true';
    this.demoStyleName = params.get('styleName') ?? 'CBSE Standard';
    if (this.demoMode) {
      const color = params.get('color') ?? '#1565c0';
      const layoutStyle = params.get('layoutStyle') ?? 'CLASSIC';
      this.reportCardData = this.buildSampleData(color, layoutStyle);
      this.templateId = -1; // signals template mode
      this.loading = false;
      this.cdr.markForCheck();
      this.titleService.setTitle(`Sample Report Card — ${this.demoStyleName}`);
      return;
    }

    if (!this.studentId || !this.session) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // STUDENT role can only view own report card
    if (!this.demoMode) {
      const role = this.authState.getUserRole();
      const authUserId = this.authState.getUserId();
      if (role === 'STUDENT' && this.studentId && this.studentId !== String(authUserId)) {
        this.toast.error('Access Denied', 'You can only view your own report card.');
        this.router.navigate(['/dashboard']);
        return;
      }
    }

    if (this.templateId) {
      this.loadTemplateMode();
    } else {
      this.loadLegacyMode();
    }
  }

  ngOnDestroy(): void {
    this.titleService.setTitle(this.originalTitle);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Template-based mode ───────────────────────────────────────────────

  private loadTemplateMode(): void {
    this.rcTemplateService
      .getReportCard(this.studentId, this.templateId!, this.session)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportCardData = data;
          this.loading = false;
          this.cdr.markForCheck();
          this.titleService.setTitle(
            `ReportCard_${data.studentName.replace(/\s+/g, '_')}_${this.session}`
          );
        },
        error: (e) => {
          if (e.status === 403) {
            this.notPublished = true;
          } else {
            this.logger.error('Error loading template report card:', e);
            this.toast.error('Error', 'Failed to load report card.');
          }
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Legacy exam-based mode ────────────────────────────────────────────

  private loadLegacyMode(): void {
    this.schoolService.getSettings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.legacyGradingSystem = s.gradingSystem ?? 'CBSE'; this.cdr.markForCheck(); },
      error: (err) => this.logger.error('Failed to load school settings', err)
    });

    this.marksService.getStudentResults(this.studentId, this.session)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allResults = data;
          if (data.length > 0) {
            this.studentName = data[0].studentName;
            this.className   = data[0].className;
          }
          this.displayResults = this.examId
            ? data.filter(r => r.examId === this.examId)
            : data;
          this.loading = false;
          this.cdr.markForCheck();
          this.updateDocumentTitle();
        },
        error: (e) => {
          this.logger.error('Error loading report card:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Branding helpers ──────────────────────────────────────────────────

  get branding(): BrandingConfig {
    if (!this.reportCardData?.template?.brandingJson) return {};
    try { return JSON.parse(this.reportCardData.template.brandingJson); } catch { return {}; }
  }

  get primaryColor(): string { return this.branding.primaryColor ?? '#1565c0'; }

  get headerStyle(): string {
    // White document header with a thick colored top stripe — no gradient.
    return `border-top: 4px solid ${this.primaryColor}`;
  }

  get rcLabelStyle(): string {
    // Bordered box with primary color text and border — not a solid fill.
    return `color: ${this.primaryColor}; border: 2px solid ${this.primaryColor}`;
  }

  // sectionBarStyle is kept for table <th> headers (solid colored background, white text)
  get sectionBarStyle(): string {
    return `background: ${this.primaryColor}; border-color: ${this.primaryColor}`;
  }

  // sectionTitleStyle — elegant left-bordered label for section separators
  get sectionTitleStyle(): string {
    return `color: ${this.primaryColor}; border-left: 3px solid ${this.primaryColor}`;
  }

  // logoSrc — resolves the relative logo path (e.g. /uploads/school-logos/1.png)
  // to a full URL the same way the login page does via TenantService.getLogoUrl()
  get logoSrc(): string {
    const url = this.reportCardData?.schoolLogoUrl;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}${url}`;
  }

  // headerImageSrc — resolves the custom report card header image URL
  get headerImageSrc(): string {
    const url = this.reportCardData?.reportCardHeaderImageUrl;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}${url}`;
  }

  // photoSrc — resolves student photo relative path to a full URL
  get photoSrc(): string {
    const url = this.reportCardData?.photoUrl;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}${url}`;
  }

  // classDisplay — e.g. "10" or "10 – A" when section exists
  get classDisplay(): string {
    const cls = this.reportCardData?.className ?? '';
    const sec = this.reportCardData?.sectionName;
    return sec ? `${cls} – ${sec}` : cls;
  }

  // boardLabel — human-readable board type shown in school header
  get boardLabel(): string {
    const map: Record<string, string> = {
      CBSE: 'CBSE Affiliated',
      ICSE: 'ICSE Affiliated',
      STATE: 'State Board',
      OTHER: ''
    };
    return map[this.reportCardData?.boardType ?? ''] ?? '';
  }

  // gradeLegend — rows for the grade scale legend shown below marks table
  get gradeLegend(): { grade: string; range: string; descriptor: string }[] {
    const gs = this.reportCardData?.gradingSystem ?? 'CBSE';
    if (gs === 'CBSE') {
      return [
        { grade: 'A1', range: '91–100', descriptor: 'Outstanding' },
        { grade: 'A2', range: '81–90',  descriptor: 'Excellent' },
        { grade: 'B1', range: '71–80',  descriptor: 'Very Good' },
        { grade: 'B2', range: '61–70',  descriptor: 'Good' },
        { grade: 'C1', range: '51–60',  descriptor: 'Satisfactory' },
        { grade: 'C2', range: '41–50',  descriptor: 'Average' },
        { grade: 'D',  range: '33–40',  descriptor: 'Needs Improvement' },
        { grade: 'E',  range: '0–32',   descriptor: 'Fail' },
      ];
    }
    if (gs === 'LETTER') {
      return [
        { grade: 'A+', range: '90–100', descriptor: 'Outstanding' },
        { grade: 'A',  range: '80–89',  descriptor: 'Excellent' },
        { grade: 'B+', range: '70–79',  descriptor: 'Very Good' },
        { grade: 'B',  range: '60–69',  descriptor: 'Good' },
        { grade: 'C+', range: '50–59',  descriptor: 'Satisfactory' },
        { grade: 'C',  range: '40–49',  descriptor: 'Average' },
        { grade: 'D',  range: '33–39',  descriptor: 'Needs Improvement' },
        { grade: 'F',  range: '0–32',   descriptor: 'Fail' },
      ];
    }
    return []; // PERCENTAGE — no letter grade legend needed
  }

  get thStyle(): string {
    return `background: ${this.primaryColor}; border-color: ${this.primaryColor}; color: #fff`;
  }

  get showCgpa(): boolean {
    return (this.branding.showCgpa !== false) && !!this.reportCardData?.cgpa;
  }

  get showGradePoints(): boolean {
    return this.branding.showGradePoints === true;
  }

  get layoutStyle(): string { return this.branding.layoutStyle ?? 'CLASSIC'; }
  get isNewLayout(): boolean { return this.layoutStyle !== 'CLASSIC'; }
  get cardLayoutClass(): string { return this.layoutStyle.toLowerCase().replace(/_/g, '-'); }
  get schoolInitials(): string {
    const name = this.reportCardData?.schoolName ?? '';
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  get schoolMotto(): string { return this.branding.schoolMotto ?? ''; }

  private darken(hex: string, factor: number): string {
    try {
      const h = hex.replace('#', '');
      const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor));
      const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor));
      const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor));
      return `rgb(${r},${g},${b})`;
    } catch { return '#0f172a'; }
  }

  cbseGradePoint(pct: number): number {
    const grade = this.getGradeFromPct(pct);
    const map: Record<string, number> = {
      'A1': 10, 'A2': 9, 'B1': 8, 'B2': 7,
      'C1': 6,  'C2': 5, 'D':  4, 'E':  0,
      'A+': 10, 'A':  9, 'B+': 8, 'B':  7,
      'C+': 6,  'C':  5, 'F':  0
    };
    return map[grade] ?? 0;
  }

  // ── Template helpers ──────────────────────────────────────────────────

  get enabledSections(): TemplateSection[] {
    return (this.reportCardData?.template?.sections ?? [])
      .filter(s => s.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  sectionConfig(sectionType: string): any {
    const sec = this.reportCardData?.template?.sections?.find(s => s.sectionType === sectionType);
    if (!sec?.configJson) return {};
    try { return JSON.parse(sec.configJson); } catch { return {}; }
  }

  get coScholasticActivities(): string[] {
    const cfg = this.sectionConfig('CO_SCHOLASTIC');
    return cfg?.activities ?? ['Discipline', 'Sports', 'Co-Curricular'];
  }

  get coScholasticGradeScale(): string[] {
    const cfg = this.sectionConfig('CO_SCHOLASTIC');
    return cfg?.gradeScale ?? ['A', 'B', 'C', 'D'];
  }

  isPass(pct: number): boolean { return pct >= 33; }

  // ── Grading (used by both modes) ──────────────────────────────────────

  private get activeGradingSystem(): string {
    return this.reportCardData?.gradingSystem ?? this.legacyGradingSystem;
  }

  getGrade(obtained: number | null, max: number): string {
    if (obtained === null) return 'Ab';
    return this.gradeFromPct((obtained / max) * 100);
  }

  getGradeClass(obtained: number | null, max: number): string {
    if (obtained === null) return 'grade-absent';
    const pct = (obtained / max) * 100;
    if (pct >= 81) return 'grade-a';
    if (pct >= 61) return 'grade-b';
    if (pct >= 33) return 'grade-c';
    return 'grade-fail';
  }

  getOverallGrade(percentage: number): string {
    return this.gradeFromPct(percentage);
  }

  getGradeFromPct(pct: number): string { return this.gradeFromPct(pct); }

  getGradeClassFromPct(pct: number): string {
    if (pct >= 81) return 'grade-a';
    if (pct >= 61) return 'grade-b';
    if (pct >= 33) return 'grade-c';
    return 'grade-fail';
  }

  private gradeFromPct(pct: number): string {
    switch (this.activeGradingSystem) {
      case 'PERCENTAGE':
        return `${Math.round(pct)}%`;
      case 'LETTER':
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C+';
        if (pct >= 40) return 'C';
        if (pct >= 33) return 'D';
        return 'F';
      case 'CBSE':
      default:
        if (pct >= 91) return 'A1';
        if (pct >= 81) return 'A2';
        if (pct >= 71) return 'B1';
        if (pct >= 61) return 'B2';
        if (pct >= 51) return 'C1';
        if (pct >= 41) return 'C2';
        if (pct >= 33) return 'D';
        return 'E';
    }
  }

  // ── Legacy mode helpers ───────────────────────────────────────────────

  private updateDocumentTitle(): void {
    const namePart = this.studentName.trim().replace(/\s+/g, '_');
    const examPart = this.isPerExam && this.displayResults.length > 0
      ? this.displayResults[0].examName.trim().replace(/\s+/g, '_')
      : 'Full_Report';
    const sessionPart = this.session.replace('-', '_');
    this.titleService.setTitle(`ReportCard_${namePart}_${examPart}_${sessionPart}`);
  }

  get isPerExam(): boolean { return this.examId !== null; }

  get cardTitle(): string {
    if (this.isPerExam && this.displayResults.length > 0) {
      return this.displayResults[0].examName + ' — Report Card';
    }
    return 'Annual Report Card';
  }

  // ── Actions ───────────────────────────────────────────────────────────

  print(): void {
    if (Capacitor.isNativePlatform()) {
      this.toast.info('Not Available', 'Printing is not supported on the mobile app. Please use the web version.');
      return;
    }
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  downloadingPdf = false;

  downloadPdf(): void {
    if (!this.templateId || !this.studentId || !this.session) return;

    if (Capacitor.isNativePlatform()) {
      this.toast.info('Not Available', 'PDF download is not available in the app. Use the web version.');
      return;
    }

    this.downloadingPdf = true;
    this.cdr.markForCheck();

    this.rcTemplateService.downloadPdf(this.studentId, this.templateId, this.session)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const name = this.reportCardData?.studentName?.replace(/\s+/g, '_') ?? 'Student';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name}_${this.session}_ReportCard.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.downloadingPdf = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.logger.error('PDF download failed', e);
          this.toast.error('Download Failed', 'Could not generate PDF. Please try again.');
          this.downloadingPdf = false;
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void { this.location.back(); }

  private buildSampleData(color: string, layoutStyle = 'CLASSIC'): ReportCardData {
    const sections: TemplateSection[] = [
      { sectionType: 'SCHOOL_HEADER',      enabled: true, displayOrder: 1 },
      { sectionType: 'STUDENT_INFO',       enabled: true, displayOrder: 2 },
      { sectionType: 'MARKS_TABLE',        enabled: true, displayOrder: 3 },
      { sectionType: 'ASSESSMENT_SUMMARY', enabled: true, displayOrder: 4 },
      { sectionType: 'ATTENDANCE',         enabled: true, displayOrder: 5 },
      { sectionType: 'CO_SCHOLASTIC',      enabled: true, displayOrder: 6 },
      { sectionType: 'TEACHER_REMARKS',    enabled: true, displayOrder: 7 },
      { sectionType: 'PRINCIPAL_REMARKS',  enabled: true, displayOrder: 8 },
      { sectionType: 'PROMOTION_STATUS',   enabled: true, displayOrder: 9 },
      { sectionType: 'SIGNATURES',         enabled: true, displayOrder: 10 },
    ];
    const examColumns: ExamColumn[] = [
      { examId: 1, examName: 'Periodic Test I',  maxTotal: 20, weightage: 0.10 },
      { examId: 2, examName: 'Mid-Term Exam',    maxTotal: 80, weightage: 0.30 },
      { examId: 3, examName: 'Periodic Test II', maxTotal: 20, weightage: 0.10 },
      { examId: 4, examName: 'Annual Exam',      maxTotal: 80, weightage: 0.50 },
    ];
    const subjectRows: SubjectRow[] = [
      { subjectName: 'English Language & Literature', examMarks: [
          { obtained: 17, max: 20, percentage: 85 },
          { obtained: 63, max: 80, percentage: 78.75 },
          { obtained: 16, max: 20, percentage: 80 },
          { obtained: 61, max: 80, percentage: 76.25 },
        ], weightedPercentage: 78.3 },
      { subjectName: 'Hindi (Course A)', examMarks: [
          { obtained: 15, max: 20, percentage: 75 },
          { obtained: 58, max: 80, percentage: 72.5 },
          { obtained: 14, max: 20, percentage: 70 },
          { obtained: 56, max: 80, percentage: 70 },
        ], weightedPercentage: 71.1 },
      { subjectName: 'Mathematics', examMarks: [
          { obtained: 19, max: 20, percentage: 95 },
          { obtained: 72, max: 80, percentage: 90 },
          { obtained: 18, max: 20, percentage: 90 },
          { obtained: 70, max: 80, percentage: 87.5 },
        ], weightedPercentage: 89.2 },
      { subjectName: 'Science', examMarks: [
          { obtained: 16, max: 20, percentage: 80 },
          { obtained: 60, max: 80, percentage: 75 },
          { obtained: 15, max: 20, percentage: 75 },
          { obtained: 58, max: 80, percentage: 72.5 },
        ], weightedPercentage: 73.8 },
      { subjectName: 'Social Science', examMarks: [
          { obtained: 14, max: 20, percentage: 70 },
          { obtained: 55, max: 80, percentage: 68.75 },
          { obtained: 13, max: 20, percentage: 65 },
          { obtained: 52, max: 80, percentage: 65 },
        ], weightedPercentage: 66.4 },
      { subjectName: 'Computer Science', examMarks: [
          { obtained: 18, max: 20, percentage: 90 },
          { obtained: 68, max: 80, percentage: 85 },
          { obtained: 17, max: 20, percentage: 85 },
          { obtained: 65, max: 80, percentage: 81.25 },
        ], weightedPercentage: 83.5 },
    ];
    return {
      studentId: 'ADM/2016/042',
      studentName: 'Aryan Kumar Sharma',
      rollNumber: '12',
      className: 'Class VIII — A',
      session: '2024-2025',
      fatherName: 'Rajesh Kumar Sharma',
      motherName: 'Sunita Devi Sharma',
      dateOfBirth: '15 August 2011',
      schoolName: 'Sunrise International School',
      schoolAddress: '14, Education Colony, Sector 12, New Delhi — 110001',
      schoolPhone: '+91-11-2345-6789',
      schoolEmail: 'info@sunrise.edu.in',
      affiliationNumber: '2730012',
      gradingSystem: 'CBSE',
      cgpa: 8.2,
      overallGrade: 'B1',
      template: {
        id: -1,
        schoolId: 0,
        name: 'Sample Template',
        assessmentGroupId: 0,
        assessmentGroupName: 'Annual Assessment',
        isDefault: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections,
        brandingJson: JSON.stringify({
          primaryColor: color,
          showCgpa: true,
          layoutStyle,
          schoolMotto: layoutStyle !== 'CLASSIC' ? 'Knowledge · Discipline · Service' : ''
        } as BrandingConfig),
      },
      weightedResult: {
        groupId: 0,
        groupName: 'Annual Assessment',
        groupType: 'EXAM_BASED',
        weightedPercentage: 76.7,
        rank: 3,
        subjectResults: [],
        marksTable: {
          examColumns,
          subjectRows,
          examTotals: [
            { obtained: 99,  max: 120 },
            { obtained: 376, max: 480 },
            { obtained: 93,  max: 120 },
            { obtained: 362, max: 480 },
          ],
        },
      },
      attendance: {
        workingDays: 220,
        presentDays: 198,
        percentage: 90.0,
      },
      teacherRemarks: 'Aryan is a sincere and hardworking student. Shows excellent progress in Mathematics and Science. Needs to focus more on Social Science. Keep up the good work!',
      principalRemarks: 'A promising student with great academic potential. Encouraged to participate actively in co-curricular activities. Best wishes for the future.',
      coScholasticGrades: [
        { activity: 'Discipline & Behaviour',      grade: 'A' },
        { activity: 'Sports & Physical Education',  grade: 'B' },
        { activity: 'Co-Curricular Activities',     grade: 'A' },
        { activity: 'General Hygiene',              grade: 'A' },
      ],
    };
  }

  trackByExamId(index: number, exam: ExamResult): number { return exam.examId; }
  trackByIndex(index: number): number { return index; }
  trackBySection(index: number, section: TemplateSection): string { return section.sectionType; }
}
