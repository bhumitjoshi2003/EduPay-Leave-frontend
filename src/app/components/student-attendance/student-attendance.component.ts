// student-attendance.component.ts
import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AttendanceService } from '../../services/attendance.service';
import { jwtDecode } from 'jwt-decode';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-student-attendance',
  templateUrl: './student-attendance.component.html',
  styleUrls: ['./student-attendance.component.css'],
  imports: [CommonModule],
})
export class StudentAttendanceComponent implements OnInit, AfterViewInit {
  studentId = '';
  attendanceData: { month: string; presentDays: number; absentDays: number }[] = [];
  overallData: { presentDays: number; absentDays: number } = { presentDays: 0, absentDays: 0 };
  monthlyCharts: any[] = [];
  overallChart: any;
  role: string = '';

  @ViewChildren('monthlyChart') monthlyCanvas!: QueryList<ElementRef>;
  @ViewChild('overallPieChart') overallPieCanvas!: ElementRef; // Changed ViewChild selector

  constructor(
    private attendanceService: AttendanceService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute
  ) {}

  ngAfterViewInit(): void {
    this.createCharts();
  }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.role = decodedToken.role;

      if (this.role === 'STUDENT') {
        this.studentId = decodedToken.userId;
      } else {
        this.route.params.subscribe(params => {
          const routeStudentId = params['studentId'];
          if (routeStudentId) { this.studentId = routeStudentId; }
        });
      }
      this.fetchAttendanceData();
    }
  }

  fetchAttendanceData(): void {
    if (!this.studentId) {
      console.error('Student ID is missing.');
      return;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const startMonth = 4;
    const endMonth = 3;

    const observables = [];

    for (let month = startMonth; month <= 12; month++) {
      observables.push(this.attendanceService.getAttendanceCounts(this.studentId, currentYear, month));
    }

    for (let month = 1; month <= endMonth; month++) {
      observables.push(this.attendanceService.getAttendanceCounts(this.studentId, currentYear + 1, month));
    }

    forkJoin(observables).subscribe((results) => {
      this.attendanceData = results.map((counts, index) => {
        const workingDays = counts.totalAbsent;
        const absentDays = counts.studentAbsent;
        const presentDays = workingDays - absentDays;

        const year = index < 9 ? currentYear : currentYear + 1;
        const month = index < 9 ? startMonth + index : 1 + index - 9;

        if (workingDays === 0) {
          return {
            month: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
            presentDays: 0,
            absentDays: 0,
          };
        }

        this.overallData.presentDays += presentDays;
        this.overallData.absentDays += absentDays;

        return {
          month: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
          presentDays,
          absentDays,
        };
      });

      setTimeout(() => this.createCharts(), 100);
    });
  }

  createCharts(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.monthlyCharts.forEach((chart) => chart?.destroy());
      this.monthlyCharts = [];

      if (this.monthlyCanvas) {
        this.monthlyCanvas.forEach((canvas, index) => {
          // ... (rest of your monthly chart creation code - no changes needed here) ...
        });
      }

      if (this.overallPieCanvas) { // Use the new ViewChild reference
        if (this.overallChart) this.overallChart.destroy();

        const totalDays = this.overallData.presentDays + this.overallData.absentDays;
        const presentPercentage = totalDays > 0 ? ((this.overallData.presentDays / totalDays) * 100).toFixed(1) : '0';
        const absentPercentage = totalDays > 0 ? ((this.overallData.absentDays / totalDays) * 100).toFixed(1) : '0';

        const overallColors = totalDays === 0 ? ['#A9A9A9', '#A9A9A9'] : ['#F08080', '#90EE90'];

        this.overallChart = new Chart(this.overallPieCanvas.nativeElement, { // Use the new ViewChild reference
          type: 'pie',
          data: {
            labels: totalDays === 0 ? ['No Attendance Recorded'] : [`Absent (${absentPercentage}%)`, `Present (${presentPercentage}%)`],
            datasets: [{
              data: totalDays === 0 ? [100] : [this.overallData.absentDays, this.overallData.presentDays],
              backgroundColor: overallColors,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'nearest',
              intersect: false,
            },
            elements: {
              arc: {
                hoverOffset: 10
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Overall Attendance',
                font: { size: 16 },
              },
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  font: { size: 12 }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed;
                    return `${label}: ${value} days`;
                  }
                }
              }
            }
          }
        });
      }
    }
  }
}