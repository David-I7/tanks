package com.tanks.server.websocket.exceptions;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;

public class GlobalExceptionHandler {

    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    @SendToUser("/queue/errors")
    public String handleValidationException(
            MethodArgumentNotValidException ex
    ) {
        return "Invalid message";
    }

}
