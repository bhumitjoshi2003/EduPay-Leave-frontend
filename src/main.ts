import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { KeycloakService } from './app/services/keycloak.service';

const keycloakService = new KeycloakService();

keycloakService.init().then((authenticated: boolean) => {
  if (authenticated) {
    bootstrapApplication(AppComponent, appConfig)
      .catch((err) => console.error(err));
  } else {
    console.error('User is not authenticated');
  }
});
