package com.tanks.server.services;

import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@AllArgsConstructor
public class UserService {

    private UserRepository repository;

    private PasswordEncoder passwordEncoder;

    @Transactional
    public void register(User user){
        Optional<User> existingUser = repository.findByUsernameOrEmail(user.getUsername(),user.getEmail());
        if(existingUser.isPresent()){
            boolean sameEmail = user.getEmail().equals(existingUser.get().getEmail());
            boolean sameUsername = user.getUsername().equals(existingUser.get().getUsername());
            String message = sameUsername && sameEmail ? "Username and email are already taken" : sameUsername ? "Username is taken" : "Email is taken";
            throw new ResponseStatusException(HttpStatus.CONFLICT,message);
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        repository.save(user);

    }

    public User findById(Long id){
        return repository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User with id '"+ id + "' does not exist."));
    }

    public User findByUsername(String username){
        return repository.findByUsername(username)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User with username '"+ username + "' does not exist."));
    }

    public User findByEmail(String email){
        return repository.findByEmail(email)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User with email '"+ email + "' does not exist."));
    }


}
