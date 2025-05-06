---
layout: post
title:  "N+1 문제 실전 사례: DRF ModelSerializer와 List API에서의 쿼리 최적화"
date:   2025-04-18 17:00:00 
categories: "Database"
summary: "생각없이 Serizlier를 쓰는 순간 나도 모르는 사이 N + 1 Problem이 터질 수 있다. 리스트 조회를 위한 ModelSerializer가 어떻게 N + 1 Problem을 일으키는지, DRF 내부 코드를 통해 알아보자."
tags: ["django", "database", "orm"]
image: ""
---

# 개요

한참 전에, [Django에서의 N + 1 Problem을 해결하는 방법](/django/2024/12/12/django-n1-problem.html)을 포스팅 한 적이 있었다. 요약하자면, **우리가 사용하는 ORM은 Lazy Loading 기법으로 인해 레코드와 관련된 참조테이블들을 꼭 필요한 때만 가져오기 때문에, 조회된 레코드 갯수 대로 참조 테이블에 쿼리를 날리는 이슈** 정도가 된다. 해결 방법은 `join`이나 아니면 참조 테이블을 한번더 `select`를 하면 되고, Django에서는 `select_related`와 `prefetch_related`라는 이름의 함수가 N + 1 Problem을 해결하는 열쇠가 된다. 

지금까지는 이 문제를 직접 겪어보진 못했다. 관련 질문을 받은 적은 있었지만, 당시에 명확하게 설명하지 못해 이후에 따로 정리해둔 적이 있을 뿐이다. 그러나 결국 발견했다. 최근 `flask-admin` 기반으로 개발된 사내 관리자 페이지를 `django`, `react`로 리빌딩하는 프로젝트를 진행하면서, 
차량 구독 신청 내역 조회 API를 개발하는 과정에서 N + 1 Problem 문제를 발견했다. ViewSet과 Serlizer를 이용해 API를 개발하고 있는 와중에 뭔가 의심이 들어 쿼리 로그를 봤더니
**조회된 레코드 갯수 대로 참조 테이블을 향해 쿼리를 또 날리는 것이다!** 어떤 이슈였는지 밑의 본론을 통해 알아보자.


# 본론

> 사내 기밀 정보가 유출될 수 있기 때문에 실제 사내 DB모델이 아닌 직접 구상한 DB모델로 재현했습니다.

## Situation

관리자 입장에서 모든 사람들의 일기 리스트를 조회하는 API를 개발해야 한다. 이때 각 일기 데이터 마다, 그 일기를 작성한 유저의 필수정보도 같이 조회해야 한다. 즉 `user`와 `short_diary`두 개를 한꺼번에 참조해서 리스트를 뽑아야 한다.


### 모델(DB Table)

DB 모델 구조는 아래와 같다. 유저 `User` 테이블이 있고. 각 유저는 자신만의 여러 개의 짧은 일기 `ShortDiary`를 가진다.

```python
class User(AbstractBaseUser):
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


class ShortDiary(models.Model, ModelTimeStampMixin):
    class Meta:
        db_table = "short_diary"

    user = models.ForeignKey(User, related_name="short_diaries", on_delete=models.CASCADE)
    title = models.CharField(null=False, max_length=256)
    context = models.CharField(null=False, max_length=1024)
    is_deleted = models.BooleanField(null=False, default=False)

```


### Serializer

DB 로부터 받은 유저와 일기 데이터를 API를 호출한 클라이언트에게 직렬화 해서 전달하기 위해 `Serializer`를 구현해야 한다. `serializers.ModelSerializer`를 사용하면 Model과 연동이 
가능하지만, `user_id` 같은 왜래키를 통해 참조 테이블까지 직렬화를 하려면 따로 field를 선언해야 한다. 그렇기 때문에 여기서는 `DiarySerializer`의 필드에 `UserSerializer`를 추가했다.


```python

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "nickname", "gender")



class DiarySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ShortDiary
        fields = "__all__"
```


### ViewSet

딱히 특히 요구사항은 없기 때문에 기본 `ViewSet`을 이용해 API를 구현한다. 조회 대상이 `ShortDiary`이기 때문에 `queryset`을 `ShortDiary.objects.all()` 로 잡는다.

```python
class DiaryViewSet(
    viewsets.ModelViewSet,
    mixins.ListModelMixin
):
    queryset = ShortDiary.objects.all()
    serializer_class = UserSerializer
```

### DB Query Logging

여기까지 세팅을 했다면, 이제 일기 리스트 조회 API는 완성이 되었고, 실제로 정상적으로 잘 돌아간다. 특정한 Warning 조차도 없이 정상적으로 돌아갈 것이다. 그러나 과연 정상적으로 돌아가는 것이 맞을까? Django를 사용하다 보면, ORM코드에 따라 DB Query가 어떻게 생성되는지 궁금할 때가 있을 것이다. 그래서 Django에서는 `settings.py`에 아래 코드를 추가하면, ORM으로 인한 데이터를 가져올 때마다 DB Query까지 로깅할 수 있다.

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'DEBUG'
        }
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        }
    }
}"
```

저렿게 하고 API를 호출하면 쿼리 로그는 아래와 같이 출력된다.


### N + 1 Problem


```
(0.001) SELECT `short_diary`.`id`, `short_diary`.`user_id`, `short_diary`.`title`, `short_diary`.`context`, `short_diary`.`is_deleted` FROM `short_diary`; args=(); alias=default

(0.001) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 23 LIMIT 21; args=(23,); alias=default
(0.001) SELECT `user`.`id`, `user`.`password`, `user`.`last_login`, `user`.`is_superuser`, `user`.`email`, `user`.`nickname`, `user`.`gender`, `user`.`is_active` FROM `user` WHERE `user`.`id` = 23 LIMIT 21; args=(23,); alias=default
```

일단 DB 안에는 1명의 유저가 있고, 이 유저는 2개의 일기를 가지고 있다. 그런데 맨 처음에 일기 **만** 조회 한 다음, 일기 리스트를 순회하면서 `user_id`를 추출해서 해당 `id`에 해당하는 유저를 조회하기 위해 추가로 Query문을 날리고 있다. 즉, 전체 리스트를 1번 조회하고, 추가로 그 개수(N개) 만큼 조회를 함으로써 **N + 1 Problem** 이 발생한 것이다. 지금이야 데이터가 딱 두개 밖에 없으니 우리 눈에는 문제가 없는 것 처럼 보이겠지만, 데이터 개수가 100개가 넘어간다고 생각해 보자. _왜 사용하는 사람이 별로 없는데 API 응답 시간이 오래 걸리지?_ 하는 생각이 들 것이다.


## DRF 내부 코드 분석

> 왜 ModelSerializer에서 Lazy Loading이 발생하지?

이전 [N + 1 Problem 포스트](/django/2024/12/12/django-n1-problem.html) 에서 설명했듯. **Lazy Loading 기법에 의해 꼭 필요할 때만 데이터를 추출한다.** 가 원인이다. 그러면 꼬리질문이 들어갈 것이다. **왜 Lazy Loading이 발생하는 거지?** 엔지니어라면 왜 이 문제가 언제 어디에서 발생했는지 정도는 정확히 파악할 필요가 있다.

### DiaryViewSet

일단 아래의 ViewSet을 다시 보자

```python
class DiaryViewSet(
    viewsets.ModelViewSet,
    mixins.ListModelMixin
):
    queryset = ShortDiary.objects.all()
    serializer_class = UserSerializer


    def list(self, request, *args, **kwargs):
        # mixins.ListModelMixin 의 list 함수를 그대로 가져온 것
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

`list()` 함수에서 마지막에 응답값을 리턴할 때 `Serializer`의 `data` 프로퍼티를 호출하는 것을 볼 수 있다. 


### @property def data

다음은 `Serializer`의 `data` 프로퍼티 코드의 일부이다.

```python
@property
def data(self):
    ... 이하 생략 ...
    if not hasattr(self, '_data'):
        if self.instance is not None and not getattr(self, '_errors', None):
            self._data = self.to_representation(self.instance)
    ... 이하 생략 ...
```

`Serializer`는 DB 인스턴스를 받아 `self.instance`에 저장하고 `to_representation`을 호출해 직렬화 과정을 수행한다.


### ListSerializer.to_representation

다음은 `ListSerializer.to_representation` 함수의 일부다. `to_representation`은 DB 인스턴스를 파라미터로 받고 `dict` 형태로 직렬화를 하는 함수로, 보통 Serializer에서 직렬화 해주는 데이터 말고도 다른 추가적인 데이터도 같이 직렬화 해야 할때 해당 함수를 오버라이딩을 하는 경우가 종종 있다.

> `ModelSerializer`가 아닌 `ListSerializer`를 보는 이유는, `list()`에서 `serializer`를 가져올 때 `self.get_serializer(page, many=True)` 처럼 파라미터에 `many=True`로 설정하면. `ListSerializer`로 매핑이 되기 때문이다. 결국 최상단에 사용되는 Serializer는 `DiarySerializer`가 아닌 `ListSerializer`이고 `ListSerializer`의 `child`는 `DiarySerializer`가 된다. 이 점을 꼭 기억해야 한다.

```python
class ListSerializer(BaseSerializer):
    def to_representation(self, data):
        """
        List of object instances -> List of dicts of primitive datatypes.
        """
        # Dealing with nested relationships, data can be a Manager,
        # so, first get a queryset from the Manager if needed
        iterable = data.all() if isinstance(data, models.manager.BaseManager) else data

        return [
            self.child.to_representation(item) for item in iterable
        ]
```


`return` 부에 `iterable`, 즉 일기 리스트 DB 쿼리에 대해 순회를 하면서 각 리스트 요소 마다 `self.child.to_representation`을 호출하는 것을 볼 수가 있다. `self.child`는 `DiarySerializer`이고 `item`은 `diary` 인스턴스가 될 것이다. 그리고 `DiarySerializer`는 `UserSerializer`를 필드로 가지고 있을 것이고, `DiarySeiralizer.to_representation`이 실행될 때마다 `diary.user`가 `UserSerializer`안에 들어가서 유저 정보를 직렬화 할 것이다. 대강 로직을 구상해 보면 아래와 같다고 보면 된다.

```python
arr = []

for diary in diaries:
    user_indstance: User = diary.user
    arr.append(Serializer(diary, diary.user).data)
```

일기 리스트를 순회할 때마다 `diary.user`를 사용한다. 그런데 이 `diary.user`에 대해서 의구심이 가기 시작한다. 아까 설명했듯. Django ORM은 `Lazy Loading` 기법으로 인해 꼭 필요할 대만 DB에 쿼리를 던진다고 했다. 그렇기 때문에 `Diary`에 대한 실제 DB 쿼리를 날리는 시점은 `to_representation`의 `return`부분이다. 순회를 하면서 실질적으로 `diary`를 꺼내오기 때문이다. **그렇다면 DB 쿼리를 날릴 때 `diary` 뿐만 아니라 `user` 테이블인 `diary.user`도 같이 딸려서 들어왔을까?** 아까 `ViewSet`에서 `queryset`을 어떻게 정의했더라... 다시 한번 살펴보자.

```
queryset = ShortDiary.objects.all()
```

그냥 `ShortDiary`만 조회한다. 이 코드 어디에도 `user`와 관련된 흔적은 없다. 설령 `ShortDiary` Model에 `user`과 관련된 `relationship`이 선언되었더라도 일단 이 코드에서는 
`user` 관련된 코드는 보이지 않는다. **눈씻고 찾아봐도 `user` 를 사용하려는 코드가 보이지 않기 때문에 Django는 굳이 불필요하게 user까지 데이터를 가져오는 비효율적인 행위를 하지 않는 것이다.** 왜? 개발자가 그렇게 코드를 짰으니까.


## 요약

결국 ORM을 사용, 혹은 `ModelSerializer`같은 ORM기능이 포함된 모듈을 사용할 때, **`user`를 사용한다는 표시를 하지 않았기 때문에** 처음에 `diary`를 조회할 때 `user`를 같이 조회하지 않았고. 
이는 결국 리스트를 순회하면서 `DiarySerializer`에서 각 DB 인스턴스에 대해 직렬화를 수행할 때, `user` 관련 정보를 로드하지 않았기 때문에, 반복문이 돌아가는 동안 `user` 조회를 반복해서 실행하는 N + 1 Problem이 터진 것이다. 이 문제를 해결하는 근본적인 방법은 **`user`를 사용한다는 표시를 해주면 된다.**


## Solution

해결방법은 간단하고 명료하다. 코드로 Django에게 "나 `user`도 같이 쓸거야" 라고 말해주면 된다. 그러니까, `ViewSet`에 **`queryset`에 `user`를 미리 로딩 `eager loading` 하게 하면 된다. 즉, `select_related`를 사용하면 된다.**
이렇게 되면 처음부터 `join`을 이용해 `user` 정보도 미리 쿼리에 포함되어 있기 때문에 더이상 N + 1 Problem이 발생하지 않게 된다.

```python
class DiaryViewSet(
    viewsets.ModelViewSet,
    mixins.ListModelMixin
):
    queryset = ShortDiary.objects.select_related("user").all()
    serializer_class = DiarySerializer
```


# 끝 (회고)

이 경험을 통해, 코드 한줄에도 성능 이슈가 숨어 있을 수 있다는 걸 깨닫게 되었다. 앞으로는 코드 한줄한줄 작성할 때마다 이게 어떤 영향을 끼치는지 한번은 확인하는게 좋을 것 같다. 특히 코드 몇 자로 API가 바로 구현이 되는 `Django`에서는 더 신경을 써야 할 것 같다. 편함에 속아 내부적인 상황을 파악하지 않으면 안되니까 말이다.
