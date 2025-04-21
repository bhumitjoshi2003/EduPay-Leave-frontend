export interface PaymentHistory {
    studentId: string;
    paymentId: string;
    orderId: string;
    amountPaid: number;
    paymentDate: string;
    status: string;
}