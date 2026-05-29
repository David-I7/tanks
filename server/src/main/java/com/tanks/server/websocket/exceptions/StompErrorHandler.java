package com.tanks.server.websocket.exceptions;

import com.tanks.server.utils.ProblemDetailWriter;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

import java.net.URI;

@Component
@AllArgsConstructor
@Slf4j
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    private ProblemDetailWriter problemDetailWriter;

    @Override
    public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
        if( ex instanceof ProblemDetailException){
            return problemDetailWriter.createMessage((ProblemDetailException) ex);
        }else if (ex.getCause() instanceof ProblemDetailException stompException){
            return problemDetailWriter.createMessage(stompException);
        }

        return defaultException(clientMessage,ex);
    }

    private Message<byte[]> defaultException(Message<byte[]> clientMessage, Throwable ex) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(clientMessage, StompHeaderAccessor.class);

        String destination = null;

        if (accessor != null) {
            accessor.getDestination();
        }

        String errorMessage = ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage();

        log.debug("Stomp error: {}", errorMessage);
        return problemDetailWriter.createMessage(new ProblemDetailException(HttpStatus.BAD_REQUEST, "Bad Request", URI.create(destination == null ? "/" : destination)));
    }
}
