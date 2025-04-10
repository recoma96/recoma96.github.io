---
layout: post
title:  "Python Double List Comprehension으로 2차원 배열을 1차원으로 만들기"
date:   2025-04-09 07:00:00 
categories: "Python"
summary: "이중 리스트 컴프리헨션... 꼭 필요한가..?"
tags: ["python"]
image: ""
---

# List Comprehension

Python의 List Comprehension은 어떤 배열을 다른 배열로 매핑할 때 사용되는 트릭으로 일반적인 `for` 문 보다 더 코드를 깔끔하게 작성할 수 있다. 예를 들어 
`[1,2,3,4]` 배열의 요소에 2를 곱한 `[2,4,6,8]` 로 표현하고자 할때

```python
src = [1,2,3,4]

dst = []
for element in src:
    dst.append(element * 2)
```


이렇게 작성할 코드를 List Comprehension을 사용하면

```python
src = [1,2,3,4]

dst = [element * 2 for element in src]
```

이렇게 보기좋게 작성할 수 있다. 그렇다 보니 복잡한 로직이 아닌 이상 어지간하면 리스트 컴프리헨션을 쓰는 경우가 많으며. `map`함수가 버젓이 있음에도 불구하고 이쪽을 더 많이 쓴다.

> `map`함수를 사용할 경우 아래와 같다. 일반 for문 보다는 코드가 줄긴 했지만, 리스트 컴프리헨션보다는 코드 가시성이 조금 아쉽다.
> ```python
> src = [1,2,3,4]
> dst = list(map(lambda e: e * 2, src))
> ```


# 이중 List Comprehension

그런데 최근 문득 궁금증이 생긴다. _"이중 리스트 컴프리헨션도 작성할 수 있을까?"_ 


예를 들어 2차원 배열 `[[1,2,3], [4,5,6]]`를 `[1,2,3,4,5,6]` 1차원 배열로 바꾼다고 가정해 보자. 리스트 컴프리헨션을 쓰지 않았다면 코드는 아래와 같다.

```python

arr = [
    [1,2,3],
    [4,5,6],
]

dst = []

for row in arr:
    for element in dst:
        dst.append(element * 2)

```

이걸 이중 List Comprehension으로 표현하면 다음과 같다.

```python
arr = [
    [1,2,3],
    [4,5,6],
]

dst = [element * 2 for row in arr for element in row]
```

저 코드가 뭔지 모를 수 있는데 이중 for 문과 비교하면 아래와 같다.

![](/assets/img/20250410/1.jpg)

for문 depth는 List Comprehension에서 **왼쪽부터 오른쪽으로 이동한다.** 단 최후에 출력될 데이터 `element` 는 depth에 상관없이 **무조건 왼쪽으로** 간다. element가 왼쪽에 배치되기 때문에 for문도 오른쪽부터 왼쪽으로 진행할 거라 생각하는데 절대 아니다. 그래서 이 부분은 처음 접할 때 헷갈리는 경우가 많다.


## 대안: itertools.chain.from_iterable 사용하기

개인적인 생각으로는 솔직히 이중 컴프리헨션은 코드 순서부터 헷갈리기 때문에 **혼란만 야기할 거라고 생각한다.** 그렇다 보니 이중 리스트 컴프리헨션의 대안이 따로 있는데 그게 바로 `itertools.chain.from_iterable` 이다. Python 내장 패키지 중 하나인 `itertools`는 순혈, 조합 등 프로그래밍을 하는 데 있어 여러 알고리즘을 제공하는데 `itertools.chain.from_iterable`는 2차원 배열을 1차원 배열로 펴는데 사용된다.

```python
from itertools import chain


arr = [
    [1,2,3],
    [4,5,6],
]

dst = list(chain.from_iterable(arr))
```

## 용도

뭔가 이딴건 사용하지 않을 것 같지만. 간혹 있는 모양이다. 나의 경우 django 기반의 관리자 페이지 API 서버를 개발할 때. 복합키 이슈로 조회 `select`를를 Raw Query를 사용하는 경우가 있었다. 정확히는 복합키 여러개를 가지고 조회하는 쿼리였다.s _(django model은 복합키를 지원하지 않는다.)_ 

```
select ... 생략 ... from table where (pk1, pk2) in ((%s, %s), (%s, %s), ...)
```

그리고 내가 가지고 있는 배열은 복합키로 이루어진 2중 배열이었다

```python
data = [
    [1, 2],
    [3, 4],
]
```

즉 저 복합키 2중 배열을 쿼리문에 바인딩을 해야 하는데 바인딩을 하려면 1차원 배열이 필요했으므로 2차원 배열을 1차원 배열로 변형해야 하는 일이 생겼다. 그래서 이중 List Comprehension을 사용하여 해당 문제를 해결했다. _(나중가서는 `itertools.chain.from_iterable`을 사용했다.)_

```python
data = [
    [1, 2],
    [3, 4],
]

placeholders = ", ".join(["(%s, %s)"] * len(data))
flat_values = [element for row in data for element in row]

sql = f"select * from table where (pk1, pk2) in ({placeholders})"

with connections["main-database"].cursor() as cursor:
    cursor.execute(sql, flat_values)
    results = cursor.fetchall()
```