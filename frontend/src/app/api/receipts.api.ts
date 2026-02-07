import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './api.config';
import { Observable } from 'rxjs';
import { Receipt } from '../models/receipt.models';
import { ReceiptSummary } from '../models/receipt-summary.models';

@Injectable({ providedIn: 'root' })
export class ReceiptsApi {
  constructor(private http: HttpClient) { }

  upload(file: File): Observable<Receipt> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Receipt>(`${API_BASE}/receipts/upload`, form);
  }

  list(): Observable<ReceiptSummary[]> {
    return this.http.get<ReceiptSummary[]>(`${API_BASE}/receipts`);
  }

  get(id: number): Observable<Receipt> {
    return this.http.get<Receipt>(`${API_BASE}/receipts/${id}`);
  }

  delete(id: number) {
    return this.http.delete<void>(`${API_BASE}/receipts/${id}`);
  }

  deleteAll() {
    return this.http.delete<void>(`${API_BASE}/receipts`);
  }
}
