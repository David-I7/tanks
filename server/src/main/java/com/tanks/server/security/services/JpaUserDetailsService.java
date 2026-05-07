package com.tanks.server.security.services;

import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.security.entities.JpaUserDetails;
import lombok.AllArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class JpaUserDetailsService implements UserDetailsService {

    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User with username '" + username +  "' does not exist"));

        return new JpaUserDetails(user);
    }

    public UserDetails loadUserByEmail(String email) throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User with email '" + email +  "' does not exist"));

        return new JpaUserDetails(user);
    }
}
