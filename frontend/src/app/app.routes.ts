import { Routes } from '@angular/router';
import { ReceiptDetailComponent } from './pages/receipt-detail/receipt-detail.component';

export const routes: Routes = [
  // ✅ Window-only route (no shell)
  {
    path: 'w/receipts/:id',
    component: ReceiptDetailComponent,
    data: { layout: 'blank' },
  },

  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'receipts', loadComponent: () => import('./pages/receipts/receipts.component').then(m => m.ReceiptsComponent) },
  { path: 'receipts/:id', loadComponent: () => import('./pages/receipt-detail/receipt-detail.component').then(m => m.ReceiptDetailComponent) },
  { path: 'upload', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // ✅ optional: any unknown route goes home
  { path: '**', redirectTo: 'dashboard' },
];
