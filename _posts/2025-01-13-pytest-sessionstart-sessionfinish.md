
---
layout: post
title:  "Pytest에서 테스트 처음과 끝부분에 프로세스를 작성하는 법"
date:   2025-01-13 08:30:00 +0900
categories: "Testing"
summary: "Pytest에서 fixture보다 더 넓은 범위, 그러니가 테스트의 맨 처음과 맨 끝부분에서 프로세스를 추가해야 할 때가 있다."
tags: ["python", "testing", "pytest"]
image: ""
---

# 개요

이전에 [DJango에서 테스트 코드 작성 시 마이그레이션을 하지 말아야 할 데이터베이스 사용법](https://recoma96.github.io/django/2024/11/22/django-unittest-set-migration-with-other-db.html) 에서 `DiscoverRunner`를 사용하면 맨 처음과 맨 마지막의 로직을 작성함으로써 테스트 시작 전 여러 세팅들을 할 수 있다고 언급했다. 그렇다면, pytest에도 이러한 툴이 있을 까?

# fixture

이번에 설명할 툴에 대해서 언급하기 전에 fixture부터 설명해야 할 필요가 있다. pytest에서의 fixture는 테스트 함수 간에 공유할 수 있는 상태나 데이터를 제공하는 기능이다. 예를 들어 테스트를 하면서 유저 정보가 담긴 Dict 형태의 데이터가 사전에 필요하다면 아래와 같이 구현하면 된다.


```python

@fixture
def user():
    user_data = {"name": "recoma", "birthday": "19990101"}
    insert_to_database(user_data)
    
    yield user_data

    remove_from_database(user_data)

def test_about_user(user: dict):
    # Do something
```

해당 테스트 코드의 순서는 아래와 같다.
1. `test_about_user()`가 작동하기 전에 `user()`가 작동한다.
2. `user()`에서 user_data를 리턴한다. 이 리턴된 데이터는 `test_about_user`의 `user`라는 파라미터에 들어간다.
3. `test_about_user()`는 `user`를 이용해서 특정 테스트를 진행한다.
4. `test_about_user()`의 프로세스가 끝나면 `user()`의 `yield`의 아랫부분이 작동한다.

<br>

이렇게 fixture는 테스팅을 하기 위해 필요한 데이터들을 미리 세팅하고 테스트 함수들에게 그 데이터를 제공하는데 유용하게 쓰인다. 이런 특성을 이용해 테스트를 세팅할 때도 사용되곤 한다.


## 한계

그러나 이 fixture 사용에도 한계가 있다. 

### scope 범위

fixture에는 scope라고 해서 작동 범위를 설정하는 파라미터가 있다. 선언 방법은 아래와 같다.

```python
@fixture(scope="function")
```

이는 매 테스트 함수(케이스)가 작동될 때마다 해당 함수가 작동됨을 의미한다. scope를 `module`로 설정 할 경우 테스트 파일 내 에서만 작동이 되고 `session`으로 설정하면 모든 테스트 파일에서 딱 한번만 작동한다. 일단 `module`과, `function`은 전체 테스트 에서 딱 한번 실행되는게 아니기 때문에 사용하는데 한계가 있다. `session`이 그나마 쓸만해 보이지만 이건 이거대로 문제가 있는데. `session`으로 설정된 fixture를 사용하기 위해, **매 함수 또는 일부 함수의 파라미터에다가 해당 fixture를 명시해야 한다.** 단순해 보이지만 이는 일일이 코드가 하나씩 추가됨으로써 클린 코드 상 좋지 못한 결과를 보여줄 수 있다.


# pytest_session*

그렇기 때문에 pytest에서는 아예 테스트 실행과 끝나는 시점에 로직을 작성할 수 있도록 인터페이스를 제공해 주는 데 이게 바로 `pytest_sessionstart`와 `pytest_sessionfinish`이다. 이 둘을 사용하면 `fixture`와 각 테스트 함수에 일일이 설정하지 않아도 알아서 잘 돌아간다. 이 두 함수들은 말 그대로 맨 처음에서 부터 시작하기 때문에 특정 테스트 파일에 들어가기 보다는 `conftest.py`에 작성이 되는 경우가 더 많다.

```python
# conftest.py

def pytest_sessionstart(session: _pytest.main.Session):
    print("Start")

def pytest_sessionfinish(session: _pytest.main.Session):
    print("Finish!")


# test_example.py

def test_example():
    print("Testing")

```
