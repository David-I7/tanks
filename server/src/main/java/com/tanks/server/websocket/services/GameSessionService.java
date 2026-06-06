package com.tanks.server.websocket.services;

import com.tanks.server.websocket.repositories.GameSessionRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class GameSessionService {

    private GameSessionRepository gameRepository;


}
