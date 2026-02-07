import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { timer, switchMap, takeWhile, finalize } from 'rxjs';
import { ReceiptsApi } from '../../api/receipts.api';
import { Receipt } from '../../models/receipt.models';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
})
export class UploadComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  uploading = signal(false);
  message = signal('');
  lastReceipt = signal<Receipt | null>(null);

  previewUrl = signal<string | null>(null);
  dragOver = signal(false);

  // track object URL so we can revoke it (avoid memory leak)
  private previewObjectUrl: string | null = null;

  constructor(private api: ReceiptsApi, private router: Router) { }

  // =========================
  // File picking
  // =========================
  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';

    this.setPreview(file);
    this.uploadFile(file);
  }

  // =========================
  // Drag & drop handlers
  // =========================
  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    if (this.uploading()) return;
    this.dragOver.set(true);
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(false);
    if (this.uploading()) return;

    const file = ev.dataTransfer?.files?.[0];
    if (!file) return;

    this.setPreview(file);
    this.uploadFile(file);
  }

  clearSelection() {
    this.cleanupPreview();
    this.previewUrl.set(null);
    this.message.set('');
  }

  // =========================
  // Core upload + poll
  // =========================
  private uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.message.set('Please upload an image file.');
      return;
    }

    this.uploading.set(true);
    this.message.set('Uploading...');

    this.api.upload(file).subscribe({
      next: (r) => {
        this.lastReceipt.set(r);
        this.message.set(`Uploaded receipt #${r.id}. Processing...`);

        // Poll until PARSED or FAILED
        timer(0, 1500)
          .pipe(
            switchMap(() => this.api.get(r.id)),
            takeWhile(
              (rec) => rec.status === 'UPLOADED' || rec.status === 'PROCESSING',
              true
            ),
            finalize(() => {
              // stop spinner once polling completes
              this.uploading.set(false);
            })
          )
          .subscribe((rec) => {
            this.lastReceipt.set(rec);

            if (rec.status === 'PARSED') {
              this.message.set('Parsed ✅');
              this.openReceiptWindow(rec.id);
            } else if (rec.status === 'FAILED') {
              this.message.set(`Failed ❌ ${rec.errorMessage ?? ''}`);
            } else {
              this.message.set('Processing...');
            }
          });
      },
      error: (err) => {
        console.error(err);
        this.uploading.set(false);
        this.message.set('Upload failed (see console).');
      },
    });
  }

  // open details in window-only route (no shell)
  openReceiptWindow(id: number) {
    const url = `/w/receipts/${id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  
  receiptWindowHref(id: number) {
    return `/w/receipts/${id}`;
  }

  // =========================
  // Preview helpers
  // =========================
  private setPreview(file: File) {
    if (!file.type.startsWith('image/')) return;

    this.cleanupPreview();
    const url = URL.createObjectURL(file);
    this.previewObjectUrl = url;
    this.previewUrl.set(url);
  }

  private cleanupPreview() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  // =========================
  // Badge styling
  // =========================
  badgeClass(status: string) {
    if (status === 'PARSED') return 'badge ok';
    if (status === 'FAILED') return 'badge bad';
    return 'badge warn';
  }

  receiptNumberFor(list: { id: number }[], index: number) {
    // if list is already sorted newest -> oldest, this makes 1 for first row
    return list.length - index;
  }
}
