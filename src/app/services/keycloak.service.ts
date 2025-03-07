import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

@Injectable({ providedIn: 'root' })
export class KeycloakService {
  private keycloak = new Keycloak({
    url: 'http://localhost:8080', // ✅ Ensure it's HTTP (unless using SSL)
    realm: 'ias',
    clientId: 'ias-client'
  });

  async init(): Promise<boolean> {
    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false
      });
  
      if (authenticated) {
        console.log('Access Token:', this.keycloak.token); // ✅ Log the token
        console.log('ID Token:', this.keycloak.idToken);
        console.log('Refresh Token:', this.keycloak.refreshToken);
      }
      else{
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

  logout(): void {
    this.keycloak.logout();
  }
}
