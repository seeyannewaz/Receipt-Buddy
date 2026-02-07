import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReceiptsApi } from '../../api/receipts.api';
import { ReceiptSummary } from '../../models/receipt-summary.models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type MonthOption = { key: string; label: string; count: number };

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './receipts.component.html',
  styleUrls: ['./receipts.component.css'],
})
export class ReceiptsComponent {
  loading = signal(true);
  receipts = signal<ReceiptSummary[]>([]);
  error = signal('');

  // selected month key in "YYYY-MM" form (ex: "2026-02")
  selectedMonthKey = signal<string>('');
  selectedMonthLabel = computed(() => {
    const key = this.selectedMonthKey();
    if (!key) return '';
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
  });

  // Build list of available months from receipts (sorted newest -> oldest)
  availableMonths = computed<MonthOption[]>(() => {
    const map = new Map<string, number>();

    for (const r of this.receipts()) {
      const d = this.pickReceiptDate(r);
      if (!d) continue;
      const key = this.monthKey(d); // YYYY-MM
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const options = [...map.entries()]
      .map(([key, count]) => ({ key, count, label: this.monthLabelFromKey(key) }))
      .sort((a, b) => b.key.localeCompare(a.key)); // newest first

    return options;
  });

  // Receipts for the selected month (sorted newest first)
  monthlyReceipts = computed(() => {
    const key = this.selectedMonthKey();
    if (!key) return [];

    const [y, m] = key.split('-').map(Number);
    const start = new Date(y, (m ?? 1) - 1, 1);
    const end = new Date(y, (m ?? 1), 1);

    return this.receipts()
      .filter(r => {
        const d = this.pickReceiptDate(r);
        return d !== null && d >= start && d < end;
      })
      .slice()
      .sort((a, b) => {
        const da = this.pickReceiptDate(a)?.getTime() ?? 0;
        const db = this.pickReceiptDate(b)?.getTime() ?? 0;
        return db - da;
      });
  });

  constructor(private api: ReceiptsApi, private router: Router) {  // ✅ inject
    this.refresh();
  }

  // receiptWindowHref(id: number) {
  //   return this.router.serializeUrl(this.router.createUrlTree(['/w/receipts', id]));
  // }

  refresh() {
    this.loading.set(true);
    this.error.set('');

    this.api.list().subscribe({
      next: (rows) => {
        this.receipts.set(rows);
        this.loading.set(false);

        // Default to latest month that has receipts
        const months = this.availableMonths();
        if (months.length > 0) {
          // If selected month not set or no longer exists, jump to newest
          const current = this.selectedMonthKey();
          const stillValid = months.some(m => m.key === current);
          if (!current || !stillValid) {
            this.selectedMonthKey.set(months[0].key);
          }
        } else {
          this.selectedMonthKey.set('');
        }
      },
      error: () => {
        this.error.set('Failed to load receipts.');
        this.loading.set(false);
      },
    });
  }

  // ---- Month navigation ----
  selectMonth(key: string) {
    this.selectedMonthKey.set(key);
  }

  private monthIndexInOptions() {
    const key = this.selectedMonthKey();
    return this.availableMonths().findIndex(m => m.key === key);
  }

  prevMonth() {
    const i = this.monthIndexInOptions();
    if (i < 0) return;
    const next = this.availableMonths()[i + 1]; // older (because list is newest->oldest)
    if (next) this.selectedMonthKey.set(next.key);
  }

  nextMonth() {
    const i = this.monthIndexInOptions();
    if (i < 0) return;
    const prev = this.availableMonths()[i - 1]; // newer
    if (prev) this.selectedMonthKey.set(prev.key);
  }

  isNextMonthDisabled() {
    const i = this.monthIndexInOptions();
    return i <= 0; // already at newest
  }

  // ---- Actions ----
  badgeClass(status: string) {
    if (status === 'PARSED') return 'badge ok';
    if (status === 'FAILED') return 'badge bad';
    return 'badge warn';
  }

  openReceipt(r: ReceiptSummary) {
    window.open(this.router.serializeUrl(this.router.createUrlTree(['/w/receipts', r.id])), '_blank', 'noopener,noreferrer');
  }

  deleteReceipt(id: number) {
    const ok = confirm(`Delete receipt #${id}? This cannot be undone.`);
    if (!ok) return;

    this.api.delete(id).subscribe({
      next: () => {
        this.receipts.set(this.receipts().filter(x => x.id !== id));

        // If current month becomes empty, jump to newest available month
        const months = this.availableMonths();
        if (months.length > 0 && !months.some(m => m.key === this.selectedMonthKey())) {
          this.selectedMonthKey.set(months[0].key);
        }
      },
      error: (e) => {
        console.error(e);
        alert('Delete failed. See console.');
      }
    });
  }

  deleteAllReceipts() {
    const ok = confirm('Delete ALL receipts? This will remove everything from the database and cannot be undone.');
    if (!ok) return;

    this.api.deleteAll().subscribe({
      next: () => {
        this.receipts.set([]);
        this.selectedMonthKey.set('');
      },
      error: (e) => {
        console.error(e);
        alert('Delete-all failed. See console.');
      }
    });
  }

  // ---- Date formatting (MM-DD-YYYY) ----
  displayDate(r: any) {
    if (r.purchaseDate) {
      const d = new Date(r.purchaseDate + 'T00:00:00');
      return this.formatMMDDYYYY(d);
    }
    if (r.createdAt) {
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

  // ---- Helpers ----
  private pickReceiptDate(r: ReceiptSummary): Date | null {
    if ((r as any).purchaseDate) {
      const d = new Date((r as any).purchaseDate + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    if ((r as any).createdAt) {
      const d = new Date((r as any).createdAt);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  private monthKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private monthLabelFromKey(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
  }

  receiptNumberFor(list: { id: number }[], index: number) {
    // list is already sorted newest -> oldest, so return list.length - index for first row
    return list.length - index;
  }
}
