package com.tanks.server.repositories;

import com.tanks.server.entities.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends CrudRepository<User,Long> {

    @Query("SELECT u FROM User u WHERE u.username = :username or u.email = :email")
    Optional<User> findByUsernameOrEmail(@Param("username") String username,@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);

    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);
}
