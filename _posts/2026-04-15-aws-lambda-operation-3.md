---
layout: post
title: "AWS Lambda 개발환경 개선기 (3): CI/CD에서 바이너리 패키지 오류 해결하기"
date:   2026-06-10 09:00:00 +0900 
categories: "AWS"
summary: "Docker는 이런 문제에서 빛을 발휘한다."
tags: ["aws", "lambda", "devops" , "docker", "github-action"]
image: ""
---


### 지난 이야기들

1. [AWS Lambda 개발환경 개선기 (1): 콘솔에서 탈출하다](/aws/2026/01/22/aws-lambda-operation.html)
2. [AWS Lambda 개발환경 개선기 (2): CLI 기반 배포에서 CI/CD 구축 까지](/aws/2026/01/29/aws-lambda-operation-2.html)

<br>

### TL,DR

* AWS Lambda의 환경은 RHEL 계열의 Amazon Linux로 Ubuntu 혹은 Mac 환경과는 다르다.
* Amazon Linux가 아닌 다른 OS에서 설치한 C 기반의 파이썬 라이브러리들은 다른 환경에서 작동하지 않을 가능성이 높다.
* 따라서 Docker Container를 활용해 AWS Lambda와 일치하는 환경에서 설치 및 배포를 해야 정상작동된다.

* * *


# 배경

예전에 다니던 회사에는 고객이 충전 서비스를 사용하기 위한 카드를 발급할 때, 당일 카드 발급 리스트를 생성하는 배치 프로세스가 있었다.
원래 이 배치는 상용 서버의 crontab에서 돌고 있었는데, 로직과 코드를 확인하려면 실제 서버 터미널에 직접 접근해야 할 정도로 복잡했고, 코드가 Github에 올라가 있지도 않았다.
이를 공유하고 관리하기 쉽게 만들기 위해 해당 배치 프로세스를 AWS Lambda로 이전하게 되었다.

그런데 Github Action 기반 CI/CD를 통해 배포한 결과, 함수가 정상 작동하지 못하고 Import Error를 발생시켰다. 정확히는 `numpy` 관련 모듈을 불러오지 못하는 에러였다.

```text
[ERROR] Runtime.ImportModuleError: Unable to import module 'functions.xxxxxxx': Unable to import required dependency numpy. Please see the traceback for details.
Traceback (most recent call last):
EXTENSION	Name: bootstrap	State: Ready	Events: [INVOKE, SHUTDOWN]
INIT_REPORT Init Duration: 1882.55 ms	Phase: init	Status: error	Error Type: Runtime.ImportModuleError
```

## 사실은 이미 알고 있던 문제였다

사실 이 에러는 처음 겪는 것이 아니었다. 과거 S3 이미지 최적화를 담당하는 람다 함수에서도 `pillow(PIL)`에서 비슷한 이슈가 발생한 적이 있었다.
당시에는 원인을 깊게 파고들지 않고, 패키지 리스트 파일(`requirements.txt`)에서 PIL을 제외한 다음 대신 **Lambda Layer**에 고정하는 방식으로 이슈를 우회했었다.

하지만 이렇게 하면 함수가 실제로 PIL이나 numpy에 의존하고 있음에도 의존성 명세(`requirements.txt`)에는 그 사실이 드러나지 않는다.
개발자 입장에서는 해당 패키지가 정말 필요한지 아닌지 혼동할 가능성이 높고, 실제로 신입 개발자들이 이 부분에 대해 반복적으로 질문하는 일이 잦았다.

더 이상 우회하는 방식으로 문제를 덮어두면 안 되겠다고 판단했고, 근본적인 원인을 찾아 제대로 해결하기로 결심했다.





## 문제 재연 과정

### 개발 환경
- OS: MacOS

### 1. 코드 작성


### 2. 패키지 설치


### 3. AWS Lambda 배포



# 원인

## AWS Lambda의 실행 환경

<!-- TODO: Lambda Python 런타임이 Amazon Linux 계열 환경 위에서 실행된다는 점 작성 -->
<!-- TODO: Mac 또는 Ubuntu에서 설치한 바이너리 패키지를 그대로 올리면 실행 환경이 달라질 수 있다는 점 작성 -->

## wheel이란 무엇인가

<!-- TODO: wheel은 Python 패키지 배포 포맷이며, 순수 Python 코드뿐 아니라 컴파일된 바이너리를 포함할 수 있다는 점 작성 -->
<!-- TODO: numpy, pillow처럼 C/C++ 확장 모듈이 포함된 패키지는 OS, CPU 아키텍처, glibc 버전 등에 영향을 받을 수 있다는 점 작성 -->

## 왜 Import Error가 발생했는가

<!-- TODO: Github Action의 Ubuntu 환경에서 설치된 wheel과 AWS Lambda 실행 환경이 일치하지 않아 바이너리 호환성 문제가 발생했다는 흐름 작성 -->
<!-- TODO: 단순히 requirements.txt 문제가 아니라 "어디에서 설치했는가"의 문제였다는 점 강조 -->

# 해결

## 해결 전략

<!-- TODO: 패키지를 설치하는 환경과 Lambda가 실행되는 환경을 맞추는 것이 핵심이라는 점 작성 -->
<!-- TODO: 해결책은 AWS Lambda와 유사한 Docker 이미지 안에서 pip install과 zip 패키징을 수행하는 것이라고 정리 -->

## 왜 Docker를 사용했는가

<!-- TODO: CI/CD 서버의 OS에 의존하지 않고, 매번 동일한 빌드 환경을 만들 수 있다는 점 작성 -->
<!-- TODO: 개발자 로컬 환경과 Github Action 환경 차이도 줄일 수 있다는 점 작성 -->
<!-- TODO: Docker가 "배포 실행 환경"이 아니라 "배포 패키지를 만드는 빌드 환경"으로 쓰였다는 점 명확히 작성 -->

## Docker 기반 패키징 흐름

1. Github Action에서 Docker 컨테이너를 실행한다.
2. 컨테이너 내부에서 `pip install`을 수행한다.
3. Lambda 코드와 설치된 패키지를 함께 zip으로 묶는다.
4. 생성된 zip 파일을 AWS Lambda에 배포한다.

```shell
TODO: Docker 기반 패키징 명령어 예시
```

## 적용 후 결과

<!-- TODO: 동일한 코드와 requirements.txt를 사용해도 Docker 기반 패키징 후에는 Import Error가 사라졌다는 결과 작성 -->
<!-- TODO: 이번 문제를 통해 "코드의 재현성"뿐 아니라 "빌드 환경의 재현성"도 중요하다는 회고로 연결 -->
