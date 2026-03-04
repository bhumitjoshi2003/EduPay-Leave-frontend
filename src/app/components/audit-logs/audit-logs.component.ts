import { Component, OnInit } from '@angular/core';
import { AuditLog, AuditService } from '../../services/audit.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audit-logs',
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

  viewDetails(log: AuditLog) {
    this.selectedLog = log;
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