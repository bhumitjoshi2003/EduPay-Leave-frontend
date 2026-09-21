import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StudentService } from './student.service';
import { environment } from '../../environments/environment';

/**
 * Covers the Phase 2 direct-to-object-storage upload flow's client-side contract for student
 * photos — see teacher.service.spec.ts for the exhaustive version of this same shared contract
 * (presign → direct PUT → complete); this file only proves the STUDENT_PROFILE_PHOTO-specific
 * wiring (purpose/entityId, and that the legacy multipart method is untouched).
 */
describe('StudentService — uploadStudentPhotoDirect', () => {
  let service: StudentService;
  let http: HttpTestingController;

  const uploadRequestUrl = `${environment.apiUrl}/files/upload-request`;
  const completeUrl = `${environment.apiUrl}/files/complete`;
  const presignedPutUrl = 'https://object-storage.example.com/bucket/schools/1/students/S1/profile/uuid.jpg?X-Amz-Signature=abc';

  const uploadRequestResponse = {
    objectKey: 'schools/1/students/S1/profile/uuid.jpg',
    uploadUrl: presignedPutUrl,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    requiredHeaders: { 'Content-Type': 'image/jpeg' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(StudentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function aFile(): File {
    return new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
  }

  it('requests a presigned upload URL first, with STUDENT_PROFILE_PHOTO purpose and the correct entityId', () => {
    service.uploadStudentPhotoDirect('S1', aFile()).subscribe();

    const req = http.expectOne(uploadRequestUrl);
    expect(req.request.body).toEqual({
      purpose: 'STUDENT_PROFILE_PHOTO',
      entityId: 'S1',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      size: aFile().size,
    });

    req.flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush({});
    http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
  });

  it('PUTs the file directly to object storage — never through our own backend', () => {
    const file = aFile();
    service.uploadStudentPhotoDirect('S1', file).subscribe();
    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);

    const putReq = http.expectOne(presignedPutUrl);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toBe(file);
    expect(putReq.request.url).not.toContain(environment.apiUrl);

    putReq.flush({});
    http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
  });

  it('calls completion only after the direct PUT succeeds, with the exact objectKey/entityId', () => {
    service.uploadStudentPhotoDirect('S1', aFile()).subscribe();
    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush({});

    const completeReq = http.expectOne(completeUrl);
    expect(completeReq.request.body).toEqual({
      objectKey: uploadRequestResponse.objectKey,
      purpose: 'STUDENT_PROFILE_PHOTO',
      entityId: 'S1',
    });
    completeReq.flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
  });

  it('a failed direct PUT propagates as an error and never calls completion', () => {
    let sawError = false;
    service.uploadStudentPhotoDirect('S1', aFile()).subscribe({ error: () => { sawError = true; } });

    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush('storage error', { status: 500, statusText: 'Internal Server Error' });

    expect(sawError).toBeTrue();
    http.expectNone(completeUrl);
  });

  it('the legacy multipart upload method still exists and is untouched (rollback path)', () => {
    service.uploadStudentPhoto('S1', aFile()).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/students/S1/photo`);
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ photoUrl: '/uploads/student-photos/S1.jpg' });
  });
});
