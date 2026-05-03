package com.tanks.server.services;

import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@AllArgsConstructor
public class UserService {

    private UserRepository repository;

    private PasswordEncoder passwordEncoder;

    public void register(User user){
        if(repository.existsByUsername(user.getUsername())){
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Username already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        repository.save(user);
    }
}
