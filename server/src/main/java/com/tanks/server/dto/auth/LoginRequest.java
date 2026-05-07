package com.tanks.server.dto.auth;

import com.tanks.server.validation.EmailOrUsernameRequired;
import com.tanks.server.validation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@EmailOrUsernameRequired
public class LoginRequest {

    @ValidPassword(message = "Password must be at least 8 characters long and include uppercase, lowercase, and a digit character")
    private String password;

    @Size(min = 3,message = "Username must be at least 3 characters long")
    private String username;

    @Email
    private String email;

}