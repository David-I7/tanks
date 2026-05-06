package com.tanks.server.repositories;

import com.tanks.server.entities.UserIdentity;
import com.tanks.server.entities.UserIdentityID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, UserIdentityID> {

}
