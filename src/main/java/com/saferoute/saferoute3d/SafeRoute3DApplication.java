package com.saferoute.saferoute3d;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SafeRoute3DApplication {

    public static void main(String[] args) {
        SpringApplication.run(SafeRoute3DApplication.class, args);
    }
}