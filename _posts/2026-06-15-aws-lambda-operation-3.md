---
layout: post
title: "AWS Lambda 개발환경 개선기 (3): CI/CD에서 바이너리 패키지 오류 해결하기"
date:   2026-06-15 09:00:00 +0900 
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
* 따라서 Docker Container를 활용해 AWS Lambda와 일치하는 (혹은 호환되는) 리눅스 환경에서 패키지를 설치·패키징해야 정상 작동한다.

* * *


# 배경

예전에 다니던 회사에서는 고객이 충전 서비스를 사용하기 위한 카드를 발급할 때, 당일 카드 발급 리스트를 생성하는 배치 프로세스가 있었다.
원래 이 배치는 상용 서버의 crontab에서 돌고 있었는데, 로직과 코드를 확인하려면 실제 서버 터미널에 직접 접근해야 할 정도로 복잡했고, 코드가 Github에 올라가 있지도 않았다.
이를 공유하고 관리하기 쉽게 만들기 위해 해당 배치 프로세스를 AWS Lambda로 이전하게 되었다.

그런데 Github Action 기반 CI/CD를 통해 배포한 결과, 함수가 정상 작동하지 못하고 Import Error를 발생시켰다. 정확히는 `numpy` 관련 모듈을 불러오지 못하는 에러였다.

```text
[ERROR] Runtime.ImportModuleError: Unable to import module 'xxxx.xxxxxxx': Unable to import required dependency numpy. Please see the traceback for details.
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


# 문제 재연 과정

## 개발 환경
- OS: MacOS
- Python 3.14, uv(pyproject)
- 테스트용 라이브러리: numpy

## 코드 작성

람다 함수 코드는 아래와 같이 작성했다. `sum()` 호출 시, `numpy` 모듈을 불러와 일부러 에러를 일으키게 한다.


```python

import numpy as np

def handler(event, context):
    val_a = event.get("a", 0)
    val_b = event.get("b", 0)

    return {
        "statusCode": 200,
        "body": f"Result: {val_a} + {val_b} = {sum(val_a, val_b)}"
    }


def sum(a: int, b: int) -> int:
    np.add([a], [b])  # numpy 호출 코드
    return a + b
```

## 결과

uv를 이용해 `zip` 파일로 패키징을 하고, AWS Lambda로 배포를 한 다음, 테스트를 하면 아래와 같이 에러 메시지가 나온다.

```
Unable to import module 'handler':

IMPORTANT: PLEASE READ THIS FOR ADVICE ON HOW TO SOLVE THIS ISSUE!

Importing the numpy C-extensions failed. This error can happen for
many reasons, often due to issues with your setup or how NumPy was
installed.

The following compiled module files exist, but seem incompatible
with either python 'cpython-314' or the platform 'linux':

  * _multiarray_umath.cpython-314-darwin.so

We have compiled some common reasons and troubleshooting tips at:

    https://numpy.org/devdocs/user/troubleshooting-importerror.html

Please note and check the following:

  * The Python version is: Python 3.14 from "/var/lang/bin/python3.14"
  * The NumPy version is: "2.4.6"

and make sure that they are the versions you expect.

Please carefully study the information and documentation linked above.
This is unlikely to be a NumPy issue but will be caused by a bad install
or environment on your machine.

Original error was:

No module named 'numpy._core._multiarray_umath'
```

# 원인 분석

아까 발생한 에러 메시지를 해석해보면 아래와 같은 원인이 있음을 확인할 수 있다.

## C 기반 확장 모듈의 바이너리 패키지

```
Importing the numpy C-extensions failed. This error can happen for
many reasons, often due to issues with your setup or how NumPy was
installed.
```

파이썬 모듈이나 그 구현체를 만들 때, GIL이나 메모리 관리 같은 파이썬 자체의 제약에서 벗어나 성능을 끌어올리기 위해 C나 C++을 함께 사용하는 경우가 있는데, `numpy`가 바로 이 경우에 해당한다. `numpy`는 주로 다차원 배열이나 행렬 연산을 효율적으로 수행하기 위해 사용되는 모듈로, 복잡한 수치 연산부터 이미지 처리까지 다양한 분야에 쓰인다. 그만큼 성능 최적화에 신경을 쓸 수밖에 없고, 이로 인해 핵심 연산은 대부분 C로 작성되어 있다.

## 바이너리 파일 호환성 이슈

```
The following compiled module files exist, but seem incompatible
with either python 'cpython-314' or the platform 'linux':

  * _multiarray_umath.cpython-314-darwin.so
```

흔히 Python이나 Java의 장점을 이야기할 때 빠지지 않는 토픽 중 하나가 **이식성(portability)**이다. Python은 소스 코드를 Python Interpreter가 그 자리에서 읽어 실행하는 구조다. OS마다 그에 맞는 인터프리터만 설치되어 있으면 동일한 파이썬 코드를 수정 없이 그대로 실행할 수 있기 때문에 대부분 호환이 된다. Java도 비슷하다. Java 코드는 ByteCode로 한 번 컴파일되지만, 이 ByteCode는 OS 위에서 바로 실행되는 것이 아니라 JVM 위에서 실행된다. 그렇기 때문에 JVM만 있으면 어느 환경에서든 대부분 동일하게 동작한다.

그러나 C/C++은 OS와 CPU 아키텍처에 맞는 네이티브 바이너리로 컴파일되는 구조다. 즉, 어떤 환경에서 컴파일했느냐에 따라 만들어지는 바이너리가 달라지기 때문에, A 환경에서 만든 바이너리가 B 환경에서는 실행되지 않을 가능성이 높다.

위 에러 메시지에도 나와 있듯, 패키징을 했을 때의 환경은 MacOS(darwin)였다. 그래서 설치 과정에서 macOS용으로 빌드된 `_multiarray_umath.cpython-314-darwin.so` 파일이 패키지에 포함된 채로 배포가 됐다.

> 여기서 잠깐, **wheel(`.whl`)**은 파이썬 패키지의 미리 빌드된 배포 형식이다. `numpy`처럼 C 확장이 포함된 라이브러리를 `pip install` 하면, pip는 소스를 그 자리에서 컴파일하는 대신 현재 환경(OS, CPU 아키텍처, 파이썬 버전)에 맞는 wheel을 내려받아 설치한다. 예를 들어 macOS에서 설치하면 `numpy-2.4.6-cp314-cp314-macosx_...whl`처럼 darwin용으로 빌드된 `.so`가 들어있는 wheel이 받아진다. 즉, 우리가 직접 컴파일하지 않아도 "그 환경에 맞는" 바이너리가 자동으로 따라 들어오는 셈이다.

하지만 AWS Lambda는 MacOS도 Ubuntu도 아닌 **RHEL 계열의 Amazon Linux** 위에서 동작하기 때문에, macOS용 바이너리를 불러올 수 없어 "호환되지 않는다(`but seem incompatible`)"는 문구가 나타난 것이다.

## 결과

정리하면, 이번 에러의 근본 원인은 **패키지를 설치(빌드)한 환경과 함수가 실제로 실행되는 환경이 달랐기 때문**이다. `numpy`처럼 C 확장에 의존하는 라이브러리는 플랫폼별 바이너리(`.so`)를 포함하는데, MacOS에서 설치한 macOS용 바이너리는 Amazon Linux 위에서 실행되는 Lambda와 호환되지 않는다. 과거 `pillow(PIL)`에서 겪었던 문제도 결국 같은 이유였다.

그렇다면 해결의 핵심은 명확하다. **패키지를 설치하는 환경을 Lambda 실행 환경과 일치시키는 것**이다.


# 해결

## OS 환경 맞추기

해결 방법은 간단하다. 패키징 환경을 AWS Lambda와 일치시키면 된다. 즉, Amazon Linux(혹은 호환되는 리눅스) 위에서 패키징하면 된다. 그렇다면 윈도우나 맥북에서 어떻게 리눅스 환경으로 패키징할 수 있을까? 이를 위한 방법 역시 간단하다. 바로 **Docker**를 사용하는 것이다.

## Docker 사용 이유

앞서 정리했듯, 이번 문제의 핵심은 **패키지를 설치한 환경과 Lambda 실행 환경이 달랐다는 것**이다. 그렇다면 "Amazon Linux 환경에서 패키징을 한다"는 조건만 만족하면 되는데, 여기서 Docker를 쓴 이유는 다음과 같다.

* **OS에 의존하지 않는다.** Mac, Windows 등 개발자의 로컬 OS가 무엇이든, Docker 컨테이너 안에서는 항상 Amazon Linux와 동일한 환경이 만들어진다. 따라서 어떤 환경에 맞는 wheel이 설치되는지 고민할 필요가 없다.
* **환경 차이를 없앤다.** 로컬과 Github Action(CI/CD 서버)의 OS가 다르더라도, 동일한 이미지를 사용하면 누가 어디서 빌드하든 항상 같은 결과가 나온다. "내 로컬에선 됐는데 CI에선 안 된다"는 문제가 사라진다.
* **실제 Lambda 환경과 가장 가깝다.** AWS는 Lambda 런타임과 동일하게 구성된 공식 베이스 이미지(`public.ecr.aws/lambda/python`)를 제공한다. 이를 사용하면 실행 환경을 거의 그대로 재현한 상태에서 패키징할 수 있다.

여기서 한 가지 짚고 갈 점은, Docker가 **함수를 "실행하는 환경"이 아니라 패키지를 "빌드하는 환경"으로 쓰였다**는 것이다. 컨테이너는 Lambda에 올릴 zip을 만드는 용도로만 사용하고, 실제 함수는 평소처럼 Lambda 위에서 동작한다.

## 패키징 스크립트(`package.sh`)에 Docker 관련 코드 추가

```
docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/sh \
    -v "$ROOT_DIR":"$ROOT_DIR" \
    -w "$ROOT_DIR" \
        "public.ecr.aws/lambda/python:3.14" \
    -c "\
        pip install uv && \
        uv export --frozen --no-dev --no-emit-project -o '$BUILD_DIR/requirements.txt' && \
        uv pip install -r '$BUILD_DIR/requirements.txt' --target '$BUILD_DIR' --no-installer-metadata --no-compile-bytecode && \
        rm '$BUILD_DIR/requirements.txt'"
```

코드를 패키징하는 스크립트 중, **파이썬 모듈을 설치하는 과정을 Docker 기반 프로세스로 대체하는 방향으로 해결했다.** 코드를 하나하나씩 뜯어보면 다음과 같다.

### `--platform linux/amd64`

* 컨테이너를 어떤 CPU 아키텍처로 실행할지 지정하는 옵션으로, Lambda 함수의 아키텍처와 맞춰야 한다. 예를 들어 Lambda가 x86_64라면 `linux/amd64`를, Graviton(arm64)이라면 `linux/arm64`를 선택한다.

### `--entrypoint /bin/sh`

* 이미지에 기본으로 지정된 실행 명령을 무시하고, 내가 지정한 `/bin/sh`를 실행하겠다는 뜻이다.
* Dockerfile을 다뤄봤다면 알겠지만, 작성할 때 맨 마지막에 실행할 명령어(`CMD`, `ENTRYPOINT`)를 지정하게 된다. `--entrypoint /bin/sh`를 설정하면 이미지에 정의된 기본 명령을 무시하고 `/bin/sh`를 실행한다고 보면 된다.

### `-v "$ROOT_DIR":"$ROOT_DIR"` `-w "$ROOT_DIR"`

* `-v`는 호스트(Docker 밖)의 리소스(디렉터리, 파일 등)를 컨테이너 안과 연동하는 용도로 사용한다.
* 포맷은 `-v {호스트 경로}:{컨테이너 내부 경로}`이다.
* 내부와 외부 경로를 똑같이 설정한 이유는, 기존 경로를 그대로 유지함으로써 경로 차이로 인한 패키징 문제가 발생하지 않게 하기 위함이다.
* 웹 서비스를 지속적으로 운영하는 경우라면 컨테이너 내부 루트를 `/app`처럼 별개로 설정하겠지만, 지금은 Docker를 상시 운영이 아니라 패키징 이슈를 해결하기 위한 일회성 프로세스로 쓰는 상황이다. 따라서 가능한 한 외부 디렉터리 구조와 일치시켜 작업에 차질이 없도록 했다.
* `-w`는 컨테이너 안에서 명령을 실행할 작업 디렉터리(working directory)를 지정한다.
* `ROOT_DIR`은 프로젝트 최상위 루트를 의미하며, 이 값은 상황에 따라 달라질 수 있다.

### `public.ecr.aws/lambda/python:3.14`

* 이 명령에서 가장 중요한 부분으로, 패키징에 사용할 OS(컨테이너) 환경을 의미한다.
* 해당 이미지는 AWS가 제공하는 공식 **Lambda 베이스 이미지**로, 실제 Lambda 런타임과 동일한 **Amazon Linux** 기반으로 구성되어 있다. 즉, 함수가 실제로 실행되는 환경과 거의 동일한 환경에서 패키징을 할 수 있다.
* 이 안에서 패키지를 설치하면 darwin용이 아닌 Amazon Linux용 바이너리(wheel)가 설치되기 때문에, Lambda에 배포해도 호환성 문제가 발생하지 않는다. Mac에서 설치할 때 darwin용 wheel이 받아져 문제가 됐던 것과 정확히 대비되는 지점이다.
* Lambda 배포를 위한 패키징 시 **`public.ecr.aws/lambda/{언어}` 이미지로 빌드 환경을 세팅하면 된다.**

### `-c ...`

* 여기서부터는 실제 실행 명령어를 실행하는 코드다. 람다 함수의 환경이나 성격에 따라 코드가 달라질 수 있다.
* `pip` 자체는 내장이 되어 있어서. 바로 실행하도 상관 없지만, `uv`를 같이 사용할 경우 `uv`는 기본적으로 제공하지 않기 때문에 별개로 설치를 해야 한다.


## 적용 후 결과

정상적으로 작동됨을 확인했다.

```
Response:
{
  "statusCode": 200,
  "body": "Result: 1 + 2 = 3"
}
```

## 업무상 성과

CI/CD의 패키징 프로세스에 Docker 기반 설치 로직을 추가하여, numpy 또는 pillow에서 발생하던 import 이슈를 완전히 해결했다.

## 회고

그동안 직전 회사에서 업무를 진행하면서 Docker를 알게 모르게 써왔다. (특히 서버 배포에는 주로 Docker Compose를 사용했다.) 하지만 기능 개발에 바쁘다 보니 Docker 같은 컨테이너 영역에는 무관심했던 것이 사실이고, 이 때문에 Docker를 왜 쓰는지조차 정확히 모른 채 '그냥 유행이라 쓰나 보다' 하고 넘겨왔다. Docker로 운영하는 동안 특정 이슈를 제외하면 인프라 관련 문제가 거의 없었던 데다, 사람이 직접 손을 대지 않으면 그 도구를 잊어버리기 마련이기 때문이다.

하지만 이번 이슈를 해결하면서 Docker를 쓰는 이유를 조금이나마 깨달았다. **개발 환경과 실제 운영 환경의 간격을 최대한 줄여, 개발과 운영 사이의 갭을 좁히는 데 Docker가 가장 유리하고 편리하다**는 것을 말이다.

다시 한번 Docker의 존재 이유를 체감하게 되었다. 앞으로 다른 프로젝트를 진행할 때도 Docker를 왜 사용하는지, 더 나아가 어떤 기술을 도입할 때 왜 그 기술을 써야 하는지 진지하게 고민하는 습관을 들여야겠다.