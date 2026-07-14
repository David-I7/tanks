package com.tanks.server.websocket.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.MessageDeliveryException;

import java.net.URI;

public class ProblemDetailException extends MessageDeliveryException {

    private HttpStatus status;

    private String detail;

    private URI instance;

    public ProblemDetailException(HttpStatus status, String detail, URI instance){
        super(detail);
        this.detail = detail;
        this.instance = instance;
        this.status = status;
    }

    public ProblemDetailException(HttpStatus status, String detail){
        super(detail);
        this.detail = detail;
        this.instance = URI.create("about:blank");
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getDetail() {
        return detail;
    }

    public URI getInstance() {
        return instance;
    }
}
