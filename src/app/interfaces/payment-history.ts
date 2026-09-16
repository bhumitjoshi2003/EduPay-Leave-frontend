export interface PaymentHistory {
    studentId: string;
    paymentId: string;
    studentName: string;
    /** In paise (Payment.amountPaid on the backend, matching Razorpay's own convention) —
     * divide by 100 before formatting as currency. platformFee below is a genuine rupee
     * int, not paise; the two fields on this same entity use different units, found via
     * a real 100x display bug this was mixed up on — always double-check which is which. */
    amountPaid: number;
    paymentDate: string;
    status: string;
    className: string;
    /** Legacy field — always 0 for a modern (ONLINE_CONVENIENCE_FEE_V1) payment. */
    platformFee: number;
    /** "ONLINE_CONVENIENCE_FEE_V1" for a modern payment, "MANUAL" for an offline one, or
     * null/absent for a legacy pre-refactor row. */
    pricingVersion?: string | null;
    /** Paise — the modern allocation authority (school fee + late fee + leave charges); absent
     * on legacy rows. Never includes the online convenience fee. */
    schoolLiabilityPrincipalPaise?: number | null;
    /** Paise — derived (gatewayRecoveryFee + edunexifyTransactionFee); 0 for legacy/manual rows.
     * The gateway/Edunexify component split itself is never sent to the client. */
    onlineConvenienceFeePaise?: number;
}