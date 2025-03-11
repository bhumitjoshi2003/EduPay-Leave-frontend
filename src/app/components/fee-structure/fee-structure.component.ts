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
  labCharges: number; // Added lab charges
}

@Component({
  selector: 'app-fee-structure',
  standalone: true,
  imports: [CommonModule, FormsModule, BusFeesComponent],
  templateUrl: './fee-structure.component.html',
  styleUrls: ['./fee-structure.component.css']
})
export class FeeStructureComponent implements OnInit {
  feeStructure: FeeStructure[] = [
    { class: 'Nursery', tuitionFee: 10000, admissionFee: 5000, annualCharges: 2000, ecaProject: 1000, examinationFee: 500, labCharges: 0 },
    { class: 'LKG', tuitionFee: 12000, admissionFee: 5500, annualCharges: 2200, ecaProject: 1200, examinationFee: 600, labCharges: 0 },
    { class: 'UKG', tuitionFee: 14000, admissionFee: 6000, annualCharges: 2400, ecaProject: 1400, examinationFee: 700, labCharges: 0 },
    { class: '1st', tuitionFee: 16000, admissionFee: 6500, annualCharges: 2600, ecaProject: 1600, examinationFee: 800, labCharges: 500 },
    { class: '2nd', tuitionFee: 18000, admissionFee: 7000, annualCharges: 2800, ecaProject: 1800, examinationFee: 900, labCharges: 500 },
    { class: '3rd', tuitionFee: 20000, admissionFee: 7500, annualCharges: 3000, ecaProject: 2000, examinationFee: 1000, labCharges: 500 },
  ];

  isEditing = false;
  originalFeeStructure: FeeStructure[] = [];

  ngOnInit(): void {
    this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructure));
  }

  canEdit(): boolean {
    return true;
  }

  edit(): void {
    this.isEditing = true;
  }

  save(): void {
    this.isEditing = false;
    // Implement your save logic here (e.g., send to backend)
    console.log('Fee structure saved:', this.feeStructure);
    this.originalFeeStructure = JSON.parse(JSON.stringify(this.feeStructure));
  }

  cancel(): void {
    this.isEditing = false;
    this.feeStructure = JSON.parse(JSON.stringify(this.originalFeeStructure));
  }
}