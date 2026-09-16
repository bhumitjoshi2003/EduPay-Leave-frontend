export interface PaymentHistoryDetails {
  id: number;
  studentId: string;
  studentName: string;
  className: string;
  session: string;
  month: string;
  /** In paise (Payment.amount on the backend, matching Razorpay's own convention) — divide
   * by 100 before formatting as currency. Every other field below (including amountPaid)
   * is a plain rupee int; only amount/amountPaid are paise on this entity. Mixing these up
   * is exactly the 100x display bug this comment exists to prevent a repeat of. */
  amount: number;
  paymentId: string;
  orderId: string;
  paymentDate: string;
  status: string;
  busFee: number;
  tuitionFee: number;
  annualCharges: number;
  labCharges: number;
  ecaProject: number;
  examinationFee: number;
  /** Paise — see `amount` above. */
  amountPaid: number;
  additionalCharges: number;
  lateFees: number;
  /** Legacy field — always 0 for a modern (ONLINE_CONVENIENCE_FEE_V1) payment; populated only
   * on historical rows predating the Online Convenience Fee refactor. */
  platformFee: number;
  schoolName: string;
  /** Paise — school-side portion actually paid (school fee + late fee + leave charges for a
   * modern payment; amount - platformFee for a legacy one). */
  schoolFeePaise: number;
  /** Paise — the parent-facing convenience-fee total. Its gateway/Edunexify component split is
   * never sent to a non-admin caller. */
  onlineConvenienceFeePaise: number;
  /** Paise — equals `amount`; kept as a paise-explicit alias for display code. */
  totalPaidPaise: number;
  currency: string;
  /** "ONLINE_CONVENIENCE_FEE_V1" for a modern payment, "MANUAL" for an offline one, or null/
   * absent for a legacy pre-refactor row. */
  pricingVersion: string | null;
  /** Admin-only — null for every non-admin caller (the backend actively nulls these fields
   * before serializing for STUDENT/PARENT roles). */
  schoolLiabilityPrincipalPaise?: number | null;
  gatewayRateBps?: number | null;
  gatewayTaxRateBps?: number | null;
  gatewayRecoveryFeePaise?: number | null;
  edunexifyTransactionFeePaise?: number | null;
}