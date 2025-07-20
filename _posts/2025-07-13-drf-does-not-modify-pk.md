---
layout: post
title:  "DRF Viewset은 Primary Key를 수정하지 않는다"
date:   2025-07-20 12:00:00 +0900 
categories: "Django"
summary: "장고도 이해하고 있는 Primary Key의 소중함"
tags: ["django", "database"]
image: ""
---

# 개요

## Primary Key는 변경되어선 안된다

보통 기본키(Primary Key)는 레코드를 대표하는 식별자이기 때문에, 어지간하면 변경이 되어서는 안되고, 변경되는 것을 막기위해 기본키에는 테이블과는 전혀 무관한 값이 들어가는게 통상적이다.

## Django도 이걸 염려하고 있다.

Django에서도 이 부분에 대해서 당연히 의식을 하고 있고, 개발자가 Primary Key를 바꾸지 못하게 하기 위해 갖은 방법을 쓰고 있는데 어떤게 있는지 한번 알아보자.


# Django가 PK를 바꿀수 없게 막는 방법

## Serializer에서 수정 대상 강제 제외

한번씩 DRF를 써 보면 눈치 챘을 텐데, `Serializer.Meta` 클래스에서 `fields = "__all__"`로 설정해도 Swagger에서는 PK가 나타나지 않는다.

```python
# Serializer
class DiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortDiary
        fields = "__all__"


# ViewSet
class DiaryViewSet(
    viewsets.ModelViewSet
):
    queryset = ShortDiary.objects.select_related("user").all()
    serializer_class = DiarySerializer

    def get_serializer_class(self):
        return {
            "retrieve": DiaryDetailSerializer,
        }.get(self.action, self.serializer_class)

```

이렇게 코드를 작성하고 Swagger에 접속해 보면

![swagger-image](/assets/img/20250720/1.png)

**id 가 없다.** `fields = "__all__"` 로 잡아놔도. PK를 바꿀 생각은 하지 말라는 것이다. 그래도 이걸 무시하고 Postman 또는 Curl로 강제로 ID를 바꾸려 해도. 아래의 결과 처럼 변경되지 않는다.

![change-id-result](/assets/img/20250720/2.png)

변경되지 않는 이유는 `update` 함수가 작동할 때, `validated_data`는 PK를 포함하지 않기 때문에 변경이 되지 않는 것이다.


## PK만 다른 동일 레코드 강제 생성

하지만 이런 Django의지를 한번 더 꺾을 수 있는 기회가 한번 있는데, 그건 바로 **`Serializer`에 억지로 PK를 추가하는 방법** 이다. 이렇게 되면 `validated_data`에 PK가 포함이 된다.

```python
class DiarySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=True)    # PK 추가

    class Meta:
        model = ShortDiary
        fields = "__all__"
```

그리고 API를 요청해 보면 `Response` 부분에 `id` 가 변경된 것을 확인할 수 있다

![change-id-result-2](/assets/img/20250720/3.png)

그런데 정말 바뀐게 맞을까? DB 테이블을 한번 보자


### API 요청 전

![change-before](/assets/img/20250720/4.png)


### API 요청 후

![change-after](/assets/img/20250720/5.png)

**바뀐게 아니라 아예 데이터가 새로 추가됐다.** PK를 변경하려던 데이터는 변경 없이 그래도 유지되었고, 변경된 `id`를 가지고 전혀 다른 데이터가 복사되었다. 정확한 확인을 위해 로깅된 쿼리를 보자


### 쿼리 내역

```
(0.000)
    UPDATE `short_diary` SET `user_id` = 23, `title` = 'string2', `context` = 'string', `is_deleted` = 0
    WHERE `short_diary`.`id` = 300;
(0.004)
    INSERT INTO `short_diary` (`id`, `user_id`, `title`, `context`, `is_deleted`)
    VALUES (300, 23, 'string2', 'string', 0);
```

첫번째 쿼리를 보면 `id = 300` 인 데이터를 대상으로 정보를 수정하려고 하고 있다. 그러나 당시 요청했던 API의 URL은 `PUT /diaries/111` 이었기 때문에 
`id`가 `111` 인 데이터를 검색해야 하는데, 변경 대상 값인 `300`으로 검색한 것이다. 그리고 `id`가 `300`는 따로 없기 때문에 `create` 함수가 작동되어 새로 생성한 것이다.

### 원인이 무엇인가

**Django ORM 내부에서는 Instance의 PK 를 바꾸는 것을 허용하지 않기 때문이다.** 즉 `instance.pk = <다른값>` 이런식으로 어거지로 넣을 경우, `<다른값>`에 해당하는 데이터가 없을 때, Django ORM에서는 완전히 새로운 데이터라고 인식을 하기 때문에, 새로 생성하게 된다. [공식문서](https://docs.djangoproject.com/en/5.1/topics/db/models) 에서도 이와 관련된 내용이 적혀 있다.

> The primary key field is read-only. If you change the value of the primary key on an existing object and then save it, a new object will be created alongside the old one. For example:
> ```python
> from django.db import models
> 
> class Fruit(models.Model):
>     name = models.CharField(max_length=100, primary_key=True)
> ```
> ```shell
> >>> fruit = Fruit.objects.create(name="Apple")
> >>> fruit.name = "Pear"
> >>> fruit.save()
> >>> Fruit.objects.values_list("name", flat=True)
> QuerySet ['Apple', 'Pear']>
> ```


# 결론

Primary Key는 테이블에서 고유식별자를 나타내기 때문에, 보통 변경됨을 권장하지 않는다. 그래서 관련없는 데이터가 들어가야 한다는 얘기도 있다.
Django 역시 이러한 내용을 인지하고 있기 때문에 Primary Key를 변경하지 못하게 막고 있다. 따라서, Django 기반 서비스를 만들 경우, DB 설계시 Primary Key 설계를 신중하게 해야 한다.