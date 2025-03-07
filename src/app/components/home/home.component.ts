import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  authenticated = false;

  constructor(private keycloakService: KeycloakService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.keycloakService.authStatus$.subscribe((status) =>{
      this.authenticated = status;
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