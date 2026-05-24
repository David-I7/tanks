package com.tanks.server.websocket.validation;

import com.tanks.server.websocket.dto.chat.ChatMessageRequestDto;
import com.tanks.server.websocket.dto.chat.ChatMessageType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ChatMessageRequestDtoValidator implements ConstraintValidator<ValidChatMessageRequestDto, ChatMessageRequestDto> {

    private static int MAX_MESSAGE_LENGTH = 1000;

    @Override
    public boolean isValid(ChatMessageRequestDto dto, ConstraintValidatorContext context) {
        if(dto == null) return false;

        context.disableDefaultConstraintViolation();
        boolean valid = true;

        if (dto.getType() == null) {
            addViolation(context,"type","type is required");
            valid = false;
        }

        if (dto.getType() == ChatMessageType.MESSAGE) {
            if (dto.getMessage() == null || dto.getMessage().isBlank()) {
                addViolation(context,"message","message must not be null or blank");
                valid = false;
            }else if (dto.getMessage().length() > MAX_MESSAGE_LENGTH){
                addViolation(context,"sender","max message length exceeded");
                valid = false;
            }
        }else if(dto.getMessage() != null){
            addViolation(context,"message","type '" + dto.getType() + "' should have no message");
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
