package com.tanks.server.websocket.validation;

import com.tanks.server.websocket.dto.chat.ChatMessageDto;
import com.tanks.server.websocket.dto.chat.ChatMessageType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ChatMessageDtoValidator implements ConstraintValidator<ValidChatMessage, ChatMessageDto> {

    private static int MAX_MESSAGE_LENGTH = 1000;

    @Override
    public boolean isValid(ChatMessageDto dto, ConstraintValidatorContext context) {
        if(dto == null) return false;

        context.disableDefaultConstraintViolation();
        boolean valid = true;

        if (dto.getType() == null) {
            addViolation(context,"type","type is required");
            valid =false;
        }

        if (dto.getSender() != null) {
            addViolation(context,"sender","sender must be null");
            valid = false;
        }

        if (dto.getType() == ChatMessageType.MESSAGE) {
            if (dto.getMessage() == null) {
                addViolation(context,"message","message must not be null");
                valid = false;
            } else if (dto.getMessage().isBlank()) {
                addViolation(context,"message","message should not have leading or trailing whitespace");
                valid = false;
            }else if (dto.getMessage().length() > MAX_MESSAGE_LENGTH){
                addViolation(context,"sender","max message length exceeded");
                valid = false;
            }
        }else if(dto.getMessage() != null){
            addViolation(context,"message","message must be null for type " + dto.getType());
            valid = false;
        }

        return valid;
    }

    private void addViolation(
            ConstraintValidatorContext context,
            String field,
            String message
    ) {
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation();
    }
}
