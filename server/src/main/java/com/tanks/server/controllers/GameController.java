package com.tanks.server.controllers;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;

@RestController
@RequestMapping("/api/v1/game")
public class GameController {

    @GetMapping("/content")
    public ResponseEntity<String> getContent() throws Exception{
        String content = Files.readString(new ClassPathResource("content/game-content-v1.0.json").getFilePath());
        return ResponseEntity.ok(content);
    }
}
