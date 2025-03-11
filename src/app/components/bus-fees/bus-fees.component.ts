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
  busFees: BusFee[] = [
    { minDistance: 0, maxDistance: 3, fee: 800 },
    { minDistance: 4, maxDistance: 8, fee: 1000 },
    { minDistance: 9, maxDistance: null, fee: 1200 }
  ];

  isEditing = false;
  originalBusFees: BusFee[] = [];

  ngOnInit(): void {
    this.originalBusFees = JSON.parse(JSON.stringify(this.busFees));
  }

  edit(): void {
    this.isEditing = true;
  }

  save(): void {
    this.isEditing = false;
    // Implement your save logic here (e.g., send to backend)
    console.log('Bus fees saved:', this.busFees);
    this.originalBusFees = JSON.parse(JSON.stringify(this.busFees));
  }

  cancel(): void {
    this.isEditing = false;
    this.busFees = JSON.parse(JSON.stringify(this.originalBusFees));
  }
}