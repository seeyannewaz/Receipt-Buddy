package com.example.backend.storage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

  @Query("select r from Receipt r left join fetch r.items where r.id = :id")
  Optional<Receipt> findByIdWithItems(@Param("id") Long id);
}
