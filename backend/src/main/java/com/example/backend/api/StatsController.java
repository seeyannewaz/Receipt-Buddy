package com.example.backend.api;

import com.example.backend.storage.Receipt;
import com.example.backend.storage.ReceiptRepository;
import com.example.backend.storage.ReceiptStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stats")
public class StatsController {

  private final ReceiptRepository repo;

  @GetMapping("/overview")
  public StatsOverview overview() {
    List<Receipt> parsed = repo.findAll().stream()
        .filter(r -> r.getStatus() == ReceiptStatus.PARSED)
        .toList();

    BigDecimal totalSpend = parsed.stream()
        .map(Receipt::getTotal)
        .filter(t -> t != null)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    return new StatsOverview(parsed.size(), totalSpend);
  }

  public record StatsOverview(int parsedReceiptCount, BigDecimal totalSpend) {
  }
}
