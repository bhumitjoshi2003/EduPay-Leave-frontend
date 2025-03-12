import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  authenticated = false;

  constructor(private keycloakService: KeycloakService, private cdr: ChangeDetectorRef,private route: ActivatedRoute,
    private router: Router) {}

  ngOnInit(): void {
    this.keycloakService.authStatus$.subscribe((status) =>{
      this.authenticated = status;
      this.cdr.detectChanges();
    })
  }

  login() {
    this.keycloakService.login(); // Trigger login
    this.keycloakService.authStatus$.subscribe((status) => {
      if (status) 
        this.router.navigate(['/student']);
    });
  }
  
  

  logout() {
    this.keycloakService.logout();
  }
}