---
layout: post
title:  "EC2와 NginX로 프록시 서버 구축하기"
date:   2025-01-14 07:00:00 +0900
categories: "NginX"
summary: "EC2, NginX 기반의 프록시 서버를 구축하면서 삽질했던 것들과 공부했던 내용을 정리했단다!"
tags: ["nginx", "proxy", "server"]
image: ""
---

# 개요

외부 업체의 요청으로 프록시 서버를 구축하게 되었다. EC2에 Nginx를 올리고 API Gateway로 설정된 API로 이동시키는 그런 서버를 구축하게 되었는데, 아무래도 내가 NginX나 HTTP 헤더 같은 세부 구조들에 대해서 잘 모르는게 많아 어려번 삽질을 해왔다. 그래도 HTTP의 자세한 구조와 AWS 서비스 일부를 공부 또는 다뤄볼 수 있는 기회가 되었기에, 여기에 기록하고자 한다.


# Host 헤더

## Host란?

## NginX에서 Host 세팅 방법

### proxy_set_header

### 작용 방법

# 도메인 적용하기 <서브도메인 기준>

## Route53에서 도메인 적용

## ACM(AWS Certificate Manager)을 이용한 SSL 인증 (실패)

## Certbot 을 이용한 SSL

### Certbot 설치

### Certbot 인증서 진행

### 자동 인증서 갱신 등록

# EC2 의 Nginx Log와 Cloudwatch 연동하기
