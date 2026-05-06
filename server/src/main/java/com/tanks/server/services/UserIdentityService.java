package com.tanks.server.services;

import com.tanks.server.entities.UserIdentity;
import com.tanks.server.entities.UserIdentityID;
import com.tanks.server.repositories.UserIdentityRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@AllArgsConstructor
public class UserIdentityService {

    private UserIdentityRepository repository;

    public Optional<UserIdentity> findById(UserIdentityID id){
            return repository.findById(id);
    }

}
