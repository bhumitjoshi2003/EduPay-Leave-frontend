import { Component, OnInit, ElementRef, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../auth/auth.service';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { CalendarEvent } from '../../interfaces/event-calendar.component'; // Ensure this interface has imageUrl: string | null;

interface DayCell {
  date: Date | null;
  events: CalendarEvent[];
  expanded?: boolean;
}

@Component({
  selector: 'app-event-calendar',
  templateUrl: './event-calendar.component.html',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  styleUrls: ['./event-calendar.component.css']
})
export class EventCalendarComponent implements OnInit {

  @ViewChild('calendarContainer') calendarContainerRef!: ElementRef;
  // IMPORTANT: This ViewChild is for the file input in the *edit sidebar*, matching #fileInput in HTML
  @ViewChild('fileInput') fileInput!: ElementRef; // <-- ADDED ViewChild for the file input

  currentDate = new Date();
  daysInMonth: DayCell[] = [];
  allEvents: CalendarEvent[] = [];
  eventMap = new Map<string, CalendarEvent[]>();

  currentUserRole = '';
  currentUserClass: string | null = null;

  selectedEvent: CalendarEvent | null = null;
  showSidebar = false;
  isEditing = false;
  eventForm!: FormGroup; // Defined here, initialized in constructor or initEventForm

  categories: string[] = ['Academic', 'Sports', 'Cultural', 'Social', 'Holiday', 'Meeting', 'Other'];

  categoryColors = new Map<string, string>();

  isMobileView: boolean = false;

  // Image related properties
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  // private currentEventImageUrl: string | null = null; // Removed - imageUrl in form is now the source of truth

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private studentService: StudentService,
    private teacherService: TeacherService
  ) {
    // Initialize eventForm here with all controls, including imageUrl
    this.eventForm = this.fb.group({
      id: [null], // Will be set when patching
      title: ['', Validators.required],
      description: [''],
      startDate: ['', Validators.required],
      endDate: [''],
      startTime: [''],
      endTime: [''],
      location: [''],
      category: ['', Validators.required],
      targetAudience: [''], // Will be processed to array before sending
      videoLinks: this.fb.array([]),
      imageUrl: [null] // Initialize imageUrl control
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this.checkMobileView();
  }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole();
    this.initCategoryColors();
    this.checkMobileView();
    this.generateCalendarDays();

    const userId = this.authService.getUserId();
    const loadEventsAfterDetails = () => {
      this.loadEvents();
    };

    if (this.currentUserRole === 'STUDENT') {
      if (userId) {
        this.studentService.getStudent(userId).subscribe({
          next: (studentDetails) => {
            console.log(studentDetails.className);
            this.currentUserClass = studentDetails.className;
            loadEventsAfterDetails();
          },
          error: (err) => {
            console.error('Error fetching student details:', err);
            this.currentUserClass = null;
            loadEventsAfterDetails();
          }
        });
      } else {
        console.warn('Student role detected, but no student ID found from AuthService.');
        this.currentUserClass = null;
        loadEventsAfterDetails();
      }
    } else if (this.currentUserRole === 'TEACHER') {
      if (userId) {
        this.teacherService.getTeacher(userId).subscribe({
          next: (teachertDetails) => {
            this.currentUserClass = teachertDetails.classTeacher;
            loadEventsAfterDetails();
          },
          error: (err) => {
            console.error('Error fetching teacher details:', err);
            this.currentUserClass = null;
            loadEventsAfterDetails();
          }
        });
      } else {
        console.warn('Teacher role detected, but no teacher ID found from AuthService.');
        this.currentUserClass = null;
        loadEventsAfterDetails();
      }
    } else {
      loadEventsAfterDetails();
    }
  }

  private checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  private initCategoryColors(): void {
    const defaultColor = '#696969';
    const colors = [
      '#FF6347', '#4682B4', '#32CD32', '#FFD700', '#8A2BE2', '#FF4500',
      '#20B2AA', '#ADFF2F', '#BA55D3', '#40E0D0', '#DAA520', '#C71585'
    ];
    this.categories.forEach((cat, index) => {
      this.categoryColors.set(cat, colors[index % colors.length]);
    });
    this.categoryColors.set('Default', defaultColor);
  }

  getFormattedDate(dateStr: string | undefined | null, fmt: string): string {
    if (!dateStr) return '';
    return this.formatDate(new Date(dateStr), fmt);
  }

  formatDate(date: Date, fmt: string): string {
    return format(date, fmt);
  }

  formatTimeDisplay(timeStr: string | undefined | null): string {
    if (!timeStr) {
      return '';
    }
    try {
      const date = new Date(`2000-01-01T${timeStr}`);
      return format(date, 'h:mm a');
    } catch (e) {
      console.error('Error formatting time string:', timeStr, e);
      return timeStr;
    }
  }

  // Helper to get full image URL
  getFullImageUrl(relativePath: string | null | undefined): string {
    if (!relativePath) {
      return '';
    }
    // Ensure the path is correct depending on how your backend returns it.
    // If relativePath is just filename:
    // return `${environment.apiUrl}/api/files/event-images/${relativePath}`;
    // If relativePath already includes /api/files/event-images/:
    return `${environment.apiUrl}${relativePath}`;
  }

  goToPreviousMonth(): void {
    this.currentDate = subMonths(this.currentDate, 1);
    this.refreshCalendar();
  }

  goToNextMonth(): void {
    this.currentDate = addMonths(this.currentDate, 1);
    this.refreshCalendar();
  }

  private refreshCalendar(): void {
    this.generateCalendarDays();
    this.loadEvents();
    this.closeSidebar(); // Ensure sidebar closes on month change
  }

  private generateCalendarDays(): void {
    const start = startOfMonth(this.currentDate);
    const end = endOfMonth(this.currentDate);
    const days = eachDayOfInterval({ start, end });
    this.daysInMonth = [];
    const offset = (getDay(start) === 0 ? 6 : getDay(start) - 1);
    for (let i = 0; i < offset; i++) this.daysInMonth.push({ date: null, events: [] });
    days.forEach(d => this.daysInMonth.push({ date: d, events: [], expanded: false }));
  }

  private loadEvents(): void {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth() + 1;
    this.eventService.getEventsForMonthAndYear(y, m).subscribe({
      next: evs => { this.allEvents = evs; this.populateEvents(); },
      error: console.error
    });
  }

  private populateEvents(): void {
    this.eventMap.clear();

    const filtered = this.allEvents.filter(event => {
      const eventTargetAudiences = Array.isArray(event.targetAudience) ? event.targetAudience : [];

      if (this.currentUserRole === 'ADMIN') {
        return true;
      }

      if (eventTargetAudiences.includes('ALL')) {
        return true;
      }

      if (this.currentUserRole === 'STUDENT') {
        const isTargetedToStudentRole = eventTargetAudiences.includes('STUDENTS');
        const isTargetedToStudentClass = this.currentUserClass && eventTargetAudiences.some(audience => audience === this.currentUserClass);
        return isTargetedToStudentRole || isTargetedToStudentClass;
      }

      if (this.currentUserRole === 'TEACHER') {
        const isTargetedToTeacherRole = eventTargetAudiences.includes('TEACHERS');
        const isTargetedToTeacherClass = this.currentUserClass && eventTargetAudiences.some(audience => audience === this.currentUserClass);
        return isTargetedToTeacherRole || isTargetedToTeacherClass;
      }
      return false;
    });

    filtered.forEach(ev => {
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : start;
      eachDayOfInterval({ start, end }).forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        const arr = this.eventMap.get(key) || [];
        arr.push(ev);
        this.eventMap.set(key, arr);
      });
    });

    this.daysInMonth.forEach(cell => {
      cell.events = cell.date ? (this.eventMap.get(format(cell.date, 'yyyy-MM-dd')) ?? []) : [];
    });
  }

  isToday(date: Date | null): boolean {
    return date ? isSameDay(date, new Date()) : false;
  }

  getEventColor(category: string): string {
    return this.categoryColors.get(category) || this.categoryColors.get('Default')!;
  }

  openDayPopover(evt: MouseEvent, date: Date): void {
    console.log(`Clicked day (desktop mode, popover functionality deprecated): ${format(date, 'yyyy-MM-dd')}`);
    evt.stopPropagation();
  }

  toggleMobileDayEvents(dayCell: DayCell): void {
    if (dayCell.date && dayCell.events.length > 0) {
      dayCell.expanded = !dayCell.expanded;
      this.daysInMonth.forEach(d => {
        if (d.date && d !== dayCell && d.expanded) {
          d.expanded = false;
        }
      });
    }
  }

  showEventDetails(ev: CalendarEvent, e: MouseEvent): void {
    e.stopPropagation();
    this.selectedEvent = ev;
    this.showSidebar = true;
    this.isEditing = false; // Always start in view mode

    this.initEventForm(ev); // Initialize form with selected event data
    this.resetImageState(); // <-- Call reset image state
    // Ensure native file input is clear upon opening sidebar
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.detectChanges(); // Force change detection if needed for immediate display
  }

  toggleEditMode(e: MouseEvent): void {
    e.stopPropagation();
    this.isEditing = !this.isEditing;

    if (this.isEditing && this.selectedEvent) {
      this.initEventForm(this.selectedEvent); // Re-initialize form to ensure correct state
      this.resetImageState(); // <-- Call reset image state when entering edit mode
      // Ensure native file input is clear when entering edit mode
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    } else {
      // Exiting edit mode, if you want to revert form state, you can reset or re-init here
      // For now, we'll just rely on closing sidebar to reset
      this.eventForm.reset(); // Clear form when exiting edit mode
      // This also resets the image controls within the form
    }
    this.cdr.detectChanges(); // Force change detection
  }

  closeSidebar(): void {
    this.selectedEvent = null;
    this.showSidebar = false;
    this.isEditing = false;
    if (this.eventForm) {
      this.eventForm.reset();
    }
    this.resetImageState(); // <-- Call reset image state on sidebar close
    // Ensure native file input is clear upon sidebar close
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.detectChanges(); // Force change detection
  }

  // ADDED: Centralized method to reset image-related component properties
  private resetImageState(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    // The imageUrl in the form control itself will be managed by initEventForm or removeImage
  }

  private initEventForm(event: CalendarEvent): void {
    console.log('--- initEventForm called ---');
    console.log('1. Event object received:', event);
    console.log('2. event.targetAudience from backend (expected Array<string>):', event.targetAudience);

    const targetAudienceString = Array.isArray(event.targetAudience)
      ? event.targetAudience.join(', ')
      : '';
    console.log('3. targetAudienceString (prepared for form input):', targetAudienceString);

    // Clear previous FormArray controls before adding new ones
    while (this.videoLinks.length !== 0) {
      this.videoLinks.removeAt(0);
    }
    event.videoLinks?.forEach(link => this.videoLinks.push(this.fb.control(link)));

    this.eventForm.patchValue({
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      category: event.category,
      targetAudience: targetAudienceString,
      // imageUrl from the event is patched directly into the form control
      imageUrl: event.imageUrl // This sets the initial image URL for the form
    });

    this.cdr.detectChanges();
    console.log('5. eventForm.get("targetAudience") value after initialization:', this.eventForm.get('targetAudience')?.value);
    console.log('6. eventForm.get("imageUrl") value after initialization:', this.eventForm.get('imageUrl')?.value);
    console.log('--- initEventForm finished ---');
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
      this.selectedFile = fileInput.files[0];

      // Generate preview
      const reader = new FileReader();
      reader.onload = e => this.imagePreviewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);

      // CRITICAL: When a new file is selected, nullify the imageUrl in the form control.
      // This signifies that the *existing* image (if any) is to be replaced by the new file.
      this.eventForm.get('imageUrl')?.setValue(null);

    } else {
      // Case where the user opens the file dialog but cancels, or clears the input manually
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      // Do NOT set imageUrl to null here. The form control should retain its value
      // from `patchValue` if it had one, or `null` if removeImage was called.
      // The current state of eventForm.imageUrl is the source of truth.
      if (this.selectedEvent && this.selectedEvent.imageUrl && !this.eventForm.get('imageUrl')?.value) {
        // If there was an original image and the form's imageUrl became null (e.g., via user selecting, then cancelling),
        // revert to the original imageUrl.
        // This handles the scenario where a user might select a file, then cancel the file dialog,
        // and you want the previously saved image to reappear.
        this.eventForm.get('imageUrl')?.setValue(this.selectedEvent.imageUrl);
      }
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

  saveEventChanges(): void {
    if (this.eventForm.valid && this.selectedEvent && this.selectedEvent.id) {
      const eventIdToUpdate: number = this.selectedEvent.id;
      const formValue = this.eventForm.value;

      // Process targetAudience
      let processedTargetAudience: string[] = [];
      const formTargetAudience = formValue.targetAudience;

      if (typeof formTargetAudience === 'string') {
        processedTargetAudience = formTargetAudience
          .split(',')
          .map((audience: string) => audience.trim().toUpperCase())
          .filter((audience: string) => audience !== '');
      } else if (Array.isArray(formTargetAudience)) {
        processedTargetAudience = formTargetAudience
          .map((audience: any) => String(audience).trim().toUpperCase())
          .filter((audience: string) => audience !== '');
      }

      // Create the updated event object
      const updatedEvent: CalendarEvent = {
        ...this.selectedEvent, // Start with original event to retain all properties including ID
        ...formValue, // Overlay form values
        id: eventIdToUpdate, // Ensure ID is correct
        targetAudience: processedTargetAudience, // Assign processed audience
      };

      // Convert dates to ISO string format (YYYY-MM-DD) for backend
      if (updatedEvent.startDate) {
        updatedEvent.startDate = new Date(updatedEvent.startDate).toISOString().split('T')[0];
      }
      if (updatedEvent.endDate) {
        updatedEvent.endDate = new Date(updatedEvent.endDate).toISOString().split('T')[0];
      }

      console.log('Attempting to save event:', updatedEvent);

      // --- MODIFIED: Streamlined Image handling logic ---
      if (this.selectedFile) {
        // Case 1: A new file has been selected, upload it first
        this.eventService.uploadEventImage(this.selectedFile).subscribe({
          next: (response) => {
            updatedEvent.imageUrl = response.imageUrl; // Set the new image URL from upload response
            this.proceedToUpdateEvent(eventIdToUpdate, updatedEvent);
          },
          error: (err) => {
            console.error('Error uploading image:', err);
            alert('Failed to upload image. Event not saved.');
          }
        });
      } else {
        // Case 2: No new file selected. The imageUrl in `updatedEvent` should reflect the form's state.
        // It will be null if removeImage() was called, or the original URL if it was kept.
        updatedEvent.imageUrl = this.eventForm.get('imageUrl')?.value;
        this.proceedToUpdateEvent(eventIdToUpdate, updatedEvent);
      }

    } else {
      console.warn('Form is invalid or no event selected. Cannot save changes.');
      this.eventForm.markAllAsTouched(); // Mark all controls as touched to display validation errors
    }
  }

  private proceedToUpdateEvent(eventId: number, event: CalendarEvent): void {
    this.eventService.updateEvent(eventId, event).subscribe({
      next: (res) => {
        console.log('Event updated successfully:', res);
        this.refreshCalendar(); // Refresh calendar to show updated event
        this.closeSidebar(); // Close sidebar after successful update
      },
      error: (err) => {
        console.error('Error updating event:', err);
        alert('Failed to save event. Please try again.');
      }
    });
  }

}