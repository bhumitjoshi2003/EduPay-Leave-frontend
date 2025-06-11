// event-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, FormArray } from '@angular/forms'; // <--- ADD FormArray HERE
import { EventService } from '../../services/event.service';
import { Event } from '../../interfaces/event-calendar.component';
import { Router, ActivatedRoute } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export const dateRangeValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return { 'dateRangeInvalid': true };
    }
  }
  return null;
};

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule
  ]
})
export class EventFormComponent implements OnInit {

  eventForm: FormGroup;
  isEditMode: boolean = false;
  eventId: number | null = null;

  categories: string[] = ['Academic', 'Sports', 'Cultural', 'Social', 'Holiday', 'Meeting', 'Other'];
  targetAudiences: string[] = ['All', 'Teachers', 'Students', 'Nursery', 'LGK', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      startTime: [''],
      endTime: [''],
      location: [''],
      category: ['', Validators.required],
      targetAudience: [[], Validators.required], // Correct for mat-select multiple
      videoLinks: this.fb.array([]) // <--- Initialize as an empty FormArray
    }, { validators: dateRangeValidator });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.eventId = +id;
        this.isEditMode = true;
        this.loadEventData(this.eventId);
      }
    });
  }

  loadEventData(id: number): void {
    this.eventService.getEventById(id).subscribe({
      next: (event: Event) => {
        // Clear existing videoLinks controls if any
        while (this.videoLinks.length !== 0) {
          this.videoLinks.removeAt(0);
        }
        // Add controls for each video link from the loaded event
        event.videoLinks?.forEach(link => this.videoLinks.push(this.fb.control(link)));

        this.eventForm.patchValue({
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          category: event.category,
          targetAudience: event.targetAudience, // This should already be an array
          // videoLinks is now handled by the FormArray above, so no patchValue needed here
        });
      },
      error: (err) => {
        console.error('Error loading event for edit:', err);
      }
    });
  }

  // Getter for videoLinks FormArray (similar to event-calendar.component.ts)
  get videoLinks(): FormArray {
    return this.eventForm.get('videoLinks') as FormArray;
  }

  // Methods to add/remove video links dynamically
  addVideoLink(): void {
    this.videoLinks.push(this.fb.control(''));
  }

  removeVideoLink(index: number): void {
    this.videoLinks.removeAt(index);
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      const eventData: Event = this.eventForm.value; // FormArray handles videoLinks automatically
      // No manual splitting/mapping for videoLinks or targetAudience needed here
      // as form controls will provide the correct types.

      if (this.isEditMode && this.eventId !== null) {
        this.eventService.updateEvent(this.eventId, eventData).subscribe({
          next: (response) => {
            console.log('Event updated successfully:', response);
            this.router.navigate(['/dashboard/event-calendar']);
          },
          error: (err) => {
            console.error('Error updating event:', err);
          }
        });
      } else {
        this.eventService.createEvent(eventData).subscribe({
          next: (response) => {
            console.log('Event created successfully:', response);
            this.router.navigate(['/dashboard/event-calendar']);
          },
          error: (err) => {
            console.error('Error creating event:', err);
          }
        });
      }
    } else {
      console.error('Form is invalid. Please check all fields, including date ranges.');
      this.eventForm.markAllAsTouched();
    }
  }

  hasError(controlName: string, errorType: string): boolean | null {
    const control = this.eventForm.get(controlName);
    return control && control.hasError(errorType) && control.touched;
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/event-calendar']);
  }
}