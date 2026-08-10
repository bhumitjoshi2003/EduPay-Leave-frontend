import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FeeReminderDefaulter {
  studentId: string;
  studentName: string;
  className: string;
  /** null = amount unknown (no fee structure configured for this class/session) — not ₹0. */
  totalDue: number | null;
}

export interface FeeReminderSendResult {
  sentCount: number;
  failedCount: number;
  outcomes: { studentId: string; status: string }[];
  error?: string | null;
}

export interface FeeReminderWorkflowResponse {
  workflowId: string;
  status: string; // 'pending_approval' | 'rejected' | 'sent' | 'partially_sent' | 'failed' | 'no_defaulters'
  draftSummary: string;
  defaulterCount: number;
  /** null = amount unknown for every defaulter in this batch — not ₹0. */
  totalAmountDue: number | null;
  defaulters: FeeReminderDefaulter[];
  sendResult?: FeeReminderSendResult | null;
  error?: string | null;
}

/**
 * Plain request/response calls — start/approve/reject/status are never streamed
 * (unlike ai-copilot.service.ts's chat endpoints), so no observe:'events' needed here.
 */
@Injectable({ providedIn: 'root' })
export class AiWorkflowService {
  private readonly base = `${environment.apiUrl}/ai/workflows/fee-reminders`;

  constructor(private http: HttpClient) {}

  startFeeReminderWorkflow(session: string, className?: string): Observable<FeeReminderWorkflowResponse> {
    return this.http.post<FeeReminderWorkflowResponse>(this.base, { session, className });
  }

  approve(workflowId: string): Observable<FeeReminderWorkflowResponse> {
    return this.http.post<FeeReminderWorkflowResponse>(`${this.base}/${workflowId}/approve`, {});
  }

  reject(workflowId: string): Observable<FeeReminderWorkflowResponse> {
    return this.http.post<FeeReminderWorkflowResponse>(`${this.base}/${workflowId}/reject`, {});
  }

  getStatus(workflowId: string): Observable<FeeReminderWorkflowResponse> {
    return this.http.get<FeeReminderWorkflowResponse>(`${this.base}/${workflowId}`);
  }
}
