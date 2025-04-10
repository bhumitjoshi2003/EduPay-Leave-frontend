import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusFeesService, BusFee } from '../../services/bus-fees.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-bus-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus-fees.component.html',
  styleUrls: ['./bus-fees.component.css']
})
export class BusFeesComponent implements OnInit {
  academicYears: string[] = [];
  currentSession: string = '';
  isNewSession: boolean = false;
  busFeeStructures: BusFee[] = [];
  isEditing = false;
  originalBusFees: BusFee[] = [];

  constructor(private busFeesService: BusFeesService) {}

  ngOnInit(): void {
    this.fetchAcademicYears();
  }

  fetchAcademicYears(): void {
    this.busFeesService.getAcademicYears().subscribe(years => {
      this.academicYears = years;
      if (this.academicYears.length > 0) {
        this.currentSession = this.academicYears[this.academicYears.length - 1]; 
        this.fetchBusFees();
      }
    });
  }

  fetchBusFees(): void {
    this.busFeesService.getBusFees(this.currentSession).subscribe(fees => {
      this.busFeeStructures = fees;
      this.originalBusFees = JSON.parse(JSON.stringify(this.busFeeStructures));
    });
  }

  changeSession(session: string): void {
    if (this.isEditing) {
      const confirmChange = confirm("Unsaved changes will be lost. Do you want to continue?");
      if (!confirmChange) return;
    }
    this.currentSession = session;
    this.isNewSession = false;
    this.isEditing = false;
    this.fetchBusFees();
  }

  startNewAcademicYear(): void {
    const lastSession = this.academicYears[this.academicYears.length - 1];
    const [lastYearStr] = lastSession.split('-');
    const lastYear = parseInt(lastYearStr);
    const newYear = `${lastYear+1}-${lastYear+2}`;

    const confirmation = confirm(`Start new academic year ${newYear}?`);

    if (confirmation) {
      if (this.academicYears.includes(newYear)) {
        alert("This academic year already exists.");
        return;
      }
      this.academicYears.push(newYear);
      this.fetchBusFees();
      this.currentSession = newYear;
      this.isEditing = true;
      this.isNewSession = true;
    }
  }

  addRow(): void {
    this.busFeeStructures.push({
      academicYear: this.currentSession,
      minDistance: 0,
      maxDistance: null,
      fees: 0,
    });
  }

  removeRow(): void {
    if (this.busFeeStructures.length > 0) {
      this.busFeeStructures.pop();
    }
  }

  edit(): void {
    this.isEditing = true;
  }

  save(): void {
    this.isEditing = false;
    this.isNewSession = false;
    this.busFeesService.updateBusFees(this.currentSession, this.busFeeStructures).subscribe(() => {
      this.originalBusFees = JSON.parse(JSON.stringify(this.busFeeStructures));
      console.log(`Bus fee structure for ${this.currentSession} saved:`, this.busFeeStructures);
    });
  }

  cancel(): void {
    if (this.isNewSession) {
      this.academicYears.pop();
      this.currentSession = this.academicYears[this.academicYears.length - 1];
      this.isNewSession = false;
    }
    this.isEditing = false;
    this.busFeeStructures = JSON.parse(JSON.stringify(this.originalBusFees));
  }

  canEdit(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      if(decodedToken.role === "ADMIN") return true;
    }
    return false;
  }

  getFormattedSession(session: string): string {
    const parts = session.split('-');
    return `${parts[0]}-${parts[1].slice(2)}`; 
  }
}