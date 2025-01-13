---
layout: post
title:  "DJango에서 마이그레이션을 하지 말아야 할 데이터베이스를 테스트 하는 방법"
date:   2024-11-23 01:04:25 +0900
categories: "Django"
summary: "백오피스 같은 툴들을 개발하다 보면, 절때 수정해서는 안될 서비스 데이터베이스에 대해 테스트를 해야 할 때가 있다. 이를 해결하는 방법을 알아보자"
tags: ["python", "django", "database", "unittest", "testing"]
image: ""
---

# 개요

DJango기반의 서비스를 구현할 때, 보통 해당 서비스에 포함되는 데이터베이스 테이블들은 DJango-ORM으로 관리되는 것이 권장되지만. 공용으로 사용되는 데이터베이스 테이블들의 경우 DJango에서 직접 관리되어선 안된다.(ex: 마이그레이션 같은 테이블의 정보를 바꾸는 작업). 이때 migration 작업시, 직접 관리되어선 안되는 테이블들을 마이그레이션 못하게 하기 위해 해당 테이블의 메타 클래스(`class Model.Meta`)에 `managed=False`로 설정을 하게 된다.

<br>

예를 들어 사내 서비스에 대한 어드민 페이지를 개발할 때, 어드민 페이지 내에서 관리하는 어드민 전용 데이터베이스는 어드민 페이지 서버에서 직접 관리해도 문제가 없지만, 서비스 DB를 상대로 어드민 페이지가 절대로 마이그레이션 같은 DDL에 영향을 주는 행위를 절대절대 해서는 안된다. 그렇기 때문에 어드민 페이지 내 서버 코드에서는 서비스 DB와 관련된 모든 Model들을 전부 `managed=False` 처리를 해야 한다.

<br>

그러나 이는 또 다른 문제를 발생 시키게 되는데, managed=False로 설정된 모델에서는 유닛테스트가 불가능 하다는 점이다. 유닛테스트 작동 시, DJango는 테스트를 수행하기 전에 테스트용 데이터베이스를 생성하고 그 위에 테이블들을 마이그레이션 한다. 그러나 managed=False로 되어 있는 모델들은 마이그레이션이 불가능하므로, 이 시점에서 에러가 발생하고 더이상 테스트를 진행할 수 없게 된다.

이번 포스트에서는 `managed=False`로 되어 있는 모델들을 가지고 어떻게 유닛테스트를 할 수 있는지 설명을 하며, 크게 두 가지 방법이 있다.


# 솔루션

## 공통사항

### Auth User Model 관련

두개 이상의 테이블을 사용할 때, 각 테이블의 모델 구조가 다를 때, 정확히는 로그인을 하기 위한 유저 모델이 한군데만 있고 다른 곳에는 없을 때, 유닛테스트 과정에서 문제가 생긴다.

<br>

유닛테스트를 진행하기 전에 DJango는 테스트 전용 데이터베이스들을 생성하고 그 데이터베이스 위에 개발자가 작성한 모델들을 토대로 마이그레이션을 진행하게 된다. 이때 생성되는 모델들 중에, 유저가 정의한 모델들 말고 장고 내장의 모델들도 같이 마이그레이션을 하게 되는데, 이 중 `django_admin_log` 라는 테이블이 생성을 하면서 유저가 정의한 로그인 용도의 유저 모델(`AUTH_USER_MODEL`) 과 릴레이션 진행을 한다. 그러나 유저 모델이 없는 데이터베이스에서는 `django_admin_log` 와 릴레이션을 진행할 수 없기 때문에 유닛 테스트를 실행하기 전 에러가 발생하게 된다.

```python
django.db.utils.IntegrityError: (1215, 'Cannot add foreign key constraint')
```


해결 방법은 간단하다. INSTALLED_APPS에 `'django.contrib.admin'` 을 주석처리하면 된다.

<br>

보통 직접 정의한 모델을  하기 위해 `INSTALLED_APPS`에 해당 모델과 관련된 앱 이름을 작성을 하게 된다. `python manage.py migrate` 을 수행할 때, 내가 직접 정의한 모델 말고도 장고 내장 테이블도 같이 마이그레이션 되는데, **이는 직접 하드코딩 된 것이 아니라 장고 내장 테이블을 포함하고 있는 모듈이 `INSTALLED_APPS`에 선언되어 있기 때문에 저절로 같이 마이그레이션 된 것이다.**

<br>

`django_admin_log`도 마찬가지로 `django.contrib.admin` 안에 포함되어 있기 때문에 마이그레이션 된 것이다. 따라서 반대로 `django.contrib.admin`을 주석처리 및 제외를 하게 되면 `django_admin_log`를 더이상 마이그레이션을 하지 않게 될 것이고, 이에 따른 왜래키 문제도 더이상 발생하지 않게 된다.

```python
INSTALLED_APPS = [
    # 'django.contrib.admin'
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]
```

## (무식한 방법) django.settings를 활용해 테스트 할 때만 manged=True로 변경하기

### 적용 방법

1. settings.py에 TEST를 진행중인지에 대한 여부를 나타내는 환경변수를 추가한다.
    ```python
    UNDER_TEST = (len(sys.argv) > 1 and sys.argv[1] == 'test')
    ```

2. managed = False상태인 모든 모델의 메타 클래스의 managed를 **전부 다** 아래와 같이 변경한다.
    ```python
    class Meta:
        db_table = "example_table"
        managed = getattr(settings, "UNDER_TEST", False)
    ```
3. 대상 DB모델을 호출하는 테스트 스크립트를 작성해서 정상적으로 테스트가 돌아가는 지 확인한다.

### 문제점

각 `Model.Meta`마다 `getattr`함수를 작성해야 하기 때문에 코드 가시성이 떨어지고 유지보수에 문제가 생긴다. 따라서 해당 방안은 비권장하는 부분이다.


## Test Runner 활용하기

위의 방법과 마찬가지로 `manged = True`로 바꿔야 한다는 방향은 일치하지만, 위의 방법에 비해 기술 부채가 일어나지 않게 진행하는 해결방안이다.

<br>

`DiscoverRunner`를 상속받아서 테스트가 맨 처음에 시작했을 때 managed를 True로 바꾸고, 끝나면 다시 원래대로 돌려놓게 함수를 오버라이딩 함으로써, Model 클래스에 위와 같이 똑같은 코드 작성 필요 없이 깔끔하게 해결할 수 있다.

### TestRunner

> A test runner is a class defining a run_tests() method. Django ships with a DiscoverRunner class that defines the default Django testing behavior. This class defines the run_tests() entry point, plus a selection of other methods that are used by run_tests() to set up, execute and tear down the test suite.

TestRunner는 유닛테스트의 작동 방식을 정의를 한다. 각 TestCase 마다 작동 방식을 정의하는 함수들(setUpClass, setUp 등…)과는 다르게 **전체적인 작동 방식을 정의한다.** 예를 들어, 모든 테스트 케이스에서 공통적으로 사용할 수 있는 환경변수를 정의할 수도 있고, 데이터베이스 모델 정보도 변경할 수 있으며, 마이그레이션 없이 테스트를 진행하게 수정할 수 있다. 즉, **TestCase에서는 할 수 없는 정밀한 작업 프로세스를 여기서 구현할 수 있다.**

보통 `django.test.runner.DiscoverRunner`를 상속받아서 사용한다.

### 오버라이딩 할 수 있는 함수들

`setup_test_environment()`

- 막 테스트가 시작될 때 작동하는 함수, 모델들을 `managed=True`로 변경하는 로직을 여기서 구현한다.

`teardown_test_environment()`

- 모든 테스트 케이스가 끝나면 작동되는 함수, managed정보가 변경된 모델들을 원상복귀할 때 사용된다.

`setup_databases()`

- 테스트용 데이터베이스를 생성하고, 마이그레이션을 하는 등, 테스트에 사용되는 데이터베이스들을 세팅하는 데 사용된다.
- 테스트용 데이터베이스를 생성하는 것을 원하지 않는다면 함수내용을 비우는 방향으로 오버라이딩 하면 된다.

`teardown_databases()`

- 테스트용 데이터베이스를 거두는 등, DB 환경을 원상복귀 시키는데 사용된다.


### `run_tests()`

모든 테스트케이스가 돌아갈 수 있는 이유는 `run_tests`함수가 실행되기 때문이다. run_tests의 로직은 아래와 같다.

1. 테스트가 시작되기 전 전처리 수행 `setup_test_environment()`
2. 테스트 케이스 수집 `build_suite()`
3. 테스트용 데이터베이스 수집 및 세팅 `get_databases()`, `setup_databases()`
4. **테스트 수행** `run_suite()`
    - test실패 (assert)시 exception 호출
5. 테스트 종료 후 프로세스 수행 `teardown_databases()` `teardown_test_environment()`
    - 테스트실패 여부 상관업싱 해당 로직은 수행된다.

* `run_tests()` 코드 전문

```python
def run_tests(self, test_labels, extra_tests=None, **kwargs):
    """
    Run the unit tests for all the test labels in the provided list.

    Test labels should be dotted Python paths to test modules, test
    classes, or test methods.

    Return the number of tests that failed.
    """
    if extra_tests is not None:
        warnings.warn(
            "The extra_tests argument is deprecated.",
            RemovedInDjango50Warning,
            stacklevel=2,
        )
    self.setup_test_environment()
    suite = self.build_suite(test_labels, extra_tests)
    databases = self.get_databases(suite)
    suite.serialized_aliases = set(
        alias for alias, serialize in databases.items() if serialize
    )
    with self.time_keeper.timed("Total database setup"):
        old_config = self.setup_databases(
            aliases=databases,
            serialized_aliases=suite.serialized_aliases,
        )
    run_failed = False
    try:
        self.run_checks(databases)
        result = self.run_suite(suite)
    except Exception:
        run_failed = True
        raise
    finally:
        try:
            with self.time_keeper.timed("Total database teardown"):
                self.teardown_databases(old_config)
            self.teardown_test_environment()
        except Exception:
            # Silence teardown exceptions if an exception was raised during
            # runs to avoid shadowing it.
            if not run_failed:
                raise
    self.time_keeper.print_results()
    return self.suite_result(suite, result)
```

### 적용 방법 
1. DiscoverRunner를 상속받는 모듈을 작성한다.
    - `setup_test_environment`
        - **테스트가 본격적으로 시작하기 전에 딱 한번 실행되는 함수**로 `TestCase`가 처음 실행될 때 작동하는 `setUpClass`나 `setUpTestData` 와는 결이 다르다
    - `teardown_test_environment`
        - **모든 테스트 케이스가 다 끝나는 순간에 작동되는 함수**

```python
    from typing import Set

from django.test.runner import DiscoverRunner
from django.apps import apps


class UnManagedModelTestRunner(DiscoverRunner):
    un_managed_models: Set[str]

    def __init__(self, *args, **kwargs):
        self.un_managed_models = set()
        super().__init__(*args, **kwargs)

    def setup_test_environment(self, **kwargs):
        for model in apps.get_models():
            model_name = model._meta.model_name
            if not model._meta.managed:
                self.un_managed_models.add(model_name)
                model._meta.managed = True

        super(UnManagedModelTestRunner, self).setup_test_environment()

    def teardown_test_environment(self, **kwargs):
        for model in apps.get_models():
            model_name = model._meta.model_name
            if model_name in self.un_managed_models:
                model._meta.managed = False

        super(UnManagedModelTestRunner, self).teardown_test_environment()
```

2. `settings.py`에 `TEST_RUNNER` 변수를 추가한다.

```python
TEST_RUNNER = "api.tests.runner.UnManagedModelTestRunner"
```

3. 유닛테스트를 실행해 제대로 작동되는 지 확인한다.

# References

* [Unmanaged Model을 사용하면서 Test를 적용하기(feat. Table XXX doesn't exist)](https://yangtaeyoung.github.io/docs/django/unmanaged-model/#soluton-1-%EB%AA%85%EB%A0%B9%EC%96%B4-%EA%B0%80%EB%A1%9C%EC%B1%84%EA%B8%B0%EC%A0%9C%EA%B0%80-%EC%82%AC%EC%9A%A9%ED%95%9C-%EB%B0%A9%EB%B2%95)
* [Django Database Testing Unmanaged Tables with Migration](https://technote.fyi/programming/django/django-database-testing-unmanaged-tables-with-migrations/)
* [Django Testing Advanced Document](https://docs.djangoproject.com/en/5.0/topics/testing/advanced/)
* [Django Applications Document](https://docs.djangoproject.com/en/5.0/ref/applications/)