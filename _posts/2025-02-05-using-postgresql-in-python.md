---
layout: post
title:  "postgresql을 wsl상의 python으로 접근하는 방법"
date:   2025-02-05 18:00:00 +0900
categories: "postgresql"
summary: "접근하는 OS가 Mac이 아니면 제대로 설정했는 데도 작동이 안될 수 있다."
tags: ["postgresql", "database", "install"]
image: ""
---

파이썬으로 데이터베이스를 접근하기... 그냥 인터넷에 검색해서 하라는 대로 하면 되지 않는가..? 그렇다. 
MySQL하고 SQLite는 그랬다. `sqlalchemy`를 사용하든 `django-orm`을 사용하든 아니면 그냥 쌩으로 `pymysql`을 사용하든. 대부분 데이터베이스 접속 이슈들(방화벽, 비번 잘못입력함 등...)만 아니리면 수월하게 연동할 수 있다.
하지만 `postgresql`은 아니었다. 얘도 다른 데이터베이스와 다름없이 정상적으로 연동이 될 거라고 생각을 했지만. 이는 큰 오산이었고, 이틀동안 삽질을 하는 참사가 벌어지고야 말았다.

## 왜 참사가 벌어졌는가?