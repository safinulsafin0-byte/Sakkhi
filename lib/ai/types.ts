import { z } from "zod";

export const ChecklistItemSchema = z.object({
  item: z.string(),
  satisfied: z.boolean(),
  evidence: z.string(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const VerificationResultSchema = z.object({
  verdict: z.enum(["approved", "needs_more_proof", "rejected"]),
  confidence: z.number().min(0).max(1),
  receiptTotal: z.number().nullable(), // integer in smallest currency unit (poisha) or normalized
  receiptCurrency: z.string().nullable(),
  receiptDate: z.string().nullable(),
  checklist: z.array(ChecklistItemSchema),
  redFlags: z.array(z.string()),
  humanSummary: z.string(),
  needsHumanReview: z.boolean(),
  provider: z.string().optional(),
  isDemoMode: z.boolean().default(false),
  rawModelOutput: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export interface ProofImageInput {
  filename: string;
  mimeType: string;
  base64: string;
  sha256?: string;
  perceptualHash?: string;
  isBlurry?: boolean;
  blurScore?: number;
}

export interface ExifSummaryItem {
  filename: string;
  captureDate?: string | null;
  cameraModel?: string | null;
  hasGps?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  software?: string | null;
}

export interface VerificationInput {
  milestoneTitle: string;
  expectedAmount: number; // in smallest unit: poisha (1 BDT = 100 poisha)
  currency: string;
  proofChecklist: string[];
  images: ProofImageInput[];
  exifSummary: ExifSummaryItem[];
  volunteerNote?: string | null;
  campaignStartDate?: Date | string | null;
}

export interface Verifier {
  readonly providerName: string;
  readonly isDemo: boolean;
  verify(input: VerificationInput): Promise<VerificationResult>;
}

