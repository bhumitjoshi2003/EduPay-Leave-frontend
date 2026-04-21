export interface OverdueStudent {
  studentId: string;
  studentName: string;
  className: string;
  parentPhone?: string;
  parentEmail?: string;
  unpaidMonths: string[];   // e.g. ["April", "May", "June"]
  totalDue: number;
  lastPaymentDate?: string;
  daysOverdue: number;      // days since oldest unpaid month's due date
}
