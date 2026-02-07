export type ReceiptStatus = 'UPLOADED' | 'PROCESSING' | 'PARSED' | 'FAILED';

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  category?: string;
}

export interface ReceiptAnalysis {
  summary?: string;          // “what this receipt is”
  insights?: string[];       // bullets from AI
  warnings?: string[];       // “tax missing”, “low confidence”
  confidence?: number;       // 0..1
  categories?: Record<string, number>; // category -> amount
}

export interface Receipt {
  errorMessage: string;
  id: number;
  status: ReceiptStatus;

  merchantRaw?: string | null;
  merchantNormalized?: string | null;
  purchaseDate?: string | null;

  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;

  items?: ReceiptItem[] | null;
  analysis?: ReceiptAnalysis | null;

  rawText?: string | null;   // if you store it
  filePath?: string | null;    // backend path
  createdAt: string;
}
