package com.ican.backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.List;

@Configuration
public class SecurityConfig {
  @Value("${ican.jwt-secret:}") private String configuredSecret;
  @Value("${ican.cors-origins:http://localhost:8080}") private String corsOrigins;

  public SecretKey jwtKey() {
    if (configuredSecret == null || configuredSecret.length() < 32)
      throw new IllegalStateException("JWT_SECRET must be set to a random secret of at least 32 characters.");
    return Keys.hmacShaKeyFor(configuredSecret.getBytes(StandardCharsets.UTF_8));
  }

  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

  @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    var jwtFilter = new OncePerRequestFilter() {
      @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
          try {
            Claims c = Jwts.parser().verifyWith(jwtKey()).build().parseSignedClaims(auth.substring(7)).getPayload();
            Map<String,Object> principal = Map.of("userId", c.getSubject(), "workspaceId", String.valueOf(c.get("workspaceId")), "role", String.valueOf(c.get("role")));
            var token = new UsernamePasswordAuthenticationToken(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + String.valueOf(c.get("role")).toUpperCase())));
            SecurityContextHolder.getContext().setAuthentication(token);
          } catch (Exception ignored) { SecurityContextHolder.clearContext(); }
        }
        chain.doFilter(request, response);
      }
    };
    http.csrf(csrf -> csrf.disable())
      .cors(cors -> cors.configurationSource(req -> { var c = new org.springframework.web.cors.CorsConfiguration(); c.setAllowedOrigins(java.util.Arrays.stream(corsOrigins.split(",")).map(String::trim).toList()); c.setAllowedMethods(List.of("GET","POST","PATCH","PUT","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("Authorization","Content-Type","Idempotency-Key")); c.setAllowCredentials(false); return c; }))
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.OPTIONS,"/**").permitAll()
        .requestMatchers("/api/health", "/api/health/db", "/api/auth/register", "/api/auth/login").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/**").hasAnyRole("OWNER", "ADMIN", "MANAGER")
        .requestMatchers(HttpMethod.PATCH, "/api/**").hasAnyRole("OWNER", "ADMIN", "MANAGER")
        .requestMatchers(HttpMethod.PUT, "/api/**").hasAnyRole("OWNER", "ADMIN", "MANAGER")
        .requestMatchers(HttpMethod.DELETE, "/api/**").hasAnyRole("OWNER", "ADMIN", "MANAGER")
        .anyRequest().authenticated())
      .httpBasic(b -> b.disable()).formLogin(f -> f.disable()).addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
}
