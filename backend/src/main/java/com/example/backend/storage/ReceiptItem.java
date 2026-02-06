package com.example.backend.storage;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "receipt_items")
public class ReceiptItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "receipt_id")
  private Receipt receipt;

  private String description;
  private String category;

  private Integer quantity;

  @Column(precision = 12, scale = 2)
  private BigDecimal unitPrice;

  @Column(precision = 12, scale = 2)
  private BigDecimal lineTotal;
}
