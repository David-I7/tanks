package com.tanks.server.websocket.exceptions;

import com.tanks.server.utils.ProblemDetailWriter;
import lombok.AllArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

@Component
@AllArgsConstructor
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    private ProblemDetailWriter problemDetailWriter;

    @Override
    public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
        if( ex instanceof StompException){
            return problemDetailWriter.create((StompException) ex);
        }else if (ex.getCause() instanceof StompException stompException){
            return problemDetailWriter.create(stompException);
        }

        return defaultException(clientMessage,ex);
    }

    private Message<byte[]> defaultException(Message<byte[]> clientMessage, Throwable ex){
        return super.handleClientMessageProcessingError(clientMessage, ex);
    }
}
