package com.tanks.server.controllers;
 
import com.tanks.server.websocket.dto.gameplay.gameContent.GameContentResponseDto;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/game")
@RequiredArgsConstructor
public class GameController {

    private final GameContentCatalog gameContentCatalog;

    @GetMapping("/content")
    public ResponseEntity<GameContentResponseDto> getContent() {
        return ResponseEntity.ok(GameContentResponseDto.from(gameContentCatalog.current()));
    }
}
