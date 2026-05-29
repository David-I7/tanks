package com.tanks.server.utils;

import com.tanks.server.websocket.exceptions.ProblemDetailException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;

@Component
@AllArgsConstructor
public class ProblemDetailWriter {

    private ObjectMapper objectMapper;

    public void writeProblemDetail(HttpServletRequest request,
                                   HttpServletResponse response,
                                   HttpStatus status,
                                   String detail) throws IOException {

        ProblemDetail problemDetail = ProblemDetail.forStatus(status);
        problemDetail.setTitle(status.toString());
        problemDetail.setDetail(detail);
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setInstance(URI.create(request.getServletPath()));

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        objectMapper.writeValue(response.getWriter(), problemDetail);
    }

    public Message<byte[]> createMessage(ProblemDetailException ex){
        StompHeaderAccessor accessor =
                StompHeaderAccessor.create(StompCommand.ERROR);

        accessor.setLeaveMutable(true);
        accessor.setContentType(MediaType.APPLICATION_JSON);

        ProblemDetail problemDetail = ProblemDetail.forStatus(ex.getStatus());
        problemDetail.setTitle(ex.getStatus().toString());
        problemDetail.setDetail(ex.getDetail());
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setInstance(ex.getInstance());

        byte[] problemDetailBytes = objectMapper.writeValueAsString(problemDetail).getBytes();

        accessor.setContentLength(problemDetailBytes.length);

        return MessageBuilder.createMessage(
                problemDetailBytes,
                accessor.getMessageHeaders());
    }

    public ProblemDetail createProblemDetail(ProblemDetailException ex){
        ProblemDetail problemDetail = ProblemDetail.forStatus(ex.getStatus());
        problemDetail.setTitle(ex.getStatus().toString());
        problemDetail.setDetail(ex.getDetail());
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setInstance(ex.getInstance());

        return problemDetail;
    }

}
