package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.userSession.UserSession;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface UserSessionRepository extends CrudRepository<UserSession, Long> {
}
