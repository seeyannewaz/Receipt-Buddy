import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ReceiptsApi } from '../../api/receipts.api';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { ReceiptSummary } from '../../models/receipt-summary.models';

type MonthOption = { key: string; date: Date; label: string };

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  receiptSummaries = signal<ReceiptSummary[]>([]);

  // ---------- ALL-TIME COMPUTEDS ----------
  parsedCountAll = computed(() => this.receiptSummaries().filter(r => r.status === 'PARSED').length);
  totalSpendAll = computed(() => this.receiptSummaries().reduce((sum, r) => sum + (r.total ?? 0), 0));

  merchantCountsAll = computed(() => this.buildMerchantCounts(this.receiptSummaries()));
  maxMerchantCountAll = computed(() => Math.max(1, ...this.merchantCountsAll().map(x => x.count)));
  topMerchantAll = computed<string | null>(() => this.merchantCountsAll()[0]?.name ?? null);

  // ---------- MONTH OPTIONS + SELECTION ----------
  private now = new Date();
  monthManuallySet = signal(false);

  selectedMonth = signal<Date>(this.monthStart(this.now));
  selectedMonthKey = computed(() => this.monthKey(this.selectedMonth()));

  monthOptions = computed<MonthOption[]>(() => {
    const months = new Map<string, Date>();

    for (const r of this.receiptSummaries()) {
      const d = this.pickReceiptDate(r);
      if (!d) continue;
      const ms = this.monthStart(d);
      months.set(this.monthKey(ms), ms);
    }

    const cur = this.monthStart(this.now);
    months.set(this.monthKey(cur), cur);

    return [...months.values()]
      .sort((a, b) => b.getTime() - a.getTime())
      .map(d => ({ key: this.monthKey(d), date: d, label: this.formatMMYYYY(d) }));
  });

  monthLabel = computed(() => this.formatMMYYYY(this.selectedMonth()));

  isNextDisabled = computed(() => {
    const latest = this.monthOptions()[0]?.key ?? this.monthKey(this.monthStart(this.now));
    return this.selectedMonthKey() === latest;
  });

  selectedDay = signal<number | null>(null);

  // ---------- MONTHLY COMPUTEDS ----------
  monthlyReceipts = computed(() => {
    const month = this.selectedMonth();
    const start = this.monthStart(month);
    const end = this.monthStart(this.addMonths(month, 1));

    return this.receiptSummaries().filter(r => {
      const d = this.pickReceiptDate(r);
      return d !== null && d >= start && d < end;
    });
  });

  monthlyReceiptsFiltered = computed(() => {
    const day = this.selectedDay();
    if (day === null) return this.monthlyReceipts();
    return this.monthlyReceipts().filter(r => {
      const d = this.pickReceiptDate(r);
      return d !== null && d.getDate() === day;
    });
  });

  parsedCountMonth = computed(() => this.monthlyReceiptsFiltered().filter(r => r.status === 'PARSED').length);
  totalSpendMonth = computed(() => this.monthlyReceiptsFiltered().reduce((sum, r) => sum + (r.total ?? 0), 0));

  merchantCountsMonth = computed(() => this.buildMerchantCounts(this.monthlyReceiptsFiltered()));
  maxMerchantCountMonth = computed(() => Math.max(1, ...this.merchantCountsMonth().map(x => x.count)));
  topMerchantMonth = computed<string | null>(() => this.merchantCountsMonth()[0]?.name ?? null);

  // ---------- CHART ----------
  daysInSelectedMonth = computed(() => {
    const d = this.selectedMonth();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  });

  dailySpend = computed(() => {
    const days = this.daysInSelectedMonth();
    const arr = Array.from({ length: days }, () => 0);

    for (const r of this.monthlyReceipts()) {
      const d = this.pickReceiptDate(r);
      if (!d) continue;
      arr[d.getDate() - 1] += (r.total ?? 0);
    }
    return arr;
  });

  dailyMax = computed(() => Math.max(1, ...this.dailySpend()));
  hovered = signal<{ day: number; amount: number } | null>(null);
  tooltipPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Chart geometry
  readonly CHART_LEFT = 90;
  readonly CHART_RIGHT = 980;
  readonly CHART_TOP = 30;
  readonly CHART_BOTTOM = 250;

  // ---------- NEW: MERCHANT DRILLDOWN STATE ----------
  selectedMerchantAll = signal<string | null>(null);
  selectedMerchantMonth = signal<string | null>(null);

  merchantReceiptsAll = computed(() => {
    const m = this.selectedMerchantAll();
    if (!m) return [];
    return this.receiptSummaries()
      .filter(r => this.merchantKeyOf(r) === m)
      .slice()
      .sort((a, b) => this.pickReceiptDate(b)?.getTime()! - this.pickReceiptDate(a)?.getTime()!);
  });

  merchantReceiptsMonth = computed(() => {
    const m = this.selectedMerchantMonth();
    if (!m) return [];
    return this.monthlyReceiptsFiltered()
      .filter(r => this.merchantKeyOf(r) === m)
      .slice()
      .sort((a, b) => this.pickReceiptDate(b)?.getTime()! - this.pickReceiptDate(a)?.getTime()!);
  });

  constructor(private api: ReceiptsApi, private router: Router) {
    this.refresh();
  }

  // receiptWindowHref(id: number) {
  //   return this.router.serializeUrl(this.router.createUrlTree(['/w/receipts', id]));
  // }

  refresh() {
    this.api.list().subscribe({
      next: (rows) => {
        this.receiptSummaries.set(rows);

        if (!this.monthManuallySet()) {
          const latest = this.monthOptions()[0]?.date;
          if (latest) this.selectedMonth.set(this.monthStart(latest));
          this.selectedDay.set(null);
        }
      },
      error: () => this.receiptSummaries.set([]),
    });
  }

  // ---------- Month dropdown ----------
  setMonthByKey(key: string) {
    const d = this.monthFromKey(key);
    this.selectedMonth.set(d);
    this.selectedDay.set(null);
    this.monthManuallySet.set(true);

    // If you're in a monthly merchant drilldown, keep it filtered for the new month
    // (optional) but typically better UX is to reset the drilldown:
    this.selectedMerchantMonth.set(null);
  }

  // ---------- Month nav ----------
  prevMonth() {
    this.selectedMonth.update(m => this.monthStart(this.addMonths(m, -1)));
    this.selectedDay.set(null);
    this.monthManuallySet.set(true);
    this.selectedMerchantMonth.set(null);
  }

  nextMonth() {
    if (this.isNextDisabled()) return;
    this.selectedMonth.update(m => this.monthStart(this.addMonths(m, 1)));
    this.selectedDay.set(null);
    this.monthManuallySet.set(true);
    this.selectedMerchantMonth.set(null);
  }

  // ---------- Day filtering ----------
  toggleDay(day: number) {
    this.selectedDay.update(cur => (cur === day ? null : day));
    this.selectedMerchantMonth.set(null); // clean UX: reset drilldown when day changes
  }

  clearDay() {
    this.selectedDay.set(null);
    this.selectedMerchantMonth.set(null);
  }

  // Tooltip handlers
  onChartMouseMove(ev: MouseEvent) {
    const host = ev.currentTarget as HTMLElement;
    const rect = host.getBoundingClientRect();
    this.tooltipPos.set({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
  }

  onChartMouseLeave() {
    this.hovered.set(null);
  }

  hoverBar(day: number, amount: number, ev: MouseEvent) {
    this.hovered.set({ day, amount });
    this.onChartMouseMove(ev);
  }

  leaveBar() {
    this.hovered.set(null);
  }


  // ---------- Chart bar geometry ----------
  private chartW() { return this.CHART_RIGHT - this.CHART_LEFT; }
  private chartH() { return this.CHART_BOTTOM - this.CHART_TOP; }

  barW() {
    const days = this.daysInSelectedMonth();
    const slot = this.chartW() / days;
    const gap = 2;
    return Math.max(1, slot - gap);
  }

  barX(i: number) {
    const days = this.daysInSelectedMonth();
    const slot = this.chartW() / days;
    return this.CHART_LEFT + i * slot + 1;
  }

  barH(amount: number) {
    const max = this.dailyMax();
    return max <= 0 ? 0 : (amount / max) * this.chartH();
  }

  barY(amount: number) {
    return this.CHART_BOTTOM - this.barH(amount);
  }

  // ---------- Merchant drilldown handlers ----------
  selectMerchantAll(name: string) {
    this.selectedMerchantAll.set(name);
  }
  clearMerchantAll() {
    this.selectedMerchantAll.set(null);
  }

  selectMerchantMonth(name: string) {
    this.selectedMerchantMonth.set(name);
  }
  clearMerchantMonth() {
    this.selectedMerchantMonth.set(null);
  }

  // ---------- Actions like receipts page ----------
  badgeClass(status: string) {
    if (status === 'PARSED') return 'badge ok';
    if (status === 'FAILED') return 'badge bad';
    return 'badge warn';
  }

  deleteReceipt(id: number) {
    const ok = confirm(`Delete receipt #${id}? This cannot be undone.`);
    if (!ok) return;

    this.api.delete(id).subscribe({
      next: () => {
        this.receiptSummaries.set(this.receiptSummaries().filter(r => r.id !== id));
      },
      error: (e) => {
        console.error(e);
        alert('Delete failed. See console.');
      }
    });
  }

  openReceipt(id: number) {
    // ✅ Adjust this if your backend route differs
    const url = this.router.serializeUrl(this.router.createUrlTree(['/w/receipts', id]));
    window.open(url, '_blank', 'noopener');
  }

  // ---------- Display helpers ----------
  displayDate(r: ReceiptSummary) {
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

  private merchantKeyOf(r: ReceiptSummary): string {
    return (r.merchantNormalized ?? r.merchantRaw ?? 'unknown').toString().trim() || 'unknown';
  }

  private buildMerchantCounts(rows: ReceiptSummary[]) {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = this.merchantKeyOf(r);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  // ---------- Date helpers ----------
  private monthStart(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  private addMonths(d: Date, delta: number) {
    return new Date(d.getFullYear(), d.getMonth() + delta, 1);
  }
  private pickReceiptDate(r: ReceiptSummary): Date | null {
    if (r.purchaseDate) {
      const d = new Date(r.purchaseDate + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  // Month key: YYYY-MM
  private monthKey(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  private monthFromKey(key: string): Date {
    const [y, m] = key.split('-').map(x => parseInt(x, 10));
    return new Date(y, (m - 1), 1);
  }
  private formatMMYYYY(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${yyyy}`;
  }

  receiptNumberFor(list: { id: number }[], index: number) {
    // list is already sorted newest -> oldest, so need to return list.length - index for first row
    return list.length - index;
  }
}
