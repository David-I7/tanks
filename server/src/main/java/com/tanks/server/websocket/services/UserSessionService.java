package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.UserSessionRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
@AllArgsConstructor
public class UserSessionService {

    private final UserSessionRepository userSessionRepository;

    public UserSession save(UserSession userSession){
        return userSessionRepository.save(userSession);
    }

    public UserSession findById(long id){
        return userSessionRepository.findById(id).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "The user session with the provided id does not exist.", URI.create("about:blank")));
    }

    public void delete(UserSession userSession){
        userSessionRepository.delete(userSession);
    }

}
