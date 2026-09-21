import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchoolService } from './school.service';
import { environment } from '../../environments/environment';

/**
 * Covers the Phase 2 direct-to-object-storage upload flow's client-side contract for the two
 * school-level (no per-entity id below the school itself) categories: logo and report-card
 * header. See teacher.service.spec.ts for the exhaustive version of this same shared contract.
 */
describe('SchoolService — direct-to-object-storage uploads', () => {
  let service: SchoolService;
  let http: HttpTestingController;

  const uploadRequestUrl = `${environment.apiUrl}/files/upload-request`;
  const completeUrl = `${environment.apiUrl}/files/complete`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SchoolService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function aFile(): File {
    return new File(['fake-image-bytes'], 'logo.png', { type: 'image/png' });
  }

  describe('uploadLogoDirect', () => {
    const presignedPutUrl = 'https://object-storage.example.com/bucket/schools/1/school/logo/uuid.png?X-Amz-Signature=abc';
    const uploadRequestResponse = {
      objectKey: 'schools/1/school/logo/uuid.png',
      uploadUrl: presignedPutUrl,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      requiredHeaders: { 'Content-Type': 'image/png' },
    };

    it('requests a presigned upload URL with SCHOOL_LOGO purpose and the fixed "self" entityId', () => {
      service.uploadLogoDirect(aFile()).subscribe();

      const req = http.expectOne(uploadRequestUrl);
      expect(req.request.body).toEqual({
        purpose: 'SCHOOL_LOGO',
        entityId: 'self',
        fileName: 'logo.png',
        contentType: 'image/png',
        size: aFile().size,
      });

      req.flush(uploadRequestResponse);
      http.expectOne(presignedPutUrl).flush({});
      http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
    });

    it('PUTs the file directly to object storage — never through our own backend', () => {
      const file = aFile();
      service.uploadLogoDirect(file).subscribe();
      http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);

      const putReq = http.expectOne(presignedPutUrl);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body).toBe(file);
      expect(putReq.request.url).not.toContain(environment.apiUrl);

      putReq.flush({});
      http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
    });

    it('the legacy multipart upload method still exists and is untouched (rollback path)', () => {
      service.uploadLogo(aFile()).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/school/logo`);
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush({ logoUrl: '/uploads/school-logos/1.png' });
    });
  });

  describe('uploadReportCardHeaderDirect', () => {
    const presignedPutUrl = 'https://object-storage.example.com/bucket/schools/1/school/report-card-header/uuid.png?X-Amz-Signature=abc';
    const uploadRequestResponse = {
      objectKey: 'schools/1/school/report-card-header/uuid.png',
      uploadUrl: presignedPutUrl,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      requiredHeaders: { 'Content-Type': 'image/png' },
    };

    it('requests a presigned upload URL with REPORT_CARD_HEADER_IMAGE purpose and the fixed "self" entityId', () => {
      service.uploadReportCardHeaderDirect(aFile()).subscribe();

      const req = http.expectOne(uploadRequestUrl);
      expect(req.request.body).toEqual({
        purpose: 'REPORT_CARD_HEADER_IMAGE',
        entityId: 'self',
        fileName: 'logo.png',
        contentType: 'image/png',
        size: aFile().size,
      });

      req.flush(uploadRequestResponse);
      http.expectOne(presignedPutUrl).flush({});
      http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
    });

    it('the legacy multipart upload method still exists and is untouched (rollback path)', () => {
      service.uploadReportCardHeader(aFile()).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/school/report-card-header`);
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush({ headerImageUrl: '/uploads/report-card-headers/1.png' });
    });
  });
});
