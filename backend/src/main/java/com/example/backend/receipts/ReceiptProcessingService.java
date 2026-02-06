package com.example.backend.receipts;

import com.example.backend.ai.OpenAiReceiptAnalyzer;
import com.example.backend.storage.*;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.file.Paths;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ReceiptProcessingService {

  private final ReceiptRepository receiptRepo;
  private final OpenAiReceiptAnalyzer analyzer;

  @Async
  @Transactional
  public void processAsync(Long receiptId) {
    Receipt receipt = receiptRepo.findById(receiptId).orElseThrow();

    try {
      receipt.setStatus(ReceiptStatus.PROCESSING);
      receiptRepo.save(receipt);

      var result = analyzer.analyze(Paths.get(receipt.getFilePath()));
      receipt.setAnalysisJson(result.rawJson());

      JsonNode a = result.jsonNode();
      receipt.setMerchantRaw(textOrNull(a, "merchantRaw"));
      receipt.setMerchantNormalized(textOrNull(a, "merchantNormalized"));

      String date = textOrNull(a, "purchaseDate");
      if (date != null && !date.isBlank())
        receipt.setPurchaseDate(LocalDate.parse(date));

      receipt.setSubtotal(decimalOrNull(a, "subtotal"));
      receipt.setTax(decimalOrNull(a, "tax"));
      receipt.setTotal(decimalOrNull(a, "total"));
      receipt.setRawText(textOrNull(a, "rawText"));

      // Replace items
      receipt.getItems().clear();
      if (a.has("items") && a.get("items").isArray()) {
        for (JsonNode it : a.get("items")) {
          ReceiptItem item = new ReceiptItem();
          item.setReceipt(receipt);
          item.setDescription(it.path("description").asText());
          item.setCategory(it.path("category").isNull() ? null : it.path("category").asText(null));
          item.setQuantity(it.path("quantity").isNull() ? null : it.path("quantity").asInt());
          item.setUnitPrice(it.path("unitPrice").isNull() ? null : new BigDecimal(it.path("unitPrice").asText()));
          item.setLineTotal(it.path("lineTotal").isNull() ? null : new BigDecimal(it.path("lineTotal").asText()));
          receipt.getItems().add(item);
        }
      }

      receipt.setStatus(ReceiptStatus.PARSED);
      receipt.setErrorMessage(null);
      receiptRepo.save(receipt);

    } catch (Exception e) {
      receipt.setStatus(ReceiptStatus.FAILED);
      receipt.setErrorMessage(e.getMessage());
      receiptRepo.save(receipt);
    }
  }

  private static String textOrNull(JsonNode node, String field) {
    JsonNode v = node.get(field);
    if (v == null || v.isNull())
      return null;
    return v.asText();
  }

  private static BigDecimal decimalOrNull(JsonNode node, String field) {
    JsonNode v = node.get(field);
    if (v == null || v.isNull())
      return null;
    return new BigDecimal(v.asText());
  }
}
