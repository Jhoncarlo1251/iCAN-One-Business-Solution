package com.ican.backend.api;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String,String>> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()==null?"Request failed.":e.getReason()));
  }
  @ExceptionHandler(DuplicateKeyException.class)
  ResponseEntity<Map<String,String>> duplicate(DuplicateKeyException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error","A record with the same unique identifier already exists."));
  }
  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String,String>> generic(Exception e) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","Unexpected server error. Check server logs using safe, non-sensitive diagnostics."));
  }
}
