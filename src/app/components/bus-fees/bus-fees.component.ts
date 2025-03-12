import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BusFee {
  minDistance: number;
  maxDistance: number | null;
  fee: number;
}

@Component({
  selector: 'app-bus-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus-fees.component.html',
  styleUrls: ['./bus-fees.component.css']
})
export class BusFeesComponent implements OnInit {
  sessions: string[] = ['2023-24', '2024-25']; // Available academic sessions
  currentSession: string = '2024-25'; // Default selected session
  isNewSession: boolean = false; // Track if a new session is being created

  busFeeStructures: { [key: string]: BusFee[] } = {
    '2023-24': [
      { minDistance: 0, maxDistance: 3, fee: 800 },
      { minDistance: 4, maxDistance: 8, fee: 1000 },
      { minDistance: 9, maxDistance: null, fee: 1200 }
    ],
    '2024-25': [
      { minDistance: 0, maxDistance: 3, fee: 900 },
      { minDistance: 4, maxDistance: 8, fee: 1100 },
      { minDistance: 9, maxDistance: null, fee: 1300 }
    ]
  };

  isEditing = false;
  originalBusFees: BusFee[] = [];

  ngOnInit(): void {
    this.originalBusFees = JSON.parse(JSON.stringify(this.busFeeStructures[this.currentSession]));
  }

  canEdit(): boolean {
    return true;
  }

  changeSession(session: string): void {
    if (this.isEditing) {
      const confirmChange = confirm("Unsaved changes will be lost. Do you want to continue?");
      if (!confirmChange) return;
    }

    this.currentSession = session;
    this.isNewSession = false;
    this.isEditing = false;
    this.originalBusFees = JSON.parse(JSON.stringify(this.busFeeStructures[this.currentSession]));
  }

  startNewAcademicYear(): void {
    const lastSession = this.sessions[this.sessions.length - 1];
    const [lastYear] = lastSession.split('-'); 
    const newYear = `${parseInt(lastYear) + 1}-${parseInt(lastYear) + 2}`;

    const confirmation = confirm(`Start new academic year ${newYear}?`);

    if(confirmation){
      if (this.sessions.includes(newYear)){
          alert("This academic year already exists.");
          return;
        }

        this.sessions.push(newYear);
        this.busFeeStructures[newYear] = JSON.parse(JSON.stringify(this.busFeeStructures[lastSession])); // Copy last year's fees
        this.currentSession = newYear;
        this.isEditing = true;
        this.isNewSession = true;
      }
  }

  edit(): void {
    this.isEditing = true;
  }

  save(): void {
    this.isEditing = false;
    this.isNewSession = false;
    this.originalBusFees = JSON.parse(JSON.stringify(this.busFeeStructures[this.currentSession]));
    console.log(`Bus fee structure for ${this.currentSession} saved:`, this.busFeeStructures[this.currentSession]);
  }

  cancel(): void {
    if (this.isNewSession) {
      delete this.busFeeStructures[this.currentSession]; 
      this.sessions.pop(); 
      this.currentSession = this.sessions[this.sessions.length - 1];
      this.isNewSession = false;
    }

    this.isEditing = false;
  }
}
