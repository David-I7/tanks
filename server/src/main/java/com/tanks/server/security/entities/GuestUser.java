package com.tanks.server.security.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class JwtPrincipal {
    private String username;
    private String guestId;
}
