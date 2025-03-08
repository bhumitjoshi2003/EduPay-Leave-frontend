import { Component, OnInit } from '@angular/core';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-student',
  imports: [],
  templateUrl: './student.component.html',
  styleUrl: './student.component.css'
})
export class StudentComponent implements OnInit{
  studentDetails: any;

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.getStudentDetails();
  }

  getStudentDetails(){
    this.studentService.getStudentDetails().subscribe({
      next: (response) => this.studentDetails.set(response),
      error: (error) => console.error('Error fetching student details:', error)
    });
  }
}
