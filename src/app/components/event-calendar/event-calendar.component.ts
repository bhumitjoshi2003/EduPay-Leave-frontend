import { Component, OnInit, ElementRef, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { EventService } from '../../services/event.service';
import { Event } from '../../interfaces/event-calendar.component';
import { AuthService } from '../../auth/auth.service';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface DayCell {
  date: Date | null;
  events: Event[];
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

  currentDate = new Date();
  daysInMonth: DayCell[] = [];
  allEvents: Event[] = [];
  eventMap = new Map<string, Event[]>();

  currentUserRole = '';
  currentUserClass: string | null = null; // Will store the student's class if applicable

  selectedEvent: Event | null = null;
  showSidebar = false;
  isEditing = false;
  eventForm!: FormGroup;

  categories: string[] = ['Academic', 'Sports', 'Cultural', 'Social', 'Holiday', 'Meeting', 'Other'];

  categoryColors = new Map<string, string>();

  isMobileView: boolean = false;

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private studentService: StudentService,
    private teacherService: TeacherService
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.checkMobileView();
  }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole();
    this.initCategoryColors();
    this.checkMobileView();
    this.generateCalendarDays();


    const userId = this.authService.getUserId();
    if (this.currentUserRole === 'STUDENT') {
      if (userId) {
        this.studentService.getStudent(userId).subscribe({
          next: (studentDetails) => {
            console.log(studentDetails.className);
            this.currentUserClass = studentDetails.className;
            this.loadEvents();
          },
          error: (err) => {
            console.error('Error fetching student details:', err);
            this.currentUserClass = null;
            this.loadEvents();
          }
        });
      } else {
        console.warn('Student role detected, but no student ID found from AuthService.');
        this.currentUserClass = null;
        this.loadEvents();
      }
    } else {
      this.loadEvents();
    }


    if (this.currentUserRole === 'TEACHER') {
      if (userId) {
        this.teacherService.getTeacher(userId).subscribe({
          next: (teachertDetails) => {
            this.currentUserClass = teachertDetails.classTeacher;
            this.loadEvents();
          },
          error: (err) => {
            console.error('Error fetching teacher details:', err);
            this.currentUserClass = null;
            this.loadEvents();
          }
        });
      } else {
        console.warn('Student role detected, but no teacher ID found from AuthService.');
        this.currentUserClass = null;
        this.loadEvents();
      }
    } else {
      this.loadEvents();
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
    this.closeSidebar();
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

        const isTargetedToStudentClass = this.currentUserClass && eventTargetAudiences.some(audience => audience === this.currentUserClass);

        return isTargetedToTeacherRole || isTargetedToStudentClass;
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

  showEventDetails(ev: Event, e: MouseEvent): void {
    e.stopPropagation();
    this.selectedEvent = ev;
    this.showSidebar = true;
    this.isEditing = false;
    this.initEventForm(ev);
  }

  toggleEditMode(e: MouseEvent): void {
    e.stopPropagation();
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.selectedEvent) {
      this.initEventForm(this.selectedEvent);
    }
  }

  closeSidebar(): void {
    this.selectedEvent = null;
    this.showSidebar = false;
    this.isEditing = false;
    if (this.eventForm) {
      this.eventForm.reset();
    }
  }

  private initEventForm(event: Event): void {
    console.log('--- initEventForm called ---');
    console.log('1. Event object received:', event);
    console.log('2. event.targetAudience from backend (expected Array<string>):', event.targetAudience);

    // Convert the targetAudience array to a comma-separated string for the textarea
    const targetAudienceString = Array.isArray(event.targetAudience)
      ? event.targetAudience.join(', ')
      : ''; // Handle cases where it might not be an array or is null/undefined
    console.log('3. targetAudienceString (prepared for form input):', targetAudienceString);

    const videoLinksArray = this.fb.array(event.videoLinks ? event.videoLinks.map(link => this.fb.control(link)) : []);
    console.log('4. videoLinksArray (prepared for form):', videoLinksArray.value);

    this.eventForm = this.fb.group({
      id: [event.id],
      title: [event.title, Validators.required],
      description: [event.description],
      startDate: [event.startDate, Validators.required],
      endDate: [event.endDate],
      startTime: [event.startTime],
      endTime: [event.endTime],
      location: [event.location],
      category: [event.category, Validators.required],
      targetAudience: [targetAudienceString], // Assign the comma-separated string
      videoLinks: videoLinksArray,
    });

    this.cdr.detectChanges();
    console.log('5. eventForm.get("targetAudience") value after initialization:', this.eventForm.get('targetAudience')?.value);
    console.log('--- initEventForm finished ---');
  }

  get videoLinks(): FormArray {
    return this.eventForm.get('videoLinks') as FormArray;
  }

  saveEventChanges(): void {
    if (this.eventForm.valid && this.selectedEvent) {
      const eventIdToUpdate: number | undefined = this.selectedEvent.id;
      if (typeof eventIdToUpdate !== 'number') return;

      const formValue = this.eventForm.value;

      const updatedEvent: Event = {
        ...formValue,
        id: eventIdToUpdate
      };

      // Manually process targetAudience string from form back into an array
      if (typeof formValue.targetAudience === 'string') {
        updatedEvent.targetAudience = formValue.targetAudience
          .split(',')
          .map((audience: string) => audience.trim().toUpperCase()) // Ensure consistency, especially for class numbers like '1'
          .filter((audience: string) => audience !== '');
      } else {
        updatedEvent.targetAudience = [];
      }

      if (updatedEvent.startDate) {
        updatedEvent.startDate = new Date(updatedEvent.startDate).toISOString().split('T')[0];
      }
      if (updatedEvent.endDate) {
        updatedEvent.endDate = new Date(updatedEvent.endDate).toISOString().split('T')[0];
      }

      console.log('Attempting to save event:', updatedEvent);

      this.eventService.updateEvent(eventIdToUpdate, updatedEvent).subscribe({
        next: (res) => {
          console.log('Event updated successfully:', res);
          this.refreshCalendar();
          this.closeSidebar();
        },
        error: (err) => {
          console.error('Error updating event:', err);
          alert('Failed to save event. Please try again.');
        }
      });

    } else {
      console.warn('Form is invalid or no event selected. Cannot save changes.');
      this.eventForm.markAllAsTouched();
    }
  }

  addVideoLink(): void {
    this.videoLinks.push(this.fb.control(''));
  }

  removeVideoLink(index: number): void {
    this.videoLinks.removeAt(index);
  }

}