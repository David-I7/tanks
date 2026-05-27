package com.tanks.server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/test")
public class TestController {

    @GetMapping
    public void test(HttpServletRequest request){
        System.out.println(ServletUriComponentsBuilder.fromCurrentContextPath().toString());
    }
}
