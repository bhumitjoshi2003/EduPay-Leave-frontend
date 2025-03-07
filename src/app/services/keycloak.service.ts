import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KeycloakService {

  private keycloak!: Keycloak;
  private authStatus = new BehaviorSubject<boolean>(false);
  authStatus$ = this.authStatus.asObservable();

  async init(): Promise<boolean> {
    this.keycloak = new Keycloak({
    url: 'http://localhost:8080', // ✅ Ensure it's HTTP (unless using SSL)
    realm: 'ias',
    clientId: 'ias-client'
  });

  try {
    const authenticated = await this.keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256'
    });

    
    if (authenticated) {
      console.log('Access Token:', this.keycloak.token);
      console.log('ID Token:', this.keycloak.idToken);
      console.log('Refresh Token:', this.keycloak.refreshToken);
      console.log('Authenticated:', this.keycloak.authenticated);

      // 🔥 Automatically refresh token before it expires
      this.scheduleTokenRefresh();
    } else {
      console.log("NOT AUTHENTICATED");
    }
    

    return authenticated;
  } catch (error) {
    console.error('Keycloak initialization failed', error);
    return false;
  }
}

  getToken(): string | null {
    return this.keycloak.token ?? null;
  }

  async refreshToken(): Promise<void> {
    try {
      await this.keycloak.updateToken(30); // Refresh token if it's about to expire in 30s
      console.log("Token refreshed!");
    } catch (error) {
      console.error("Failed to refresh token", error);
    }
  }

  private scheduleTokenRefresh(): void {
    setInterval(async () => {
      if (this.keycloak.token) {
        await this.refreshToken();
      }
    }, 60000); // 🔄 Refresh token every 1 minute
  }

  login(): void {
    this.keycloak.login();
  }

  logout(): void {
    this.keycloak.logout();
  }

  isAuthenticated(): boolean {
    return this.keycloak.authenticated ?? false;
  }
}
