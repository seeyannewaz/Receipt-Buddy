export interface ReceiptSummary {
  id: number;
  status: 'UPLOADED' | 'PROCESSING' | 'PARSED' | 'FAILED';
  merchantRaw: string | null;
  merchantNormalized: string | null;
  purchaseDate: string | null;
  total: number | null;
  createdAt: string | null;
}
