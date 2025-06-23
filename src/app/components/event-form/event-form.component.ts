import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'; // <-- ADDED ViewChild, ElementRef
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, FormArray } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { CalendarEvent } from '../../interfaces/event-calendar.component';
import { Router, ActivatedRoute } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

export const dateRangeValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Convert dates to YYYY-MM-DD for accurate comparison if they are strings
    const startDateStr = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString().split('T')[0];
    const endDateStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0];


    if (endDateStr < startDateStr) { // Compare as strings for YYYY-MM-DD
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
  targetAudiences: string[] = ['ALL', 'TEACHERS', 'STUDENTS', 'NURSERY', 'LGK', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  // Image related properties
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  // No need for currentEventImageUrl if imageUrl in form handles all states

  @ViewChild('fileInput') fileInput!: ElementRef; // <-- ADDED: Reference to the HTML file input

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
      endDate: ['', Validators.required],
      startTime: [''],
      endTime: [''],
      location: [''],
      category: ['', Validators.required],
      targetAudience: [[], Validators.required],
      videoLinks: this.fb.array([]),
      imageUrl: [null] // This will hold the URL string (existing or new) or null for removal
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

  // Helper to get full image URL for display
  getFullImageUrl(relativePath: string | null | undefined): string {
    if (!relativePath) {
      return '';
    }
    // Ensure the path is correct if relativePath already includes '/api/files/event-images/'
    // You might need to adjust this based on how your backend generates the relativePath
    if (relativePath.startsWith('/api/files/event-images/')) {
      return `${environment.apiUrl}${relativePath}`;
    }
    return `${environment.apiUrl}/api/files/event-images/${relativePath}`; // Common format if backend returns just filename
  }


  loadEventData(id: number): void {
    this.eventService.getEventById(id).subscribe({
      next: (event: CalendarEvent) => {
        // Clear existing video links before adding new ones
        while (this.videoLinks.length !== 0) {
          this.videoLinks.removeAt(0);
        }
        // Add video links from fetched event
        event.videoLinks?.forEach(link => this.videoLinks.push(this.fb.control(link)));

        // Patch form values
        this.eventForm.patchValue({
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          category: event.category,
          targetAudience: Array.isArray(event.targetAudience) ? event.targetAudience : (event.targetAudience ? [event.targetAudience] : []),
          imageUrl: event.imageUrl // Patch existing imageUrl directly into the form control
        });

        // Reset component state related to new file selection
        this.selectedFile = null;
        this.imagePreviewUrl = null;
        // Also clear the native file input visually to avoid confusion
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
      error: (err) => {
        console.error('Error loading event for edit:', err);
        // Handle error, e.g., navigate away or show an error message
      }
    });
  }

  get videoLinks(): FormArray {
    return this.eventForm.get('videoLinks') as FormArray;
  }

  addVideoLink(): void {
    this.videoLinks.push(this.fb.control(''));
  }

  removeVideoLink(index: number): void {
    this.videoLinks.removeAt(index);
  }

  // --- MODIFIED: Image file selection handler ---
  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.selectedFile = file;

      // Generate preview for the newly selected image
      const reader = new FileReader();
      reader.onload = e => this.imagePreviewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);

      // CRITICAL: When a new file is selected, nullify the imageUrl in the form control.
      // This signifies that the *existing* image (if any) is to be replaced by the new file,
      // or if the new file is later removed, the imageUrl should be null.
      this.eventForm.get('imageUrl')?.setValue(null);

    } else {
      // Case where the user opens the file dialog but cancels, or clears the input
      this.selectedFile = null;
      this.imagePreviewUrl = null;

      // If in edit mode and there was an existing image URL from original load,
      // and no new file was chosen, revert the form's imageUrl to the original.
      // This is crucial if the user selects a file and then cancels, they should
      // revert to the previously saved image, not have it removed.
      // The `imageUrl` form control's value reflects what will be sent to the backend.
      // It will be correctly set by `loadEventData` initially.
      // So, if no new file is chosen, its value should remain as it was loaded or as it was previously set.
      // We explicitly set it to null only if the 'removeImage' button is clicked.
    }
  }

  // --- MODIFIED: Remove image handler ---
  removeImage(): void {
    // 1. Clear component state for new file selection/preview
    this.selectedFile = null;
    this.imagePreviewUrl = null;

    // 2. CRITICAL: Explicitly set the imageUrl in the Reactive Form to null.
    // This value will be sent to the backend to remove the image association.
    this.eventForm.get('imageUrl')?.setValue(null);

    // 3. Reset the native HTML file input element.
    // This clears the visually selected file name from the input field.
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      // Get a copy of current form values
      const rawFormValue = this.eventForm.value;

      // Process targetAudience to ensure it's always an array of strings
      let processedTargetAudience: string[] = [];
      const formTargetAudience = rawFormValue.targetAudience;

      if (Array.isArray(formTargetAudience)) {
        processedTargetAudience = formTargetAudience.map(s => String(s).trim().toUpperCase()).filter(s => s);
      } else if (typeof formTargetAudience === 'string' && formTargetAudience.length > 0) {
        processedTargetAudience = formTargetAudience.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      }

      // Prepare event data for backend
      const eventData: CalendarEvent = {
        ...rawFormValue,
        targetAudience: processedTargetAudience
      };

      // Convert dates to ISO string format (YYYY-MM-DD) for backend
      if (eventData.startDate) {
        eventData.startDate = new Date(eventData.startDate).toISOString().split('T')[0];
      }
      if (eventData.endDate) {
        eventData.endDate = new Date(eventData.endDate).toISOString().split('T')[0];
      }

      // --- MODIFIED: Image handling logic before saving/updating event ---
      if (this.selectedFile) {
        // Case 1: A new file has been selected, upload it first
        this.eventService.uploadEventImage(this.selectedFile).subscribe({
          next: (uploadResponse) => {
            eventData.imageUrl = uploadResponse.imageUrl; // Set the received URL from upload
            this.proceedToSaveEvent(eventData);
          },
          error: (uploadError) => {
            console.error('Error uploading image:', uploadError);
            alert('Failed to upload image. Event not saved.');
          }
        });
      } else {
        // Case 2: No new file selected.
        // The `imageUrl` in `eventData` already holds the correct value:
        // - The original `imageUrl` (if in edit mode and not explicitly removed)
        // - `null` (if `removeImage()` was called, or if creating a new event without image)
        // No need to check this.currentEventImageUrl explicitly here, as the form control
        // itself reflects the intended state for imageUrl.
        eventData.imageUrl = this.eventForm.get('imageUrl')?.value; // Take the value directly from the form control
        this.proceedToSaveEvent(eventData);
      }

    } else {
      console.error('Form is invalid. Please check all fields.');
      this.eventForm.markAllAsTouched(); // Mark all controls as touched to display errors
    }
  }

  // Helper method to proceed with event save/update
  private proceedToSaveEvent(eventData: CalendarEvent): void {
    // Assuming your service methods handle authorization headers internally or expect them.
    // Make sure your service methods (updateEvent, createEvent) have the correct signatures.
    if (this.isEditMode && this.eventId !== null) {
      this.eventService.updateEvent(this.eventId, eventData).subscribe({ // Assuming service takes eventData directly
        next: (response) => {
          console.log('Event updated successfully:', response);
          this.router.navigate(['/dashboard/event-calendar']);
        },
        error: (err) => {
          console.error('Error updating event:', err);
          alert('Failed to update event. Please try again.');
        }
      });
    } else {
      this.eventService.createEvent(eventData).subscribe({ // Assuming service takes eventData directly
        next: (response) => {
          console.log('Event created successfully:', response);
          this.router.navigate(['/dashboard/event-calendar']);
        },
        error: (err) => {
          console.error('Error creating event:', err);
          alert('Failed to create event. Please try again.');
        }
      });
    }
  }

  hasError(controlName: string, errorType: string): boolean | null {
    const control = this.eventForm.get(controlName);
    return control && control.hasError(errorType) && (control.touched || control.dirty); // Check dirty too
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/event-calendar']);
  }
}