package com.example.backend.receipts;

import com.example.backend.storage.Receipt;
import com.example.backend.storage.ReceiptRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class ReceiptDeleteService {

  private final ReceiptRepository repo;

  public ReceiptDeleteService(ReceiptRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public void deleteById(Long id) {
    Receipt r = repo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receipt not found"));
    deleteReceiptAndFile(r);
  }

  @Transactional
  public void deleteAll() {
    List<Receipt> all = repo.findAll();
    for (Receipt r : all) {
      deleteReceiptAndFile(r);
    }
  }

  private void deleteReceiptAndFile(Receipt r) {
    // delete uploaded file if present
    String filePath = r.getFilePath();
    if (filePath != null && !filePath.isBlank()) {
      try {
        Path p = Paths.get(filePath);
        Files.deleteIfExists(p);
      } catch (Exception ignored) {
      }
    }

    // deletes receipt row; deletes items too if cascade+orphanRemoval is set
    repo.delete(r);
  }
}
