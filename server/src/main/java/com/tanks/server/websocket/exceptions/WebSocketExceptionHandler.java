package com.tanks.server.websocket.exceptions;

import com.tanks.server.dto.validation.ConstraintValidationDto;
import com.tanks.server.mappers.validation.ObjectErrorToConstraintValidationDto;
import com.tanks.server.utils.ProblemDetailWriter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.net.URI;
import java.util.List;

@ControllerAdvice
public class WebSocketExceptionHandler {

    private ObjectErrorToConstraintValidationDto constraintValidationDtoMapper= new ObjectErrorToConstraintValidationDto();

    private ProblemDetailWriter problemDetailWriter;

    public WebSocketExceptionHandler(ProblemDetailWriter problemDetailWriter){
        this.problemDetailWriter = problemDetailWriter;
    }

    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    @SendToUser("/queue/errors")
    public ProblemDetail handleValidationException(
            MethodArgumentNotValidException e
    ) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(e.getFailedMessage(),StompHeaderAccessor.class);

        String destination = null;
        if(accessor != null){
            destination = accessor.getDestination();
        }

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problemDetail.setInstance(URI.create(destination == null ? "/ws" : destination));
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setTitle(HttpStatus.BAD_REQUEST.toString());

        List<ConstraintValidationDto> validationDtos =
                e.getBindingResult().getAllErrors().stream()
                        .map(objectError -> constraintValidationDtoMapper.apply(objectError))
                        .toList();

        problemDetail.setProperty("errors",validationDtos);

        return problemDetail;
    }

    @MessageExceptionHandler(ProblemDetailException.class)
    @SendToUser("/queue/errors")
    public ProblemDetail handleProblemDetailException(ProblemDetailException ex){
        return problemDetailWriter.createProblemDetail(ex);
    }
}
