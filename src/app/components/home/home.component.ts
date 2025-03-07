import { ChangeDetectorRef, Component } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  authenticated = false;

  constructor(private keycloakService: KeycloakService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.keycloakService.authStatus$.subscribe(authenticated =>{
      this.authenticated = authenticated;
      this.cdr.detectChanges();
    })
  }

  login() {
    this.keycloakService.login();
  }

  logout() {
    this.keycloakService.logout();
  }
}