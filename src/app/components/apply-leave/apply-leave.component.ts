import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-apply-leave',
  templateUrl: './apply-leave.component.html',
  styleUrls: ['./apply-leave.component.css'],
  imports: [ReactiveFormsModule, CommonModule],
})
export class ApplyLeaveComponent implements OnInit {
  leaveForm: FormGroup;
  leaveApplied: boolean = false;
  errorMessage: string = '';

  constructor(private fb: FormBuilder) {
    this.leaveForm = this.fb.group({
      leaveDate: ['', Validators.required],
      reason: ['', Validators.required],
    });
  }

  ngOnInit(): void {}

  applyLeave(): void {
    if (this.leaveForm.valid) {
      const now = new Date();
      const leaveDate = new Date(this.leaveForm.get('leaveDate')?.value);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sixAMToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0);

      // Clear previous error message
      this.errorMessage = '';

      if (leaveDate < today) {
        this.errorMessage = 'Leave cannot be applied for past dates!';
        return;
      }

      // If applying for today, it must be before 6:00 AM
      if (leaveDate.toDateString() === today.toDateString() && now >= sixAMToday) {
        this.errorMessage = 'Leave for today must be applied before 6:00 AM!';
        return;
      }

      // Leave successfully applied
      this.leaveApplied = true;
      
      // ✅ Reset the form fields after successful leave application
    this.leaveForm.reset();
    }
  }
}
