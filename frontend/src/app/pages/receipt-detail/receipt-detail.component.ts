import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReceiptsApi } from '../../api/receipts.api';
import { Receipt } from '../../models/receipt.models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-receipt-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './receipt-detail.component.html',
  styleUrls: ['./receipt-detail.component.css'],
})
export class ReceiptDetailComponent {
  loading = signal(true);
  receipt = signal<Receipt | null>(null);
  error = signal('');

  // UI toggles
  showRawText = signal(false);

  constructor(
    private route: ActivatedRoute,
    private api: ReceiptsApi,
    private router: Router
  ) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  load(id: number) {
    this.loading.set(true);
    this.error.set('');
    this.api.get(id).subscribe({
      next: (r) => {
        this.receipt.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load receipt.');
        this.loading.set(false);
      },
    });
  }

  badgeClass(status: string) {
    if (status === 'PARSED') return 'badge ok';
    if (status === 'FAILED') return 'badge bad';
    return 'badge warn';
  }

  private isWindowMode(): boolean {
    return this.router.url.startsWith('/w/');
  }

  // MM-DD-YYYY format for display (not for input or storage)
  displayDate(r: any) {
    if (r?.purchaseDate) {
      const d = new Date(r.purchaseDate + 'T00:00:00');
      return this.formatMMDDYYYY(d);
    }
    if (r?.createdAt) {
      const d = new Date(r.createdAt);
      return this.formatMMDDYYYY(d);
    }
    return '—';
  }

  private formatMMDDYYYY(d: Date): string {
    if (isNaN(d.getTime())) return '—';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }

  deleteReceipt(id: number) {
    const ok = confirm(`Delete receipt #${id}? This cannot be undone.`);
    if (!ok) return;

    this.api.delete(id).subscribe({
      next: () => {
        // if opened as window-only, close it
        if (this.isWindowMode()) {
          window.close();
          return;
        }
        this.router.navigateByUrl('/receipts');
      },
      error: (e) => {
        console.error(e);
        alert('Delete failed. See console.');
      },
    });
  }

  openReceiptImage(id: number) {
    window.open(`http://localhost:8080/api/receipts/${id}/image`, '_blank', 'noopener,noreferrer');
  }

  copy(text: string | null | undefined) {
    const t = (text ?? '').toString();
    if (!t) return;
    navigator.clipboard?.writeText(t).catch(() => { });
  }

  money(n: number | null | undefined) {
    return (n ?? 0);
  }

  hasItems(r: any): boolean {
    return Array.isArray(r?.items) && r.items.length > 0;
  }

  // Derived mini stats (for nice KPI pills)
  itemCount() {
    const r = this.receipt();
    return r?.items?.length ?? 0;
  }

  computedItemsTotal() {
    const r = this.receipt();
    if (!r?.items?.length) return 0;
    return r.items.reduce((sum: number, it: any) => sum + (it?.lineTotal ?? 0), 0);
  }
}
