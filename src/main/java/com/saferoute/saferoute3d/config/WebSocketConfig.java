package com.saferoute.saferoute3d.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Frontend'e veri göndereceğimiz kanalın öneki
        config.enableSimpleBroker("/topic");
        // Frontend'den bize gelecek mesajların öneki
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Three.js arayüzümüzün (Frontend) arka plana bağlanacağı kapı (endpoint)
        // setAllowedOriginPatterns("*") ile CORS (tarayıcı erişim) hatalarını engelliyoruz
        registry.addEndpoint("/ws-saferoute").setAllowedOriginPatterns("*").withSockJS();
    }
}