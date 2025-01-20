---
layout: post
title:  "Factory Boy를 이용해 테스트 데이터를 깔끔하게 만들어 보자"
date:   2025-01-16 08:30:00 +0900
categories: "Testing"
summary: "Factory Boy를 사용하면 지저분했던 데이터 생성 로직이 깔끔해져요!"
tags: ["python", "testing", "factory_boy"]
image: ""
---

# Factory Boy

테스트코드를 작성하다 보면, 테스트를 시작하기 전에 데이터베이스에 테스트용 데이터를 집어넣는 과정을 거친다. 보통은 ORM으로 데이터들을 생성하기 때문에 가끔 이런 코드를 볼 수가 있다. _(Django 기준)_

```python
def setUp(self) -> None:
    self.user = User.objects.create(
        readable_id="G1234512345",
        customer_key="6d1fb2d032214636900ec93b94674d74",
        name="userName",
        email="email@gmail.com",
        gender=1,
        phone_number="01012341234",
        birth_date="19990101",
        user_sns_id="user_sns_id",
    )
```

`name`이나 `email`같은 테스트 목적이 있는 데이터들을 제외한 나머지 데이터들은 그냥 임의로 적어 놓았음을 알 수 있다. 즉, 테스트에 필요하지 않아 랜덤으로 돌려도 되는 값들을 일일이 리터럴하게 집어넣은 것이다. 이런 식으로 진행하게 되면, 쓸떼없는 코드가 많아져 전체적으로 코드가 더럽게 보일게 뻔하다. 이를 해결하기 위한 라이브러리가 바로 **factory_boy** 이다. 

**factory_boy**는 테스트시 필요한 값들을 랜덤하게 생성하는 역할을 한다. 그런데 그냥 아무 랜덤값을 주는 게 아니라, **테마에 따라 다른 형태의 값을 주는데**, 예를 들어 임의의 이름이 필요하다 하면 Mario나 Luigi 같은 랜덤으로 돌린  이름을 주고, 주소를 요청하면 주소와 관련되게 임의값을 준다.


# 설치

factory_boy 라는 라이브러리를 설치하는 것이기 때문에 방법은 간단하다.

```shell
$ pip install factory_boy
```

# 사용법

## 일반 사용법 -> Faker 객체 활용하기

일반적인 사용법이라 함은 그냥 단순히 랜덤값 하나를 불러오는 것을 의미한다. 이 사용법은 매우 간단하다. 몇줄만 추가하면 되기 때문이다.

`faker`를 import 하고 `Faker` 객체를 하나 만든다. 그 다음에 그 객체에서 내가 원하는 랜덤값 이름의 함수를 사용하면 된다. 예를 들어 내가 이름과 관련된 랜덤값을 원한다면, `.name()` 또는  `.user_name()`을 사용하면 된다.

> 단, `name()`과 `user_name()`의 차이점이라면, `name()`은 실제 사람의 이름으로 성과 이름이 분리되서 나오고 `user_name()`은 게임에서 나오는 게임유저 이름 정도만 생각하면 된다.

```python
from faker import Faker

fake = Faker()

fake.name() # Shawn Miller
fake.user_name() # Miller
```

이름 말고도 다른 테마로도 가능하다.

```python
fake.date_time() # datetime 타입의 랜덤 날짜
fake.sentence() # 영어 1문장: General apply international possible old fear.
```

그렇다면 아까 위에 제시했던 유저 생성 코드를 아래와 같이 변경할 수 있다.

```python
from faker import Faker

def setUp(self) -> None:
    fake = Faker()
    self.user = User.objects.create(
        readable_id=f"G{fake.random_digit(10)}",
        customer_key=fake.uuid4(),
        name=fake.user_name(),
        email=fake.email(),
        gender=fake.random_int(min=0, max=1),
        phone_number=fake.phone_number(),
        birth_date=str(fake.ramdon_digit(19900000, 20241231)),
        user_sns_id=str(fake.random_digit(20)),
    )
```
일단 **상수값들이 사라졌다.** 이제 임의 데이터 생성은 factory boy에서 알아서 해주기 때문이다. 하지만... 뭔가 코드가 더러운건 똑같아 보인다. 그리고 테스트 유저 생성을 이 한 테스트 파일 뿐만 아니라 여러 테스트 파일에도 사용이 될 텐데 이렇게 되면 또 똑같은 식의 코드를 작성해야 한다. 이때 factory boy는 **factory.Factory를 사용함을 제안한다.**


## factory.Factory

이전에 서술했던 `fake.Faker`가 단순히 랜덤값을 생성시키는 역할을 한 다면, `factory.Factory`는 랜덤값들을 생성함은 물론 **테스트용 데이터베이스에 까지 친절하게 데이터를 저장해 주는 역할을 한다.** 예를 들어 테스트용 `User`데이터를 데이터베이스 저장한다고 할때, `factory.Factory`를 상속한 `UserFactory`를 구현한 다음에 `UserFactory.create()`만 작성해 주면 알아서 데이터베이스를 저장해 주고, ORM 인스턴스를 내뱉는다. 사용법은 아래와 같다.

```python
# factory.py

import factory


class ProfileFactory(factory.django.DjangoModelFactory)
    class Meta:
        model = Profile
    ... 이하 생략 ...


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    readable_id = factory.LazyFunction(lambda: str(uuid4())[:10])
    customer_key = factory.LazyFunction(uuid4)
    user_sns_id = factory.LazyFunction(lambda: str(uuid4())[:10])
    name = factory.Faker("user_name")
    email = factory.Faker("email")
    gender = factory.LazyFunction(lambda: random.choice([0, 1]))
    phone_number = factory.Faker("phone_number")
    birth_date = "990101"
    is_staff = factory.LazyAttribute(lambda e: e.is_staff)
    profile = factory.SubFactory(ProfileFactory)
```


```python
# test.py

class UserTestCase(APITestCaese):
    def setUp(self) -> None:
        fake = Faker()
        self.profile = ProfileFactory.create()
        self.user = UserFactory.create.(
            is_staff=False,
            profile=self.profile,
        )
```




## 부록) factory_boy에서 사용할 수 있는 필드 리스트

|필드명|설명|필드명|설명|
|---|---|---|---|
|name|실제 이름|user_name|이름(닉네임)|
|email|이메일 주소|phone_number|전화번호|
|address|주소|date|날짜|
|date_time|날짜 및 시간(`datetime`)|time|시간|
|credit_card_number|신용카드 번호|credit_card_expire|신용카드 만료일|
|text|랜덤 텍스트|sentence|1문장|
|paragraph|1문단(여러문장)|url|URL|
|uuid4|UUID|color_name|색상이름|
|random_int(`min: int, max: int`)|랜덤 정수|random_number(`k`)|K자리 랜덤 숫자|
|random_element(`elements: list`)|`elements` 중에 하나 랜덤|||