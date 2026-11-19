package com.tanks.server.controllers;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/assets")
@ConditionalOnProperty(value = "app.environment", havingValue = "DEV")
public class AssetsController {

    @GetMapping(value = "/content", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getContent() throws Exception {
        String content = new ClassPathResource("content/game-content-v1.0.json")
                .getContentAsString(StandardCharsets.UTF_8);
        return ResponseEntity.status(HttpStatus.OK)
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).mustRevalidate().cachePublic())
                .body(content);
    }
}
