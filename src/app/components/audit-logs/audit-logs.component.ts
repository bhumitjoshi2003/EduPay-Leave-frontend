import { Component, OnInit } from '@angular/core';
import { AuditLog, AuditService } from '../../services/audit.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.css'
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  page = 0;
  size = 20;
  totalPages = 0;

  filters: any = {
    username: '',
    action: '',
    entityName: '',
    startDate: '',
    endDate: ''
  };

  // Full list of your specific actions for the dropdown
  actionTypes = [
    'CREATE_ADMIN', 'UPDATE_ADMIN', 'DELETE_ADMIN',
    'CREATE_TEACHER', 'UPDATE_TEACHER',
    'UPDATE_STUDENT',
    'UPDATE_BUS_FEES', 'UPDATE_FEE_STRUCTURE',
    'SAVE_ATTENDANCE', 'DELETE_ATTENDANCE', 'UPDATE_ATTENDANCE_CHARGE_PAID',
    'CREATE_EVENT', 'UPDATE_EVENT',
    'UPDATE_STUDENT_FEES'
  ];

  selectedLog?: AuditLog;

  constructor(private auditService: AuditService) { }

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.auditService.getAuditLogs(this.page, this.size, this.filters)
      .subscribe(res => {
        this.logs = res.content;
        this.totalPages = res.totalPages;
      });
  }

  applyFilters() {
    this.page = 0;
    this.loadLogs();
  }

  getActionCategory(action: string): string {
    if (!action) return 'cat-default';
    const act = action.toUpperCase();

    if (act.includes('DELETE')) return 'cat-danger';
    if (act.includes('ADMIN')) return 'cat-admin';
    if (act.includes('TEACHER')) return 'cat-staff';
    if (act.includes('STUDENT') && !act.includes('FEES')) return 'cat-student';
    if (act.includes('ATTENDANCE')) return 'cat-attendance';
    if (act.includes('LEAVE')) return 'cat-leave';
    if (act.includes('FEES') || act.includes('STRUCTURE')) return 'cat-finance';
    if (act.includes('EVENT')) return 'cat-event';

    return '';
  }

  viewDetails(log: AuditLog) {
    this.selectedLog = log;
  }

  closeDetails() {
    this.selectedLog = undefined;
  }

  nextPage() {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadLogs();
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.loadLogs();
    }
  }

  formatJson(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
}