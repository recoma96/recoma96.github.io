---
layout: post
title:  "팩토리 패턴과 DIP(의존 역전 원칙)와의 연관성"
date:   2024-12-16 10:00:00 +0900
categories: "Design Pattern"
summary: "팩토리 패턴과 DIP(의존 역전 원칙)에 대해 알아보고 그 둘의 차이점과 활용방법을 알아보자."
tags: ["factory-pattern", "dip", "design-pattern", "solid"]
image: ""
---


# 개요

DJango 상의 N + 1 Problem에 대해서 리서치를 하다가. 우연히 이런 형태의 함수를 발견하게 되었다.


```python
# django.db.models.fields.related_descriptors.create_reverse_many_to_one_manager

def create_reverse_many_to_one_manager(superclass, rel):
    """
    Create a manager for the reverse side of a many-to-one relation.

    This manager subclasses another manager, generally the default manager of
    the related model, and adds behaviors specific to many-to-one relations.
    """

    class RelatedManager(superclass, AltersData):
        def __init__(self, instance):
            super().__init__()

            self.instance = instance
            self.model = rel.related_model
            self.field = rel.field

            self.core_filters = {self.field.name: instance}

        def __call__(self, *, manager):
            manager = getattr(self.model, manager)
            manager_class = create_reverse_many_to_one_manager(manager.__class__, rel)
            return manager_class(self.instance)

        do_not_call_in_templates = True

    ... 이하 생략 ...

    return RelatedManager
```

동적 클래스 타입을 반환하는 클로저와 비슷한 형식의 함수인데, GPT에 물어본 결과 Class Factory 또는 Method Factory Pattern이라고 한다.


# Factory Pattern

## 개요

## Factory Pattern

## Factory Method Pattern

## Factory Class Pattern

## 요약


# DIP (의존 역전 원칙)

## SOLID란?

## 의존 역전 원칙의 예시


# 팩토리 패턴과 DIP

## 차이점

## 같이 활용하기
