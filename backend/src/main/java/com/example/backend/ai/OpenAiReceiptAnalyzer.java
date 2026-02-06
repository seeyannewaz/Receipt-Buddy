package com.example.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Base64;

@Service
public class OpenAiReceiptAnalyzer {

  private static final ObjectMapper om = new ObjectMapper();

  private final HttpClient http = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(20))
      .build();

  @Value("${app.openai.apiKey}")
  private String apiKey;

  @Value("${app.openai.model:gpt-5.2}")
  private String model;

  @Value("${app.openai.baseUrl:https://api.openai.com/v1}")
  private String baseUrl;

  private static final String PROMPT = """
      You are a receipt analysis engine.
      Extract a structured receipt analysis from the image.
      Rules:
      - If a card number appears, keep only last4.
      - Normalize merchant to lowercase alphanumeric + spaces.
      Return ONLY valid JSON matching the schema.
      """;

  // JSON Schema for strict structured output
  private static final String SCHEMA_JSON = """
      {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "merchantRaw": { "type": ["string","null"] },
          "merchantNormalized": { "type": ["string","null"] },
          "purchaseDate": { "type": ["string","null"], "description": "YYYY-MM-DD" },
          "subtotal": { "type": ["number","null"] },
          "tax": { "type": ["number","null"] },
          "total": { "type": ["number","null"] },
          "rawText": { "type": ["string","null"] },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "description": { "type": "string" },
                "category": { "type": ["string","null"] },
                "quantity": { "type": ["integer","null"] },
                "unitPrice": { "type": ["number","null"] },
                "lineTotal": { "type": ["number","null"] }
              },
              "required": ["description","category","quantity","unitPrice","lineTotal"]
            }
          },
          "insights": { "type": "array", "items": { "type": "string" } },
          "warnings": { "type": "array", "items": { "type": "string" } }
        },
        "required": [
          "merchantRaw","merchantNormalized","purchaseDate","subtotal","tax","total",
          "rawText","items","insights","warnings"
        ]
      }
      """;

  public ReceiptAiResult analyze(Path imagePath) throws Exception {
    byte[] bytes = Files.readAllBytes(imagePath);
    String mime = guessMime(imagePath);
    String b64 = Base64.getEncoder().encodeToString(bytes);
    String dataUrl = "data:" + mime + ";base64," + b64;

    ObjectNode req = om.createObjectNode();
    req.put("model", model);

    ArrayNode input = req.putArray("input");
    ObjectNode msg = input.addObject();
    msg.put("role", "user");

    ArrayNode content = msg.putArray("content");
    content.addObject()
        .put("type", "input_text")
        .put("text", PROMPT);
    content.addObject()
        .put("type", "input_image")
        .put("image_url", dataUrl);

    ObjectNode text = req.putObject("text").putObject("format");
    text.put("type", "json_schema");
    text.put("name", "receipt_analysis");
    text.put("strict", true);
    text.set("schema", om.readTree(SCHEMA_JSON));

    HttpRequest httpReq = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/responses"))
        .timeout(Duration.ofSeconds(60))
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(om.writeValueAsString(req)))
        .build();

    HttpResponse<String> resp = http.send(httpReq, HttpResponse.BodyHandlers.ofString());

    if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
      throw new RuntimeException("OpenAI error " + resp.statusCode() + ": " + resp.body());
    }

    JsonNode tree = om.readTree(resp.body());
    String outputText = extractOutputText(tree); // JSON as a string
    JsonNode analysis = om.readTree(outputText);

    return new ReceiptAiResult(outputText, analysis);
  }

  private static String extractOutputText(JsonNode root) {
    // Some SDKs expose "output_text" convenience; REST response often has
    // output[].content[].text
    if (root.hasNonNull("output_text"))
      return root.get("output_text").asText();

    StringBuilder sb = new StringBuilder();
    JsonNode output = root.get("output");
    if (output != null && output.isArray()) {
      for (JsonNode item : output) {
        JsonNode content = item.get("content");
        if (content != null && content.isArray()) {
          for (JsonNode c : content) {
            if ("output_text".equals(c.path("type").asText())) {
              sb.append(c.path("text").asText());
            }
          }
        }
      }
    }
    String s = sb.toString().trim();
    if (s.isEmpty())
      throw new RuntimeException("No output_text found in model response.");
    return s;
  }

  private static String guessMime(Path path) {
    String name = path.getFileName().toString().toLowerCase();
    if (name.endsWith(".png"))
      return "image/png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg"))
      return "image/jpeg";
    // fallback
    return "image/png";
  }

  public record ReceiptAiResult(String rawJson, JsonNode jsonNode) {
  }
}
