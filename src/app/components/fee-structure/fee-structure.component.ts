import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusFeesComponent } from '../bus-fees/bus-fees.component';
import { FeeStructure, FeeStructureService } from '../../services/fee-structure.service';

@Component({
  selector: 'app-fee-structure',
  standalone: true,
  imports: [CommonModule, FormsModule, BusFeesComponent],
  templateUrl: './fee-structure.component.html',
  styleUrls: ['./fee-structure.component.css']
})
export class FeeStructureComponent implements OnInit {
  sessions: string[] = [];
  currentSession: string = '';
  isEditing = false;
  isNewSessionStarted = false;
  newSessionYear: string = '';
  feeStructures: FeeStructure[] = [];
  originalFeeStructure: FeeStructure[] = [];

  constructor(private feeStructureService: FeeStructureService) {}

  ngOnInit(): void {
    this.fetchSessions();
  }

  fetchSessions(): void {
    this.feeStructureService.getAcademicYears().subscribe(sessions => {
      this.sessions = sessions;
      if (this.sessions.length > 0) {
        this.currentSession = this.sessions[this.sessions.length - 1];
        this.fetchFeeStructures();
      }
    });
  }

  fetchFeeStructures(): void {
    this.feeStructureService.getFeeStructures(this.currentSession).subscribe(feeStructures => {
      this.feeStructures = feeStructures;
      this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructures));
    });
  }

  changeSession(session: string): void {
    if (this.isEditing) {
      const confirmChange = confirm("Unsaved changes will be lost. Do you want to continue?");
      if (!confirmChange) return;
    }

    this.currentSession = session;
    this.isEditing = false;
    this.isNewSessionStarted = false;
    this.fetchFeeStructures();
  }

  startNewAcademicYear(): void {
    const nextSession = this.getNextAvailableSession();
    const confirmation = confirm(`Start new academic year ${nextSession}?`);

    if (confirmation) {
      this.isNewSessionStarted = true;
      this.newSessionYear = nextSession;

      const latestSession = this.sessions[this.sessions.length - 1];
      const newFeeStructures = this.feeStructures.map(fee => ({ ...fee, academicYear: nextSession }));

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
    this.feeStructureService.updateFeeStructures(this.currentSession, this.feeStructures).subscribe(() => {
        this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructures));
        console.log(`Fee structure for ${this.currentSession} saved:`, this.feeStructures);
    });
  }

  cancel(): void {
    if (this.isNewSessionStarted) {
      this.sessions.pop();
      this.currentSession = this.sessions[this.sessions.length - 1];
      this.isNewSessionStarted = false;
    }

    this.isEditing = false;
    this.feeStructures = JSON.parse(JSON.stringify(this.originalFeeStructure));
  }

  addRow(): void {
    if (this.isEditing) {
      this.feeStructures.push({
        academicYear: this.currentSession,
        className: 'New Class',
        tuitionFee: 0,
        admissionFee: 0,
        annualCharges: 0,
        ecaProject: 0,
        examinationFee: 0,
        labCharges: 0,
      });
    }
  }

  removeRow(): void {
    if (this.isEditing && this.feeStructures.length > 0) {
      this.feeStructures.pop();
    }
  }
}