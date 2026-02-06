package com.example.backend.api;

import com.example.backend.storage.Receipt;
import com.example.backend.storage.ReceiptStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ReceiptSummaryDto(
    Long id,
    ReceiptStatus status,
    String merchantRaw,
    LocalDate purchaseDate,
    BigDecimal total,
    Instant createdAt) {
      
  public static ReceiptSummaryDto from(Receipt r) {
    return new ReceiptSummaryDto(
        r.getId(),
        r.getStatus(),
        r.getMerchantRaw(),
        r.getPurchaseDate(),
        r.getTotal(),
        r.getCreatedAt());
  }
}
