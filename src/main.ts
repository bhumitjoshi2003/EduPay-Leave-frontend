import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { KeycloakService } from './app/services/keycloak.service';
import { inject } from '@angular/core';

bootstrapApplication(AppComponent, appConfig).then(appRef => {
  const keycloakService = appRef.injector.get(KeycloakService); 
  return keycloakService.init();
}).then(() => {
  console.log("✅ Keycloak initialized. User can see the home page.");
}).catch((err) => console.error("❌ Bootstrap error:", err));
