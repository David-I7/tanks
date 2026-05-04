package com.tanks.server.dto.auth;

import com.tanks.server.validation.ValidPassword;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class RegisterRequest {

    @ValidPassword(message = "Password must be at least 8 characters long and include uppercase, lowercase, and a digit character")
    private String password;

    @Min(value = 3,message = "Username must be at least 3 characters long")
    private String username;

}
