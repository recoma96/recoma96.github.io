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

외부 업체의 요청으로 프록시 서버를 구축하게 되었다. EC2에 Nginx를 올리고 API Gateway로 설정된 API로 이동시키는 그런 서버를 구축하게 되었는데, 
아무래도 내가 NginX나 HTTP 헤더 같은 세부 구조들에 대해서 잘 모르는게 많아 어려번 삽질을 해왔다.
그래도 HTTP의 자세한 구조와 AWS 서비스 일부를 공부 또는 다뤄볼 수 있는 기회가 되었기에, 여기에 기록하고자 한다.

## 당시 Open API 구조도



# 프록시 서버 구축 과정

내가 프록시 서버를 구축한 과정은 아래와 같다.

EC2 대여 > NginX 설치 및 세팅 > Route53에 도메인 적용 > SSL 인증 > Cloudwatch 연동하기


## EC2 대여

당연하듯이 프록시 서버를 구축하려면 서버 인스턴스가 필요하다.

## NginX 설치 및 세팅

NginX를 설치해서 HTTP 서버를 올린다. 그리고 아래와 같이 작성했다.

```json
server {
    proxy_pass https://example.com;
    proxy_set_header Host exmaple.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`proxy_pass`를 통해 헤더를 재설정한다. 다른 요소들은 default값인데 유독 Host만 `example.com`으로 지정되어 있다.
왜냐하면 $host로 설정할 경우 AWS로부터 연동이 되지 않기 때문이다.

### Host 헤더?

## Route53에 (서브)도메인 적용하기 

> 메인 도메인은 이미 구매를 완료했고 Route53에 적용이 되었다는 전제하게 설명한다.

Route53에서 도메인을 적용한다. 

## HTTPS 사용을 위한 SSL 인증

### ACM(AWS Certificate Manager)를 이용한 SSL 인증 (실패)

### Certbot을 이용한 SSL 인증

### 자동 인증 갱신 설정

## NginX Log를 Cloudwatch와 연동하기

### IAM Role 설정하기

### Cloudwatch Agent Wizard를 이용한 연동하기

### 작동 여부 확인