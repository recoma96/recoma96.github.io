---
layout: post
title:  "N + 1 Problem 해결 사례 1 - Django의 queryset과 Serizlier"
date:   2025-04-18 17:00:00 
categories: "Database"
summary: "서로 참조하는 두 테이블 상대로 Serizlier를 쓰는 순간 쥐도 새도 모르게 N + 1 Problem을 일으킬 수 있다."
tags: ["django", "database", "orm"]
image: ""
---

# 개요

한참 전에, [Django에서의 N + 1 Problem을 해결하는 방법](/django/2024/12/12/django-n1-problem.html)을 포스팅 한 적이 있었다. 요약하자면, **우리가 사용하는 ORM은 Lazy Loading 기법으로 인해 레코드와 관련된 참조테이블들을 꼭 필요한 때만 가져옴으로써, 조회된 레코드 갯수 대로 참조 테이블에 쿼리를 날리는 이슈** 정도가 된다. 해결 방법은 Join이나 아니면 참조 테이블을 한번더 Select를 하면 되고, Django에서는 `select_related`와 `prefetch_related`라는 이름의 함수가 N + 1 Problem을 해결하는 열쇠가 된다.

## 솔직히 고백하자면

지금까지 N + 1 Problem을 직접 겪어본 적이 없다.


# Problem


# Solution




# 끝 (feat.회고)

사내에서 이러한 이슈들을 해결하면서 여러가지 부분에 대해 반성 혹은 회고를 하는 계기가 되었다

## 한번 짠 코드 다시한번 보자

이러한 이슈는 이번 뿐만 아니라 이전에 신사업 프로젝트로 진행했던 코드에서도 상당부분이 주를 이룬다.

### 1줄 1생각

당연하고도 당연한 것임에도 불구하고 나는 그동안 이를 실천하지 않았다.

### 내가 짠 코드가 다른 인프라에 어떤 영향을 미치는 지 반드시 고려하자

위의 "1줄 1생각" 에 대한 연장선이다.

## DB 최적화도 한번 해볼까?

이것도 한번 해보면 좋을듯