package com.example.backend.api;

import com.example.backend.storage.Receipt;
import com.example.backend.storage.ReceiptItem;
import com.example.backend.storage.ReceiptStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ReceiptDto(
    Long id,
    ReceiptStatus status,
    String merchantRaw,
    String merchantNormalized,
    LocalDate purchaseDate,
    BigDecimal subtotal,
    BigDecimal tax,
    BigDecimal total,
    String rawText,
    String filePath,
    Instant createdAt,
    String errorMessage,
    List<ReceiptItemDto> items) {
      
  public static ReceiptDto from(Receipt r) {
    return new ReceiptDto(
        r.getId(),
        r.getStatus(),
        r.getMerchantRaw(),
        r.getMerchantNormalized(),
        r.getPurchaseDate(),
        r.getSubtotal(),
        r.getTax(),
        r.getTotal(),
        r.getRawText(),
        r.getFilePath(),
        r.getCreatedAt(),
        r.getErrorMessage(),
        r.getItems().stream().map(ReceiptItemDto::from).toList());
  }

  public record ReceiptItemDto(
      Long id,
      String description,
      String category,
      Integer quantity,
      BigDecimal unitPrice,
      BigDecimal lineTotal) {
    static ReceiptItemDto from(ReceiptItem i) {
      return new ReceiptItemDto(
          i.getId(),
          i.getDescription(),
          i.getCategory(),
          i.getQuantity(),
          i.getUnitPrice(),
          i.getLineTotal());
    }
  }
}
