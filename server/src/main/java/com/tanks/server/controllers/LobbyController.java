package com.tanks.server.controllers;

import com.tanks.server.domain.LobbyType;
import com.tanks.server.dto.request.CreateLobbyRequestDto;
import com.tanks.server.dto.request.JoinLobbyRequestDto;
import com.tanks.server.dto.request.QuickMatchRequestDto;
import com.tanks.server.dto.response.LobbyActionResponseDto;
import com.tanks.server.websocket.services.LobbyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lobbies")
@RequiredArgsConstructor
public class LobbyController {

    private final LobbyService lobbyService;

    @PostMapping
    public ResponseEntity<LobbyActionResponseDto> createLobby(@Valid @RequestBody CreateLobbyRequestDto request) {
        LobbyActionResponseDto response = lobbyService.createPendingLobby(
                request.nickname(),
                request.tankId(),
                LobbyType.PRIVATE
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<LobbyActionResponseDto> joinLobby(
            @PathVariable UUID id,
            @Valid @RequestBody JoinLobbyRequestDto request) {
        LobbyActionResponseDto response = lobbyService.join(
                id,
                request.nickname(),
                request.tankId()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/quick-match")
    public ResponseEntity<LobbyActionResponseDto> quickMatch(@Valid @RequestBody QuickMatchRequestDto request) {
        LobbyActionResponseDto response = lobbyService.joinQuickMatch(
                request.nickname(),
                request.tankId()
        );
        return ResponseEntity.ok(response);
    }
}
