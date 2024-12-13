---
layout: post
title:  "매직 넘버(Magic Number)의 의미와 유의해야 할 점"
date:   2024-12-13 09:30:00 +0900
categories: "Software_Arhitecture"
summary: "스파게티 코드의 주범인 매직 넘버에 대해서 알아보자."
tags: ["clean-code"]
image: ""
---

# 매직 넘버의 의미와 문제점

매직 넘버(Magic Number)란 **아무런 설명 없이 임의로 들어가는 상수 또는 기타 데이터**를 의미한다. 즉, 개발자 입장에서는 코드상에 상수가 노출되어 있다는 뜻이 되기도 한다. 처음엔 뭔 소린지 와닿지 않겠지만 우리가 처음 코딩을 공부할 때 쥐도새도 모르게 밥먹듯이 썼던 개념이다. 밑의 예시를 보자.


## 예시1

```cpp

int score;
cin >> score;

if(score >= 90) {
    cout << 'A';
} else if(score >= 80) {
    cout << 'B';
} else if(score >= 70) {
    cout << 'C';
} else if(score >= 60) {
    cout << 'D';
} else {
    cout << "미달";
}
```

`if`문을 처음 공부할 때 국룰로 나오는 `grade`관련 분기 예시다. 이렇게 특정 설명 없이 90, 80, 70, 60 이렇게 상수로 적혀 있는 것을 **매직넘버** 라고 한다. 하지만 이 상수들의 무엇을 의미하는지는 이미 코드에 명확하게 명시되어 있다. 90점 이상이면 A, 80점대면 B, 70점대면 C, 60점대면 D, 그 이하는 미달이다. 그렇기에 겉으로는 문제가 없어 보인다.

> 경우에 따라서는 'A', 'B', 'C', 'D' 도 매직넘버로 보는 견해가 있다. 얘네들도 특정한 설명이 따로 없기 때문이다.


## 예시2

```cpp
cin >> input

if(input == 3) {
    cout << "남성입니다." << "\n";
} else if (input == 4) {
    cout << "여성입니다." << "\n";
}
```

코드를 보아하니 input이 3이면 남성이고 input이 4이면 여성으로 판정을 하고 있는 모양이다. 겉으로는 문제가 없어 보인다. 3이 남자고 4이 여자인게 명확하니까. 하지만 이건 어떨까?


```cpp
void send_fcm_to_single_user(User& user) {
    if(user.gender == 3 && user.is_specialist) {
        push_fcm_message(user, "This is Important Notice", "The Important Notice");
    } else {
        push_fcm_message(user, "This is Notice", "The Notice");
    }
}
```

`send_fcm_to_single_user` 함수는 성별이 남성이면서(`user.gender == 3`) 동시에 특수유저(`user.is_specialist`)일때 중요 푸시알림을 보내고 그렇지 않으면 일반 푸시알림을 보낸다. 하지만 도메인을 모르는 사람 또는 신규 개발자가 이 코드를 보면 어떤 조건으로 중요 푸시알림을 발송하는지 전혀 모른다. **`user.gender == 3`이 도대체 어떤 것을 의미하는 지 모르기 때문이다.** 당장 이 코드만 봐도 의도를 모르겠는데, 이러한 매직넘버들이 서비스 코드 도처에 깔려있다고 생각해 보자. 아마 담당자한테 일일이 반복적으로 이게 뭔 소린지 물어봐야 할 것이다. 게다가 만약에 남성을 지칭하는 상수가 3에서 5로 바뀐다면, **파일 하나하나씩 뒤져가면서 3을 5로 바꿔야 하는 끔찍한 사태가 벌어질 것이다.** 다 바꿨다 해도 결국 **사람이 코드를 수정했기 때문에 휴먼에러가 일어날 가능성이 생기게 되고 이는 결국 서비스 장애로 이어지게 된다.**


# 제대로 사용하려면?

## 고정 변수 (형한정어, const) 사용

매직 넘버를 고정변수로 변경을 해서, 다른 개발자들이 금방 알아볼 수 있게 하면 된다.

```cpp
// gender.cpp
const MALE = 3;
const FEMAILE = 4;

// fcm.cpp
void send_fcm_to_single_user(User& user) {
    if(user.gender == MALE && user.is_specialist) {
        push_fcm_message(user, "This is Important Notice", "The Important Notice");
    } else {
        push_fcm_message(user, "This is Notice", "The Notice");
    }
}
```

이제 `user.gender == MALE`로 바뀜으로써 누구한테 중요 알림을 보내는지 처음 보는 사람도 정확히 알 수 있게 되었다. 뿐만 아니라 남성 코드가 3에서 5로 바뀔 때, 일일이 3에서 5로 바꾸는 것이 아닌 `gender.cpp`의 `MALE`의 값만 변경하면 된다.

```cpp
const MALE = 3;
const FEMAILE = 4;
const OTHER_SERVICE_MALE = 5
const OTHER_SERVICE_FEMAILE = 6
```

하지만 특정 서비스에서의 성별 코드가 다르다면 동일 변수 이름을 피하기 위해 `OTHER_SERVICE_MALE` 처럼 앞에 접두사를 붙여야 한다. 이렇게 되면 변수명은 복잡해지게 되고 코드를 읽기가 힘들어지게 된다. 그래서 나온게 `Enum`이라는 구조체(클래스)다.


## Enum 사용 

좀더 나아가서 Enum 계열의 자료구조 또는 클래스를 활용할 수도 있다.
Enum을 사용하게 되면 코드가 좀더 깔끔하게 정리가 된다.

```cpp
// gender.cpp
enum Gender {
    MALE = 3,
    FEMALE = 4,
}

enum OtherServiceGender {
    MALE = 5,
    FEMALE = 6,
}

// fcm.cpp
void send_fcm_to_single_user(User& user) {
    if(user.gender == Gender::MALE && user.is_specialist) {
        push_fcm_message(user, "This is Important Notice", "The Important Notice");
    } else {
        push_fcm_message(user, "This is Notice", "The Notice");
    }
}
```

### Python의 경우 (dict vs Enum)

Python 에서도 `Enum`을 지원하기 하지만 상수 비교하는 과정이 다른 언어보다 약간 복잡하기 때문에 일부 Python 개발자들 사이에서는 `Enum`을 쓸지 `dict`를 쓸지 논란이 되기도 한다.

```python
class Gender(Enum):
    MALE = 3
    FEMALE = 4

if __name__ == "__main__":
    input_gender = 3
    if input_gender == Gender.MALE.value:
        print(Gender.MALE.name)
```

`Gender.MALE == input_gender`로 하면 비교 연산이 정상적으로 작동이 되지 않는다. `Gender.MALE`을 Enum 클래스로 인식하기 때문이다. `Gender.MALE.value` 까지 가야 상수와 비교 연산이 가능하다. `Gender.MALE.name`으로 하면 열거형 이름인 'MALE' 이라는 문자열이 나온다. `.value`와 `.name`에 대해서 유용하게 사용할 수 있다는 긍정적인 시각도 있지만, 한편으로는 코드가 길어진다는 부정적인 시각도 존재한다. 내가 다니는 회사 역시 이러한 이유로 `Enum` 사용에 부정적이고 대신에 순수 변수나 `dict`를 사용한다.

```python
Gender = {
    "MALE": 3,
    "FEMALE": 4,
}

if __name__ == "__main__":
    input_gender = 3
    if input_gender == Gender["MALE"]:
        print("남성입니다.")
```

`dict`형을 사용하면 `.value`를 추가로 사용할 필요가 없어 코드가 짧아진다. 그러나 `Gender.MALE`이 아닌 `Gender["MALE"]`은 보는 사람에 따라 가독성에 방해가 될 수 있고. `Enum`처럼 열거 전용 자료구조가 아닌 범용으로 사용되는 `dict`를 사용했기 때문에 이게 열거형인지 아닌지 헷갈리는 경우가 생긴다는 단점이 있다. 따라서 **파이썬의 경우 열거형을 구현할 때 `dict`를 쓸건지 `Enum`을 쓸건지, 그리고 어떻게 코드네이밍을 정할 지 고민 또는 팀원들 간에 논의를 할 필요가 있다.**


# 마치며

그동안 나를 포함한 대부분의 개발자들은 프로그래밍을 처음 공부를 하는 과정에 무의식적으로 매직넘버를 사용해 왔다. 그리고 그게 버릇이 되어 실무에서도 역시 무의식적으로 매직넘버를 사용하는 일도 생긴다. 나 역시 이런 실수를 여러번 해 왔고 이로 인해 일일이 상수를 변경해야 하는 등 여러번 댓가를 치루기도 했다. 매직넘버를 100% 사용하지 않는 것은 매우 힘들긴 하지만 그래도 가능한 사용하지 않는 방향으로 버릇을 고치는 일은 개발에 있어서 매우 중요한 요소이다.
