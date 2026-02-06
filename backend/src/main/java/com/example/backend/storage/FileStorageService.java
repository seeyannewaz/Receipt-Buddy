package com.example.backend.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.*;
import java.util.Optional;

@Service
public class FileStorageService {

  private final Path uploadDir;

  public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDir) {
    this.uploadDir = Paths.get(uploadDir).toAbsolutePath();
  }

  public Path save(MultipartFile file) throws Exception {
    Files.createDirectories(uploadDir);

    String original = Optional.ofNullable(file.getOriginalFilename()).orElse("receipt");
    String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
    String filename = System.currentTimeMillis() + "_" + safe;

    Path target = uploadDir.resolve(filename);
    try (InputStream in = file.getInputStream()) {
      Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
    }
    return target;
  }
}
