/** Doubles as the online-payment create-order request body (posted verbatim by
 * RazorpayService.createOrder) — every monetary field here is rupees, the UI-domain unit,
 * converted to paise only at the HTTP boundary in PaymentComponent.loadStudentDetails. */
export interface PaymentData {
  totalAmount: number;
  monthSelectionString: string;
  totalTuitionFee: number;
  totalAnnualCharges: number;
  totalLabCharges: number;
  totalEcaProject: number;
  totalBusFee: number;
  totalExaminationFee: number;
  studentId: string;
  studentName: string;
  className: string;
  classId?: number;
  session: string;
  paidManually: boolean;
  amountPaid: number;
  additionalCharges: number;
  lateFees: number;
  platformFee: number;
}