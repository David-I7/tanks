package com.tanks.server.utils;

import com.tanks.server.websocket.exceptions.ProblemDetailException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;

@Component
@AllArgsConstructor
public class ProblemDetailWriter {

    private ObjectMapper objectMapper;

    public void writeProblemDetail(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String detail) {
        try {
            ProblemDetail problemDetail = ProblemDetail.forStatus(status);
            problemDetail.setTitle(status.getReasonPhrase());
            problemDetail.setDetail(detail);
            problemDetail.setType(URI.create("about:blank"));
            problemDetail.setInstance(URI.create(request.getRequestURI()));

            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setStatus(status.value());
            var jsonProblemDetail = objectMapper.writeValueAsString(problemDetail);
            response.setContentLength(jsonProblemDetail.getBytes().length);
            response.getWriter().write(jsonProblemDetail);
        } catch (Exception e) {
            // Ignore
        }
    }

    public void writeProblemDetail(ServerHttpRequest request, ServerHttpResponse response, HttpStatus status, String detail) {
        try {
            ProblemDetail problemDetail = ProblemDetail.forStatus(status);
            problemDetail.setTitle(status.getReasonPhrase());
            problemDetail.setDetail(detail);
            problemDetail.setType(URI.create("about:blank"));
            problemDetail.setInstance(URI.create(request.getURI().toString()));

            response.getHeaders().add("Content-Type", MediaType.APPLICATION_JSON_VALUE);
            response.setStatusCode(status);
            var jsonProblemDetail = objectMapper.writeValueAsString(problemDetail);
            response.getHeaders().add("Content-Length",String.valueOf(jsonProblemDetail.getBytes().length));
            response.getBody().write(jsonProblemDetail.getBytes());
        } catch (Exception e) {
            // Ignore
        }
    }


    public Message<byte[]> createMessage(ProblemDetailException ex) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);

        accessor.setLeaveMutable(true);
        accessor.setContentType(MediaType.APPLICATION_JSON);

        ProblemDetail problemDetail = createProblemDetail(ex);

        byte[] problemDetailBytes = objectMapper.writeValueAsString(problemDetail).getBytes();
        accessor.setContentLength(problemDetailBytes.length);

        return MessageBuilder.createMessage(
                problemDetailBytes,
                accessor.getMessageHeaders());
    }

    public ProblemDetail createProblemDetail(ProblemDetailException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(ex.getStatus());
        problemDetail.setTitle(ex.getStatus().getReasonPhrase());
        problemDetail.setDetail(ex.getDetail());
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setInstance(ex.getInstance());

        return problemDetail;
    }

}
