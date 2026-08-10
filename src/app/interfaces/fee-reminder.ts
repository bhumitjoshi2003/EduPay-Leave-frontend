export interface OverdueStudent {
  studentId: string;
  studentName: string;
  className: string;
  parentPhone?: string;
  parentEmail?: string;
  unpaidMonths: string[];   // e.g. ["April", "May", "June"]
  /** null means amount unknown (no fee structure configured for this class/session) —
   * not the same as a genuine ₹0 due. */
  totalDue: number | null;
  lastPaymentDate?: string;
  daysOverdue: number;      // days since oldest unpaid month's due date
}
