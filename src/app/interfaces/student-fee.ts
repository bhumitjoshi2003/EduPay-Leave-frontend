export interface StudentFee {
  id?: number;
  studentId: string;
  className: string;
  month: number;
  year: string;
  paid: boolean;
  manuallyPaid: boolean;
  manualPaymentReceived?: number;
  amountPaid?: number;
  takesBus?: boolean;
  distance?: number;
}
