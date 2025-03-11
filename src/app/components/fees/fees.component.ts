import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaymentComponent } from "../payment/payment.component";

@Component({
  selector: 'app-payment-tracker',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentComponent],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css']
})
export class PaymentTrackerComponent implements OnInit {
  selectedYear: number = new Date().getFullYear();
  months = [
    { name: 'January', number: 1, paid: true, fee: 100, selected: false },
    { name: 'February', number: 2, paid: false, fee: 100, selected: false },
    { name: 'March', number: 3, paid: false, fee: 100, selected: false },
    { name: 'April', number: 4, paid: true, fee: 1, selected: false },
    { name: 'May', number: 5, paid: false, fee: 1, selected: false },
    { name: 'June', number: 6, paid: true, fee: 1, selected: false },
    { name: 'July', number: 7, paid: false, fee: 100, selected: false },
    { name: 'August', number: 8, paid: false, fee: 100, selected: false },
    { name: 'September', number: 9, paid: true, fee: 100, selected: false },
    { name: 'October', number: 10, paid: false, fee: 100, selected: false },
    { name: 'November', number: 11, paid: false, fee: 100, selected: false },
    { name: 'December', number: 12, paid: true, fee: 100, selected: false }
  ];
  totalAmountToPay: number = 0;
  selectedMonthsByYear: { [year: number]: number[] } = {};

  ngOnInit() {
    this.updateMonthData();
    this.calculateTotalAmount(); // Calculate initial amount
  }

  onYearChange() {
    this.updateMonthData();
  }

  updateMonthData() {
    if (this.selectedMonthsByYear[this.selectedYear]) {
      this.months.forEach(month => {
        month.selected = this.selectedMonthsByYear[this.selectedYear].includes(month.number);
      });
    } else {
      this.months.forEach(month => month.selected = false);
    }
    this.calculateTotalAmount(); // Recalculate on year change
  }

  toggleMonthSelection(month: any) {
    if (!month.paid) {
      month.selected = !month.selected;
      this.updateSelectedMonthsByYear();
      this.calculateTotalAmount(); // Recalculate on selection change
    }
  }

  updateSelectedMonthsByYear() {
    this.selectedMonthsByYear[this.selectedYear] = this.months
      .filter(month => month.selected)
      .map(month => month.number);
  }

  calculateTotalAmount() {
    this.totalAmountToPay = 0;
    Object.keys(this.selectedMonthsByYear).forEach((yearKey) => {
      const year = parseInt(yearKey, 10);
      if (this.selectedMonthsByYear[year]) {
        this.selectedMonthsByYear[year].forEach((monthNumber) => {
          const month = this.months.find((m) => m.number === monthNumber);
          if (month) {
            this.totalAmountToPay += month.fee;
          }
        });
      }
    });
  }
}