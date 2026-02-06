package com.example.backend.api;

import com.example.backend.receipts.*;
import com.example.backend.storage.*;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import java.nio.file.Path;
import java.util.List;

@Service
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/receipts")
public class ReceiptController {

  private final ReceiptRepository repo;
  private final FileStorageService storage;
  private final ReceiptProcessingService processor;
  private final ReceiptDeleteService deleteService;

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ReceiptDto upload(@RequestPart("file") MultipartFile file) throws Exception {
    Path saved = storage.save(file);

    Receipt r = new Receipt();
    r.setStatus(ReceiptStatus.UPLOADED);
    r.setFilePath(saved.toString());
    r = repo.save(r);

    // Background parse
    processor.processAsync(r.getId());

    return ReceiptDto.from(r);
  }

  @GetMapping
  public List<ReceiptSummaryDto> list() {
    return repo.findAll().stream()
        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
        .map(ReceiptSummaryDto::from)
        .toList();
  }

  @GetMapping("/{id}")
  public ReceiptDto get(@PathVariable Long id) {
    Receipt r = repo.findByIdWithItems(id).orElseThrow();
    return ReceiptDto.from(r);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    deleteService.deleteById(id);
    return ResponseEntity.noContent().build(); // 204

  }

  @GetMapping("/{id}/image")
  public ResponseEntity<Resource> image(@PathVariable Long id) throws IOException {
    Receipt r = repo.findById(id).orElseThrow();

    if (r.getFilePath() == null || r.getFilePath().isBlank()) {
      return ResponseEntity.notFound().build();
    }

    Path path = Paths.get(r.getFilePath()).normalize();

    // Optional but recommended to ensure file exists
    if (!Files.exists(path)) {
      return ResponseEntity.notFound().build();
    }

    Resource resource = new UrlResource(path.toUri());
    if (!resource.exists() || !resource.isReadable()) {
      return ResponseEntity.notFound().build();
    }

    // Detect content type (png/jpg/pdf/...)
    String contentType = Files.probeContentType(path);
    if (contentType == null)
      contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + path.getFileName().toString() + "\"")
        .contentType(MediaType.parseMediaType(contentType))
        .body(resource);
  }

  @DeleteMapping
  public ResponseEntity<Void> deleteAll() {
    deleteService.deleteAll();
    return ResponseEntity.noContent().build();
  }
}
