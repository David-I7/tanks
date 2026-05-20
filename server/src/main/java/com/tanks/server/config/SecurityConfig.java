package com.tanks.server.config;

import com.tanks.server.security.filters.JwtAuthenticationFilter;
import com.tanks.server.security.oauth.OAuth2SuccessHandler;
import jakarta.servlet.DispatcherType;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@AllArgsConstructor
@EnableWebSecurity
public class SecurityConfig {

    private OAuth2SuccessHandler oAuth2SuccessHandler;

    private AuthenticationFailureHandler authenticationFailureHandler;

    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    SecurityFilterChain httpSecurity(HttpSecurity http){
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Only allow internal forwards to this endpoint
                        .dispatcherTypeMatchers(DispatcherType.FORWARD).permitAll()
                        .requestMatchers("/api/v1/auth/login/oauth2/response").denyAll()
                        .requestMatchers("/api/v1/auth/**","/ws").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .oauth2Login(login->{
                    login
                            .authorizationEndpoint(config-> config.baseUri("/api/v1/auth/oauth2/authorization"))
                            .redirectionEndpoint( config-> config.baseUri("/api/v1/auth/login/oauth2/callback/*"))
                            .successHandler(oAuth2SuccessHandler)
                            .failureHandler(authenticationFailureHandler)
                    ;
                })
                .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(Arrays.asList("*")); // supports credentials
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
