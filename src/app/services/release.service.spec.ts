import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReleaseService } from './release.service';
import { environment } from '../../environments/environment';

describe('ReleaseService', () => {
  let service: ReleaseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ReleaseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getLatest calls GET /releases/latest', () => {
    service.getLatest().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/releases/latest`);
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('getAll calls GET /releases', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/releases`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
