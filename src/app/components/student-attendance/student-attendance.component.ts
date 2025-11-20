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
  @ViewChild('overallChart') overallCanvas!: ElementRef;

  constructor(
    private attendanceService: AttendanceService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute
  ) { }

  ngAfterViewInit(): void {
    this.createCharts();
  }

  ngOnInit(): void {
    const token = localStorage.getItem('accessToken');
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

    const today = new Date();
    let academicYearStart: number;
    let academicYearEnd: number;

    const startMonth = 4;
    const endMonth = 3;

    if (today.getMonth() < 3) {
      academicYearStart = today.getFullYear() - 1;
      academicYearEnd = today.getFullYear();
    } else {
      academicYearStart = today.getFullYear();
      academicYearEnd = today.getFullYear() + 1;
    }

    const observables = [];

    for (let month = startMonth; month <= 12; month++) {
      observables.push(this.attendanceService.getAttendanceCounts(this.studentId, academicYearStart, month));
    }

    for (let month = 1; month <= endMonth; month++) {
      observables.push(this.attendanceService.getAttendanceCounts(this.studentId, academicYearEnd, month));
    }

    forkJoin(observables).subscribe((results) => {
      this.attendanceData = results.map((counts, index) => {
        const workingDays = counts.totalAbsent;
        const absentDays = counts.studentAbsent;
        const presentDays = workingDays - absentDays;

        const year = index < 9 ? academicYearStart : academicYearEnd;
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
          const data = this.attendanceData[index];
          const totalDays = data.presentDays + data.absentDays;

          let labels, datasetData, backgroundColors;

          if (totalDays === 0) {
            labels = ['No Attendance Recorded'];
            datasetData = [100];
            backgroundColors = ['#A9A9A9'];
          } else {
            const presentPercentage = ((data.presentDays / totalDays) * 100).toFixed(1);
            const absentPercentage = ((data.absentDays / totalDays) * 100).toFixed(1);

            labels = [`Absent (${absentPercentage}%)`, `Present (${presentPercentage}%)`];
            datasetData = [data.absentDays, data.presentDays];
            backgroundColors = ['#F08080', '#90EE90'];
          }

          const fullMonthName = new Date(new Date().getFullYear(), new Date(data.month + '1').getMonth()).toLocaleString('default', { month: 'long' });

          this.monthlyCharts[index] = new Chart(canvas.nativeElement, {
            type: 'pie',
            data: {
              labels: labels,
              datasets: [{
                data: datasetData,
                backgroundColor: backgroundColors,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: fullMonthName,
                  font: { size: 14 },
                },
                legend: { display: true },
              },
            },
          });
        });
      }

      if (this.overallCanvas) {
        if (this.overallChart) this.overallChart.destroy();

        const totalDays = this.overallData.presentDays + this.overallData.absentDays;
        const presentPercentage = totalDays > 0 ? ((this.overallData.presentDays / totalDays) * 100).toFixed(1) : '0';
        const absentPercentage = totalDays > 0 ? ((this.overallData.absentDays / totalDays) * 100).toFixed(1) : '0';

        const overallColors = totalDays === 0 ? ['#A9A9A9', '#A9A9A9'] : ['#F08080', '#90EE90'];

        this.overallChart = new Chart(this.overallCanvas.nativeElement, {
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
            plugins: {
              title: {
                display: true,
                text: 'Overall Attendance',
                font: { size: 16 },
              },
            },
          },
        });
      }
    }
  }
}
