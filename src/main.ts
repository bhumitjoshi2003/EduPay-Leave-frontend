import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { KeycloakService } from './app/services/keycloak.service';

const keycloakService = new KeycloakService();

keycloakService.init().then(() => {

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error('Bootstrap error:', err));
});
