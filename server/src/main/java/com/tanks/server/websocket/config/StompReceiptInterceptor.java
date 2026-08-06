package com.tanks.server.websocket.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class StompReceiptInterceptor implements ChannelInterceptor {

    private final MessageChannel clientOutboundChannel;

    public StompReceiptInterceptor(@Lazy @Qualifier("clientOutboundChannel") MessageChannel clientOutboundChannel) {
        this.clientOutboundChannel = clientOutboundChannel;
    }

    @Override
    public void postSend(Message<?> message, MessageChannel channel, boolean sent) {
        if (!sent) {
            return;
        }

        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return;
        }

        String receiptId = accessor.getReceipt();
        if (receiptId != null && !receiptId.trim().isEmpty()) {
            StompHeaderAccessor receiptAccessor = StompHeaderAccessor.create(StompCommand.RECEIPT);
            receiptAccessor.setReceiptId(receiptId);
            receiptAccessor.setSessionId(accessor.getSessionId());
            if (accessor.getUser() != null) {
                receiptAccessor.setUser(accessor.getUser());
            }

            Message<byte[]> receiptMessage = MessageBuilder.createMessage(
                    new byte[0],
                    receiptAccessor.getMessageHeaders()
            );
            clientOutboundChannel.send(receiptMessage);
            log.debug("Sent STOMP RECEIPT frame for receipt-id: {} to session: {}", receiptId, accessor.getSessionId());
        }
    }
}
