import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RegisterStudentComponent } from '../register-student/register-student.component';
import { RegisterTeacherComponent } from '../register-teacher/register-teacher.component';


@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RegisterStudentComponent, RegisterTeacherComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  showStudentForm: boolean = true;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Supports deep-linking straight to the teacher form, e.g. from School Setup's
    // "Add teachers" CTA (?type=teacher) — defaults to the student form otherwise, unchanged.
    if (this.route.snapshot.queryParamMap.get('type') === 'teacher') {
      this.toggleForm('teacher');
    }
  }

  toggleForm(type: 'student' | 'teacher') {
    this.showStudentForm = (type === 'student');
  }
}
