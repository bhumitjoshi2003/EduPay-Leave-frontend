import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface PublicSchoolInfo {
  name: string;
  slug: string;
  logoUrl: string | null;
  themeColor: string | null;
  city: string | null;
  boardType: string | null;
}

/**
 * Reads the school slug from the current subdomain on app init,
 * fetches public school branding from the backend, and exposes it
 * to components (primarily the login page).
 *
 * On root domain (edunexify.co.in) or localhost: school is null → marketing page shown.
 * On school subdomain (indraacademy.edunexify.co.in): school is populated → branded login shown.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {

  private readonly BASE_DOMAIN = 'edunexify.co.in';
  private _school: PublicSchoolInfo | null = null;
  private _slug: string | null = null;

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  get isBranded(): boolean { return this._school !== null; }
  get school(): PublicSchoolInfo | null { return this._school; }
  get slug(): string | null { return this._slug; }

  /**
   * Called once during APP_INITIALIZER before the app renders.
   * Resolves silently — a failed fetch just means no branding (shows marketing page).
   */
  init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve();

    const slug = this.extractSlug();
    if (!slug) return Promise.resolve();

    this._slug = slug;

    return this.http
      .get<PublicSchoolInfo>(`${environment.apiUrl}/public/school/${slug}`)
      .toPromise()
      .then(info => { this._school = info ?? null; })
      .catch(() => { this._school = null; });
  }

  /**
   * Returns the full URL for a school logo, handling both absolute URLs
   * and relative paths served from the backend.
   */
  getLogoUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${environment.apiUrl}${path}`;
  }

  /**
   * Builds the full URL for a school subdomain.
   * e.g. buildSchoolUrl('childrens-academy', '/dashboard')
   *   → 'https://childrens-academy.edunexify.co.in/dashboard'
   */
  buildSchoolUrl(slug: string, path = ''): string {
    const { protocol, port } = window.location;
    return `${protocol}//${slug}.${this.BASE_DOMAIN}${port ? ':' + port : ''}${path}`;
  }

  private extractSlug(): string | null {
    const hostname = window.location.hostname;

    // Strip port (e.g. localhost:4200)
    const host = hostname.split(':')[0];

    // Must end with .<baseDomain> to be a school subdomain
    if (!host.endsWith(`.${this.BASE_DOMAIN}`)) return null;

    const slug = host.slice(0, host.length - this.BASE_DOMAIN.length - 1);

    // Reject empty or nested subdomains
    if (!slug || slug.includes('.')) return null;

    return slug;
  }
}
