export interface PaymentHistory {
    studentId: string;
    paymentId: string;
    studentName: string;
    amountPaid: number;
    paymentDate: string;
    status: string;
    className: string;
    platformFee: number;
}