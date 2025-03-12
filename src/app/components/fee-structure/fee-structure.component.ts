import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusFeesComponent } from '../bus-fees/bus-fees.component'; // Adjust path

interface FeeStructure {
  class: string;
  tuitionFee: number;
  admissionFee: number;
  annualCharges: number;
  ecaProject: number;
  examinationFee: number;
  labCharges: number;
}

@Component({
  selector: 'app-fee-structure',
  standalone: true,
  imports: [CommonModule, FormsModule, BusFeesComponent],
  templateUrl: './fee-structure.component.html',
  styleUrls: ['./fee-structure.component.css']
})
export class FeeStructureComponent implements OnInit {
  sessions: string[] = ['2023-24', '2024-25']; // Existing sessions
  currentSession: string = '2024-25'; // Default selected session
  isEditing = false;
  isNewSessionStarted = false;
  newSessionYear: string = '';

  feeStructures: { [key: string]: FeeStructure[] } = {
    '2023-24': [
      { class: 'Nursery', tuitionFee: 10000, admissionFee: 5000, annualCharges: 2000, ecaProject: 1000, examinationFee: 500, labCharges: 0 },
      { class: 'LKG', tuitionFee: 12000, admissionFee: 5500, annualCharges: 2200, ecaProject: 1200, examinationFee: 600, labCharges: 0 },
      { class: 'UKG', tuitionFee: 14000, admissionFee: 6000, annualCharges: 2400, ecaProject: 1400, examinationFee: 700, labCharges: 0 },
    ],
    '2024-25': [
      { class: 'Nursery', tuitionFee: 11000, admissionFee: 5500, annualCharges: 2500, ecaProject: 1200, examinationFee: 600, labCharges: 0 },
      { class: 'LKG', tuitionFee: 13000, admissionFee: 6000, annualCharges: 2700, ecaProject: 1500, examinationFee: 700, labCharges: 0 },
      { class: 'UKG', tuitionFee: 15000, admissionFee: 6500, annualCharges: 2900, ecaProject: 1700, examinationFee: 800, labCharges: 0 },
    ]
  };

  originalFeeStructure: FeeStructure[] = [];

  ngOnInit(): void {
    this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructures[this.currentSession]));
  }

  changeSession(session: string): void {
    if (this.isEditing) {
      const confirmChange = confirm("Unsaved changes will be lost. Do you want to continue?");
      if (!confirmChange) return;
    }

    this.currentSession = session;
    this.isEditing = false;
    this.isNewSessionStarted = false;
    this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructures[this.currentSession]));
  }

  startNewAcademicYear(): void {
    const nextSession = this.getNextAvailableSession();
    const confirmation = confirm(`Start new academic year ${nextSession}?`);
  
    if (confirmation) {
      this.isNewSessionStarted = true;
      this.newSessionYear = nextSession;
  
      // ✅ Clone the most recent EXISTING session instead of the selected session
      const latestSession = this.sessions[this.sessions.length - 1];
  
      this.feeStructures[nextSession] = this.feeStructures[latestSession].map(fee => ({ ...fee }));
  
      // ✅ Add session only after confirmation
      this.sessions.push(nextSession);
      this.currentSession = nextSession;
      this.isEditing = true;
    }
  }
  

  getNextAvailableSession(): string {
    let [startYear, endYear] = this.sessions[this.sessions.length - 1].split('-').map(Number);

    while (this.sessions.includes(`${startYear + 1}-${endYear + 1}`)) {
      startYear++;
      endYear++;
    }

    return `${startYear + 1}-${endYear + 1}`;
  }

  edit(): void {
    this.isEditing = true;
  }

  save(): void {
    this.isEditing = false;
    this.isNewSessionStarted = false;
    this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructures[this.currentSession]));
    console.log(`Fee structure for ${this.currentSession} saved:`, this.feeStructures[this.currentSession]);
  }

  cancel(): void {
    if (this.isNewSessionStarted) {
      // ✅ Remove the newly added session from sessions list
      this.sessions.pop();
      
      // ✅ Ensure no accidental copy happens
      delete this.feeStructures[this.currentSession];
  
      // ✅ Revert to the last existing session
      this.currentSession = this.sessions[this.sessions.length - 1];
      this.isNewSessionStarted = false;
    }
  
    this.isEditing = false;
  }
  
}
