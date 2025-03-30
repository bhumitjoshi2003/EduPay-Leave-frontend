import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-student-attendance',
  templateUrl: './student-attendance.component.html',
  styleUrls: ['./student-attendance.component.css'],
  imports: [CommonModule],
})
export class StudentAttendanceComponent implements OnInit, AfterViewInit {
  studentId = 'S101';
  attendanceData: { month: string; presentDays: number; absentDays: number }[] = [];
  overallData: { presentDays: number; absentDays: number } = { presentDays: 0, absentDays: 0 };
  monthlyCharts: any[] = [];
  overallChart: any;

  @ViewChildren('monthlyChart') monthlyCanvas!: QueryList<ElementRef>;
  @ViewChild('overallChart') overallCanvas!: ElementRef;

  constructor(private attendanceService: AttendanceService, @Inject(PLATFORM_ID) private platformId: Object) {}
  
  ngAfterViewInit(): void {
    this.createCharts(); 
  }

  ngOnInit(): void {
    this.fetchAttendanceData();
  }

  fetchAttendanceData(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const startMonth = 4; // April
    const endMonth = 3; // March

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

        // If there are no working days, make a grey chart
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
            // If no working days, make it fully grey
            labels = ['No Attendance Recorded'];
            datasetData = [100]; // Entire pie is one section
            backgroundColors = ['#A9A9A9']; // Darker Grey
          } else {
            // Calculate percentages
            const presentPercentage = ((data.presentDays / totalDays) * 100).toFixed(1);
            const absentPercentage = ((data.absentDays / totalDays) * 100).toFixed(1);

            labels = [`Absent (${absentPercentage}%)`, `Present (${presentPercentage}%)`];
            datasetData = [data.absentDays, data.presentDays];
            backgroundColors = ['#F08080', '#90EE90']; // Vibrant Red, Vibrant Blue
          }

          // Get the full month name
          const fullMonthName = new Date(new Date().getFullYear(), new Date(data.month+'1').getMonth()).toLocaleString('default', { month: 'long' });

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