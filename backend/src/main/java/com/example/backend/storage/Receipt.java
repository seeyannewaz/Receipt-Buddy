package com.example.backend.storage;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "receipts")
public class Receipt {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReceiptStatus status = ReceiptStatus.UPLOADED;

  private String merchantRaw;
  private String merchantNormalized;

  private LocalDate purchaseDate;

  @Column(precision = 12, scale = 2)
  private BigDecimal subtotal;

  @Column(precision = 12, scale = 2)
  private BigDecimal tax;

  @Column(precision = 12, scale = 2)
  private BigDecimal total;

  @Column(columnDefinition = "text")
  private String rawText; // model-extracted text (optional)

  @Column(columnDefinition = "text")
  private String analysisJson; // raw JSON from model (for debugging)

  @Column(columnDefinition = "text")
  private String errorMessage;

  private String filePath;

  private Instant createdAt;
  private Instant updatedAt;

  @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ReceiptItem> items = new ArrayList<>();

  @PrePersist
  void onCreate() {
    createdAt = Instant.now();
    updatedAt = createdAt;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }
}
