package com.tanks.server.exceptions;

import com.tanks.server.utils.ProblemDetailWriter;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

import java.net.URI;

@Component
@AllArgsConstructor
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    private ProblemDetailWriter problemDetailWriter;

    @Override
    public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
        if( ex instanceof StompException){
            return problemDetailWriter.create((StompException) ex);
        }else if (ex.getCause() instanceof StompException){
            return problemDetailWriter.create((StompException) ex.getCause());
        }

        return defaultException(clientMessage,ex);
    }

    private Message<byte[]> defaultException(Message<byte[]> clientMessage, Throwable ex){
        return super.handleClientMessageProcessingError(clientMessage, ex);
    }
}
