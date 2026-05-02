package com.tanks.server.security.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class GuestUser {
    private String username;
    private String id;
}
