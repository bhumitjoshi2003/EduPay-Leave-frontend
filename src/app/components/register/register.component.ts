import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RegisterStudentComponent } from '../register-student/register-student.component'; 
import { RegisterTeacherComponent } from '../register-teacher/register-teacher.component';


@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RegisterStudentComponent, RegisterTeacherComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  showStudentForm: boolean = true;

  constructor() { }

  ngOnInit(): void {
  }

  toggleForm(type: 'student' | 'teacher') {
    this.showStudentForm = (type === 'student');
  }
}
