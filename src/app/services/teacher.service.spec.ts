import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TeacherService } from './teacher.service';
import { environment } from '../../environments/environment';

/**
 * Covers the Phase 1 direct-to-object-storage upload flow's client-side contract: presign →
 * PUT directly to object storage (never through our own backend) → complete. See
 * FileUploadRequestService on the backend for the authorization/verification this pairs with.
 */
describe('TeacherService — uploadTeacherPhotoDirect', () => {
  let service: TeacherService;
  let http: HttpTestingController;

  const uploadRequestUrl = `${environment.apiUrl}/files/upload-request`;
  const completeUrl = `${environment.apiUrl}/files/complete`;
  const presignedPutUrl = 'https://object-storage.example.com/bucket/schools/1/teachers/T1/profile/uuid.jpg?X-Amz-Signature=abc';

  const uploadRequestResponse = {
    objectKey: 'schools/1/teachers/T1/profile/uuid.jpg',
    uploadUrl: presignedPutUrl,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    requiredHeaders: { 'Content-Type': 'image/jpeg' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(TeacherService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function aFile(): File {
    return new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
  }

  it('requests a presigned upload URL first, with the correct purpose/entity/content metadata', () => {
    service.uploadTeacherPhotoDirect('T1', aFile()).subscribe();

    const req = http.expectOne(uploadRequestUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      purpose: 'TEACHER_PROFILE_PHOTO',
      entityId: 'T1',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      size: aFile().size,
    });

    req.flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush({});
    http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
  });

  it('PUTs the file directly to the returned presigned URL — never to our own /api/teachers/.../photo endpoint', () => {
    const file = aFile();
    service.uploadTeacherPhotoDirect('T1', file).subscribe();
    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);

    const putReq = http.expectOne(presignedPutUrl);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toBe(file);
    expect(putReq.request.url).not.toContain(environment.apiUrl);
    expect(putReq.request.headers.get('Content-Type')).toBe('image/jpeg');

    putReq.flush({});
    http.expectOne(completeUrl).flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });
  });

  it('calls the completion endpoint only after the direct PUT succeeds, with the exact objectKey', () => {
    let completed = false;
    service.uploadTeacherPhotoDirect('T1', aFile()).subscribe(() => { completed = true; });

    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);
    http.match(completeUrl); // nothing sent yet — assert no premature completion call
    expect(completed).toBeFalse();

    http.expectOne(presignedPutUrl).flush({});

    const completeReq = http.expectOne(completeUrl);
    expect(completeReq.request.body).toEqual({
      objectKey: uploadRequestResponse.objectKey,
      purpose: 'TEACHER_PROFILE_PHOTO',
      entityId: 'T1',
    });
    completeReq.flush({ objectKey: uploadRequestResponse.objectKey, displayUrl: 'https://object-storage.example.com/signed-get' });

    expect(completed).toBeTrue();
  });

  it('a failed direct PUT propagates as an error and never calls the completion endpoint', () => {
    let sawError = false;
    service.uploadTeacherPhotoDirect('T1', aFile()).subscribe({
      error: () => { sawError = true; },
    });

    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush('storage error', { status: 500, statusText: 'Internal Server Error' });

    expect(sawError).toBeTrue();
    http.expectNone(completeUrl);
  });

  it('a failed upload-request never attempts a PUT at all', () => {
    let sawError = false;
    service.uploadTeacherPhotoDirect('T1', aFile()).subscribe({
      error: () => { sawError = true; },
    });

    http.expectOne(uploadRequestUrl).flush('denied', { status: 403, statusText: 'Forbidden' });

    expect(sawError).toBeTrue();
    http.expectNone(presignedPutUrl);
  });

  it('a failed completion call still propagates as an error (photo bytes uploaded but not yet attached)', () => {
    let sawError = false;
    service.uploadTeacherPhotoDirect('T1', aFile()).subscribe({
      error: () => { sawError = true; },
    });

    http.expectOne(uploadRequestUrl).flush(uploadRequestResponse);
    http.expectOne(presignedPutUrl).flush({});
    http.expectOne(completeUrl).flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(sawError).toBeTrue();
  });

  it('the legacy multipart upload method still exists and is untouched (rollback path)', () => {
    service.uploadTeacherPhoto('T1', aFile()).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/teachers/T1/photo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ photoUrl: '/uploads/teacher-photos/T1.jpg' });
  });
});
