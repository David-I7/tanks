package com.tanks.server.repositories;

import com.tanks.server.entities.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID>{

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt <= CURRENT_TIMESTAMP")
    void deleteExpiredTokens();

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.id = :id")
    void revokeById(@Param("id") UUID jti);

}