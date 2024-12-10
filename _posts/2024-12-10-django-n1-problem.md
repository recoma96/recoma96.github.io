---
layout: post
title:  "DJango에서 N + 1 Problem 해결하는 방법"
date:   2024-12-10 16:00:00 +0900
categories: "Django"
summary: "ORM을 사용하다 보면 두 개 이상의 테이블을 조회하는데 있어 N + 1 문제를 한번씩 마주친다. DJango에서는 어떻게 해결하는지 알아보자."
tags: ["django", "database"]
image: ""
---


# 개요

백엔드 프레임워크 또는 다른 라이브러리에서 제공하는 ORM 라이브러리는 데이터베이스와의 상호작용을 편하게 해준다.
하지만 이걸 아무생각없이 남용을 하게되면 DB트래픽 낭비를 하게 되는 이슈가 발생하게 되는데 대표적인 예가 **N + 1 Problem** 이다. Spring Boot, NodeJS등 많은 백엔드 프레임워크에 사용되는 ORM 라이브러리들이 N + 1 Problem을 해결하기 위해 여러가지 도구들을 제공하는 데, DJango-ORM 역시 이와 같은 도구들을 제공한다.

## N + 1이 뭐에요?

**N + 1 Problem** 이란, 두 개의 연결된 테이블을 조회할 때, 하위 테이블을 참조해서 조회하기 위해 상위 테이블에서
조회된 N개의 테이블들을 하나씩 순회하면서 추가로 DB에 요청을 하는 것을 의미한다. 즉, 상위 테이블을 **1번** 조회하고, 조회된 데이터들을 순회하면서 **하위 테이블에 조회된 레코드 갯수 대로 요청함으로써** 총 DB에 **N + 1** 개의 요청을 하게 된다고 보면 된다. 이렇게 N이 기하급수적으로 커지게 되면 DB 부하가 커지게 됨은 물론, 서버 성능에도 영향을 미치게 된다.

## 원인

Django를 포함한 여러 ORM 라이브러리들은 **Lazy Loading**을 지원한다.
Lazy Loading이란, ORM 함수를 사용한다고 해서 바로 사용하지는 않고 실제 DB 데이터를 사용하려는 시점에서 SQL문이 실행되는 것을 의미한다. 대표적으로 `get()`과 `first()`가 있다. 평소에는 가만히 있다가 이 함수들이 실행되면 바로 DB로 SQL문 실행을 한다. 그렇기 때문에 유동적으로 쿼리에 쿼리를 추가할 수가 있어 코드를 재활용할 수 있다는 장점이 있다. 하지만, 이는 곧 하위 테이블 데이터의 정보가 필요할 때마다 SQL문을 날리는 N + 1 Problem에 직면하게 된다.


### Example

예를 들어 어떤 사용자가 작성한 짧은 게시물들을 조회한다고 할때, 아래와 같이 코드를 작성할 것이다.

```python
>>> user = User.objects.first()
(0.001) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` ORDER BY `user`.`id` ASC LIMIT 1; args=(); alias=default
>>> diaries = ShortDiary.objects.filter(user=user).all()
>>> print(diaries)
(0.001) SELECT `short_diary`.`id`, `short_diary`.`user_id`, `short_diary`.`title`, `short_diary`.`context`, `short_diary`.`is_deleted` FROM `short_diary` WHERE `short_diary`.`user_id` = 16 LIMIT 21; args=(16,); alias=default
<QuerySet [<ShortDiary: ShortDiary object (41)>, <ShortDiary: ShortDiary object (42)>, <ShortDiary: ShortDiary object (43)>, <ShortDiary: ShortDiary object (44)>, <ShortDiary: ShortDiary object (45)>]>
```

위에서 보다시피 `diaries = ShortDiary.objects.filter(user=user).all()`를 호출했지만, SQL을 실행한 흔적이 없다, 바로 밑의 `print()`를 호출해야 비로소 데이터베이스에 요청이 들어간 것이다. ShortDiary에 있는 데이터를 출력해야 하기 때문이다. 이렇게 꼭 필요한 상황이 되서야 DB에 갔다오기 때문에 **Lazy Loading(게으른 로딩)**이라고 부른다.

<br>

하지만 이러한 Lazy Loading 방식은 곧 아래와 같은 문제를 유발하게 된다.
```python
>>> diaries = ShortDiary.objects.all()
>>> for diary in diaries:
...     print(diary.user)
... 

(0.001) SELECT `short_diary`.`id`, `short_diary`.`user_id`, `short_diary`.`title`, `short_diary`.`context`, `short_diary`.`is_deleted` FROM `short_diary`; args=(); alias=default
(0.000) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 20 LIMIT 21; args=(20,); alias=default
mccarthydouglas@example.net - debbiecarr
(0.000) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 20 LIMIT 21; args=(20,); alias=default
mccarthydouglas@example.net - debbiecarr
(0.000) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 20 LIMIT 21; args=(20,); alias=default
mccarthydouglas@example.net - debbiecarr
(0.000) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 20 LIMIT 21; args=(20,); alias=default
```

ShortDiary(일기장)를 조회하고. 각각의 일기장을 누가 썼는지 출력은 하는 코드다. RAW Query라면 JOIN문 한번에 가져올 수 있지만 여기는 ORM이다. Lazy Loading 방식이기 때문에 일기장 주인(User)을 출력하기 전 까지 아무것도 안하다가. 출력하는 순간 (`print(diary.user)`)이 되서야 SQL문을 날린다. 이걸 일기 갯수(diaries)대로 반복을 하게 되고 결국 N + 1 Problem이 발생하게 된다. 결국 DB에 불필요한 요청을 보내는 꼴이 되고, 이는 서버와 DB 둘다 불필요한 트래픽으로 인해 성능저하가 될 상황에 처하게 되었다.

<br>

하지만 ORM은 이러한 이슈가 계속 발생이 되도록 방관하지 않는다. 빠져나갈 방법은 있다.


# 해결 방법 

사실 해결 방법은 간단하다. JOIN을 사용하면 된다. 이렇게 되면 쿼리문 1번으로 끝내는 것이 가능하다. 하지만 여기는 RAW Query가 아닌 ORM이기 때문에 다른 방법을 사용해야 한다. Django에서는 **select_related**와 **prefetch_related**를 지원한다. `select_related`는 JOIN문 1번으로 모든 데이터르들을 한꺼번에 불러오고, `prefetch_related`는 상위 테이블 한번, 그 상위 테이블에서 조회된 고유키를 가지고 하위 테이블 조회 두번 이렇게 총 2번 요청을 한다. 이렇게 Lazy Loading이 아닌, 미리미리 데이터를 불러와서 활용하는 방식을 **Eager Loading** 이라고 한다.


## 모델 구조

```python
class User(models.Model):
    class Meta:
        db_table = "user"

    GENDER_CODE = (
        ("M", "Male"),
        ("F", "Female"),
    )

    email = models.EmailField(null=False, max_length=256, verbose_name="이메일")
    nickname = models.CharField(null=False, unique=True, max_length=16, verbose_name="닉네임")
    gender = models.CharField(null=True, choices=GENDER_CODE, max_length=1, verbose_name="성별")
    is_active = models.BooleanField(null=False, default=True, verbose_name="활성화 여부")


class ShortDiary(models.Model):
    class Meta:
        db_table = "short_diary"

    user = models.ForeignKey(User, related_name="short_diaries", on_delete=models.CASCADE)
    title = models.CharField(null=False, max_length=256)
    context = models.CharField(null=False, max_length=1024)
    is_deleted = models.BooleanField(null=False, default=False)
```


## select_related

```python
>>> diaries = ShortDiary.objects.select_related("user")
>>> for diary in diaries:
...     print(diary.user)
... 

(0.001) SELECT `short_diary`.`id`, `short_diary`.`user_id`, `short_diary`.`title`, `short_diary`.`context`, `short_diary`.`is_deleted`, `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `short_diary` INNER JOIN `user` ON (`short_diary`.`user_id` = `user`.`id`); args=(); alias=default
```

`select_related`는 `JOIN`을 이용해서 문제를 해결한다. 위의 예시에서는 일기를 작성한 사용자(User)의 정보를 가져오는 코드이다. 사용된 쿼리문은 `JOIN`문 딱 하나다.

### 작동이 안되는 경우

 반대로 사용자가 어떤 일기를 썼는지 조회하는 경우도 있을 수 있다. 즉 1대다 상황이 되는데, 이때 `select_related`를 사용하게 되면 아래와 같은 에러가 발생하게 된다.

```python
>>> users = User.objects.select_related('short_diaries')
>>> for user in users:
...     print(user.__dict__)

django.core.exceptions.FieldError: Invalid field name(s) given in select_related: 'short_diaries'. Choices are: (none)
```

short_diaries라는 이름의 field name이 없다는 문구가 뜬다. 이 경우, prefetch_related를 사용해야 한다.


## prefetch_related

상위 테이블 조회 1번, 하위 테이블 조회 1번, 총 2번 요청을 한다.
1대다, 다대다나 역참조에서 주로 사용된다.

```python
>>> users = User.objects.prefetch_related("short_diaries")
>>> for user in users:
...     print(user.short_diaries)
... 
(0.001) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user`; args=(); alias=default
(0.000) SELECT `short_diary`.`id`, `short_diary`.`user_id`, `short_diary`.`title`, `short_diary`.`context`, `short_diary`.`is_deleted` FROM `short_diary` WHERE `short_diary`.`user_id` IN (24, 25); args=(24, 25); alias=default
```
`select_related`에서는 되지 않았던 역참조가 `prefetch_related` 에서는 정상작동이 되었다.


## 사용시 주의해야 할 점

### 하위 테이블 정렬

조회를 할 경우