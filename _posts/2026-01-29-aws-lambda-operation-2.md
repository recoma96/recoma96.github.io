---
layout: post
title:  "AWS Lambda 개발환경 개선기 (2): CLI 기반 배포에서 CI/CD 구축 까지"
date:   2026-01-29 18:00:00 +0900 
categories: "AWS"
summary: "단순 개발 편의성을 넘어 배포 자동화 까지"
tags: ["aws", "lambda", "devops" , "shell-script", "github-action"]
image: ""
---

### TL;DR
* Github Action 기반의 CI/CD 파이프라인 구축
* CLI 환경에의 수동 배포 -> Github merge 기반 자동 배포로 전환
* 운영 안정성을 넘어, 배포 결과의 재현성까지 확보

* * *

# 개요

## 지난 이야기 요약

<br>

지난화 포스트: [AWS Lambda 개발환경 개선기 (1): 콘솔에서 탈출하다](/aws/2026/01/22/aws-lambda-operation.html)

<br>

포스팅 날짜로부터 한달 하고도 보름 전, Python3.9로 작성되어 있는 람다 함수의 Python 버전을 올리라는 AWS 권고에 대응을 하던 중, 작성된 코드들을 보고 기존의 람다 개발 환경은 리스크가 있다고 판단했다.
그 당시, 별개의 툴을 사용하지 않고, 순수 AWS Console에 들어가 직접 코드를 작성하고 deploy 버튼을 눌러 배포하는 방식이었는데, 이는 아래와 같은 문제점을 가지고 있었다.
* 개발/운영 분리가 되어 있지 않아 개발시 운영에 영향을 미칠 수 있다
* 코드 이력이 없어 누가 언제 이 코드를 작성했는지 알 수 없다.
* `requests`, `sqlalchemy` 같은 외부 모듈을 사용하려면 일일히 콘솔에서 Layer를 추가해야 한다. - 추가해야 할 모듈이 많아지면 관리하기가 심각하게 복잡해진다.

<br>

이런 이유로 나는 약 3주에 걸쳐 개발환경을 **콘솔 기반에서 GIT + CLI 기반으로 전환을 했고**, 아래와 같이 개선이 되었다.

* 이제 본인이 쓰고 있는 IDE로 직접 개발이 가능해졌다
* Git/Github 에서 코드 이력이 생겨, 언제 어떻게 개발을 했는지 확인이 가능하다.
* 외부 모듈을 `pip`로 관리를 하게 함으로써, 일일히 마우스로 Layer를 추가할 필요가 없어졌다.

## 1차 개선을 했지만...

1차 개선 작업을 통해 드디어 코드 이력이 남게 된다는 큰 장점이 생겼지만, 한편으론 **또 다른 이력인 배포 이력이 남지 않는다는 단점**은 아직 해소되지 않았다.
배포 이력이 남지 않는다면, 언제 배포해서 어떤게 반영되었는지 파악하기가 상당히 어려워진다. _(실제로 1년 전, [Redis 분산락 TTL 누락으로 인한 이슈](/distributed_lock/2025/06/21/python-redis-distributed-1.html) 추적도 배포 날짜를 모르고 있었다면 원인을 추적하는데 몇배의 시간이 걸렸을 수도 있었다.)_ 따라서, 단순히 배포 자동화 뿐만 아니라 배포 이력을 남기기 위해서라도 **CI/CD 구축은 시급해 보였고,** 이를 개선하는 작업도 진행했다.

# 본론

## 배포 시 관련없는 코드까지 패키징되는 문제

### 문제점

코드 패키징을 담당했던 스크립트 `package.sh` 는 Repo에 있는 모든 코드들을 전부 패키징하는 로직을 가지고 있었다. 초기에는 문제가 되지 않으나, 세월이 지나고 여러 개발자들을 거치게 되면 코드량이 비대하게 많아질 텐데, 여기서 치명적인 문제가 발생하게 된다. **람다 함수는 작성할 수 있는 코드 량이 정해져 있기 때문이다.** Lambda의 코드 최대 용량은 비압축 기준 250MB, 압축 기준 50MB 이다. 따라서 이 정해진 용량 이상의 코드가 올라오면, 더이상 배포가 진행되지 않는다.

### 해결 과정

배포를 담당하는 스크립트 `deploy.sh` 의 로직에서 코드 패키징을 할 때 `package.sh`를 아래와 같은 형태로 실행한다.

```shell
# deploy.sh

"$ROOT_DIR/scripts/package.sh"
```

`package.sh` 실행시 모든 코드들을 `.zip` 파일로 압축하는 구조였기 때문에 함수명 같은 별도의 인자가 따로 들어가지 않았다.

```shell
# package.sh

# 2) 모든 소스 복사
cp -R "$ROOT_DIR/functions" "$BUILD_DIR/"

# 3) zip 만들기
cd "$BUILD_DIR"
zip -r "$ZIP_FILE" .
cd "$ROOT_DIR"

echo "Build complete: $ZIP_FILE"
```

하지만 이렇게 되면 특정 함수와 전혀 무관한 코드 까지 패키징 되어 올라가게 된다. 이를 해결하기 위해 아래와 같이 배포하고자 하는 람다 함수 이름을 인자값으로 받아. 필요한 코드들만 패키징 할 수 있게 스크립트를 수정했다.

```shell
# package.sh

# 인자값 확인
if [ $# -ne 1 ]; then
  echo "Usage: $0 <function_name>"
  echo "  function_name: The name of the function directory to package (e.g., daily_cleanup)"
  exit 1
fi
FUNCTION_NAME="$1"

# 2) 소스 복사 (선택적으로)
cp -R "$ROOT_DIRfunctions/common" "$BUILD_DIR/common"
mkdir "$BUILD_DIR/functions"
cp -R "$ROOT_DIRfunctions/$FUNCTION_NAME" "$BUILD_DIRfunctions/$FUNCTION_NAME"

# 3) zip 만들기
cd "$BUILD_DIR"
zip -r "$ZIP_FILE" .
cd "$ROOT_DIR"

echo "Build complete: $ZIP_FILE"
```

`$FUNCTION_NAME`을 인자로 받아 functions디렉토리 안에 해당 함수 이름과 common 디렉토리만 골라서 압축을 할 수 있게 했다. common 디렉토리는 공통 모듈로, AWS 서비스 접근 관련 툴이나, ORM 모델 같은 필수적인 요소가 들어가 있기 때문에 반드시 같이 패키징 되어야 한다.


이제 람다 함수명 인자가 추가되었기 때문에 `deploy.sh` 에서도 `package.sh` 실행 시, 배포 대상 함수를 인자로 추가한다.

```shell
# deploy.sh

"$ROOT_DIR/scripts/package.sh" "$FUNCTION_NAME"
```


## 어느 함수의 코드가 변경되었는 지 Shell script로 확인하는 방법

CI/CD를 구축하기에 앞서 먼저 해결해야 하는 과제가 있었다.

> develop이나 main으로 merge 또는 push를 했을 때, 어느 함수의 코드가 추가/변경 되었는지 확인하는 방법이 있을까?

이 문제를 해결해야 하는 이유는, 변경해야 할 함수명을 커밋 메세지나 PR 내용에 담기에는 파싱이 어려울 뿐더러, 재배포 되어야 할 람다 함수 관련 정보를 메시지에 작성하지 않으면 배포가 안되는 휴먼 에러가 발생할 가능성이 높았기 때문이다. **휴면 에러를 최대한 줄이기 위해 오직 커밋 내용만으로 배포 대상 함수를 추려내 배포를 진행하는 방법을 찾아야 했다.**

<br>


이를 해결할 수 있는 방법으로 최신 커밋 내역과 비로 이전의 커밋 내역을 비교해 코드가 변경되는 함수만 리스트업을 하고, 그 리스트에 순회를 돌아 `deploy.sh` 명령어를 실행해서 순차적으로 배포하는 방법이다. 

아래는 코드가 변경된 함수만 리스트업하는 별도의 Shell script 파일이다.

```shell
# detect_function_changes.sh

#!/usr/bin/env bash
set -e

FROM_SHA="${1:?from sha required}"
TO_SHA="${2:?to sha required}"

git diff --name-only "$FROM_SHA" "$TO_SHA" \
  | grep '^functions/' \
  | cut -d/ -f2 \
  | sort -u
```

`git diff` 명령어는 현재 원격 브랜치의 코드와 지금 작성하고 있는 코드를 비교해서 어느 것이 바뀌었는지 알려주는 명령어이다. 예를 들어 작성하고 있는 특정 파일에 대해 어떻게 추가 또는 수정되고 있는지 알고 싶으면, 아래의 명령어를 입력하면 된다.

```
gif diff <파일명>
```

그런데, 해결해야 할 과제는 코드가 변경된 함수들을 추출하는 것이지 변경 내용을 알고 싶은 것이 아니다. `--name-only` 를 추가하면, 변경내역이 있는 **파일명**만 리스트업을 할 수 있다.
```shell
git diff --name-only

# 결과
functions/example_functions/handler.py
functions/example_functions/logics.py
/root/test/test_handler.py
```

아무 인자 없이 `git diff`만 하면, 최신 커밋 기준으로 어떤 코드가 변경되었는지만 확인이 가능하다. 하지만, 두 커밋 해시를 인자로 추가하게 되면, **두 커밋 사이 어떤 코드가 변경이 되었는지 정확히 확인이 가능하다.**

```shell
git diff --name-only <이전커밋해시> <최신커밋해시>

# 결과
functions/example_functions/handler.py
functions/example_functions/logics.py
/root/test/test_handler.py
```

_"어차피 최근에 커밋한 내용을 기반으로 반영할거라 굳이 이렇게 까지 할 필요가 있나"_ 라는 의문이 들 수 있을 텐데
어디까지나 로컬에서 개발할 때의 얘기이고, develop 또는 main으로 merge를 한 경우에는 **이미 merge된 내용이 최신 커밋이 되기 때문에** 프로세스 상에서는 merge된 커밋 위에 변경점이 없는 것으로 체크를 한다. 이렇게 되면 갱신된 코드 내용이 없는 것으로 판단해 배포를 진행할 수 없게 된다.

<br>



그리고, 모든 파일이 아닌 함수명만 따로 필터링을 해서 리스트업을 해야 하기 때문에 `grep`문을 추가로 사용한다

```shell
git diff --name-only  <이전커밋해시> <최신커밋해시> \
    | grep '^functions/'

# 결과
functions/example_functions/handler.py
functions/example_functions/logics.py
```

이렇게 하면, functions 디렉토리 아래에 있는 것만 필터링을 하게 된다. 여기까지는 좋지만, 이는 파일 루트 전체를 가져오기 때문에, 함수명이 작혀 있는 디렉토리 이름만 가져오게 한다.

```shell
git diff --name-only <이전커밋해시> <최신커밋해시> \
    | grep '^functions/' \
    | cut -d/ -f2

# 결과
example_functions
example_functions
```

* `cut`: 표준 입력 혹은 파일의 각 줄에서 특정 필드만 잘라낸다.
* `-d/`: 구분자를 `/` 로 지정한다. 문자열을 `/` 기준으로 분리하라는 의미이다.
* `-f2`: 분리된 필드 중, 두 번 째 필드를 선택한다. 현재 파일 구조가 `functions/<함수명>/<...>`로 되어 있고 함수명이 두 번 째에 있기 때문에 두 번 째 필드를 선택하는 것이 맞다.

이렇게 해서 함수명만 뽑아오는 건 성공했지만, 문제는 중복이 된다. 굳이 같은 함수를 여러번 배포 할 필요는 없으니, `sort -u`를 이용해 중복을 제거한다. 보통 줄 단위로 정렬하기 위해 `sort`를 사용하지만, 거기에 `-u`를 붙인다면 **중복된 줄을 하나만 남기게 할 수 있다.**

```shell
git diff --name-only <이전커밋해시> <최신커밋해시> \
    | grep '^functions/' \
    | cut -d/ -f2 \
    | sort -u

# 결과
example_functions
```

이 스크립트는 Github Action 스크립트에서 아래와 같이 사용할 수 있다.
```
    FROM=$github.event.before
    TO=$github.sha
    LAMBDAS=$(sh scripts/detect_function_changed.sh "$FROM" "$TO")
```

* `github.sha`: 현재 커밋의 SHA, 즉 현재 커밋의 해시값을 의미한다.
* `github.event`: 워크플로우를 발생시킨 이벤트를 의미. 즉 이벤트와 관련 정보를 담는다.
* `github.event.before`: 최근 커밋(github.sha) 직전의 커밋 해시값을 의미한다.

<br>


이렇게 코드가 변경/추가된 함수명들만 리스트 업을 할 수 있는 스크립트를 만들 수 있었고, 이를 이용해 굳이 명시를 하지 않아도 알아서 변경된 함수들을 감지해 배포를 진행할 수 있었다.


## Github Action 스크립트 작성허기

변경된 함수들을 추출할 수 있는 스크립트를 작성했으니, 이를 활용해 최종적으로 CI/CD를 구축학 위한 Github Action 기반의 스크립트를 작성하기만 하면 된다.

일단 Github Action 작동 과정은 아래와 같다

> AWS Configure 설정 -> 브랜치 종류에 따른 개발/운영 환경 설정 -> 변경된 람다 함수 확인 -> 배포 진행


### Github Action Script 초안 작성 + fetch-depth

```yml
name: Lambda Deploy

on:
  push:
    branches:
      - develop
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # diff 필수
```

일반적인 템플릿하고는 전체적으로 크게 차이가 없으나, `fetch-depth: 0` 문구가 추가되었다. 의미는 아래와 같다.

- `fetch-depth: n`: 상위 `n`개의 커밋 정보를 가져온다. 기본값은 1로, 가장 최근의 커밋 기록만 가져오는 것을 의미한다.
- `fetch-depth: 0`: 모든 히스토리를 가져온다. 주로 특정 커밋에 대한 diff를 진행할 때 사용한다.

최근 커밋과 직전 커밋만 비교하기 때문에 `fetch-depth: 2`로 충분해 보이기는 하나, 커밋 상황에 따라 문제가 생길 가능성이 높아 `fetch-depth: 0`으로 아예 전부 잡기로 했다. 0을 쓰는 것과 1~n을 쓰는 것 차이는 아직 확실히 알고 있는 정보가 없기 때문에 별도 리서치가 필요해 보이는 상황.


### AWS Configure 설정 - OIDC + iam role 기반

**AWS Secret Key 방식을 사용하지 않고, iam role 형식을 사용했다.** 일단 시크릿 키 자체가 어디 밖에 노출되어 있는 것부터 보안상 좋지 않고, Github Secret으로 안전하게 저장한다고 해도, 나중에 계정이 바뀌게 된다면, 일일히 관리해 줘야 한다. 적용 과정은 아래와 같다.

1. AWS IAM -> ID 제공업체 (Identity Provider)로 이동해 "공급자 추가"를 클릭하고 github 관련 정보를 추가한다.
    * OpenID Connect 선택
    * 공급자 URL (Provider URL): `https://token.actions.githubusercontent.com`
    * 대상 (Audience): `sts.amazonaws.com`
    ![](/assets/img/20260129/1.png)

2. 배포 작업에 AWS 서비스 사용을 허가받을 수 있게 iam role을 생성하고, 관련 내용을 적는다. 이때 Github Actions에서 AWS 서비스 사용을 허가해 주는 신뢰 관계(Trust Policy)와 람다 코드를 업데이트 할수 있게 권한(Permission)을 추가해야 한다.
    * 신뢰 관계(Trust Policy) JSON 코드
        ```json
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Federated": "arn:aws:iam::{유저ID}:oidc-provider/{공급자 URL}"
                    },
                    "Action": "sts:AssumeRoleWithWebIdentity",
                    "Condition": {
                        "StringEquals": {
                            "token.actions.githubusercontent.com:aud": "{공급자 대상}",
                            "token.actions.githubusercontent.com:sub": [
                                "repo:{Github Organization}/{Repo 이름}:ref:refs/heads/{운영 브랜치 이름}",
                                "repo:{Github Organization}/{Repo 이름}:ref:refs/heads{개발 브랜치 이름}"
                            ]
                        }
                    }
                }
            ]
        }
        ```
        * 유저ID: 일반 유저로 로그인 시, 나타나는 숫자
        * 공급자 URL: Identity Provider에서 설정한 공금자 URL. 여기서는 `https://token.actions.githubusercontent.com` 를 입력하면 된다.
        * 공급자 대상: Identity Provider에서 설정한 대상. 여기서는 `sts.amazonaws.com` 을 입력하면 된다.
    * 권한 (Permission) 코드
        ```json
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "VisualEditor0",
                    "Effect": "Allow",
                    "Action": "lambda:UpdateFunctionCode",
                    "Resource": ...
                }
            ]
        }
        ```
        * 권한 설정의 경우 `lambda:UpdateFunctionCode` 를 허가해 주면 된다.
        * Resource: 어느 함수를 배포하게 할 건지 리스트를 적상하는 칸이다. 만약, 소수만 제외하고 나머지는 전부 Allow 하고 싶으면, "Effect"를 "Deny"로 설정하고 Resource에 배제 대상 함수를 리스트업 하는 것도 방법이다.

3. Github Action의 최상단을 아래와 같이 수정한다.

    ```yml
    name: Lambda Deploy

    on:
      push:
        branches:
          - develop
          - main

    # AWS OCID 발급을 위한 퍼미션 설정 추가
    permissions:
      id-token: write
      contents: read
    ```

    * id-token: Github Actions 러너가 OIDC ID Token를 발급받을 수 있게 해준다. 이 OIDC를 통해 Secret Key 대신 AWS에 로그인 할 수 있게 해준다.
    * contents: 대상 레포지토리에 읽기 권한을 준다. 애초에 Github Actions에 레포지토리를 읽는것은 당연한 것이고 또 디폴트 값임에도 불구하고 굳이 명시하는 이유는, `permission:`     블록을 쓰는 순간. **명시된 권한만 허용하고 나머지는 최소한으로 내리려는 경향이 있기 때문이다.** 즉, `permission` 블록 사용으로 인해 read조차도 못하는 상황을 방지하기   위해서다.


4. 그리고 step 부분을 아래와 같이 작성한다.

```yaml
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::{유저ID}:role/{IAM ROLE 이름}
          aws-region: ap-northeast-2
```

### 브랜치 확인

앞서 언급했듯이, 나는 람다 개발 환경을 단독 "운영"에서 개발/운영으로 분리했다. 그렇기 때문에 현재 브랜치 상태에 따라 변경되는 함수의 접미사가 바뀐다(`*-dev`/`*-prod`). 이러한 이유로 브랜치 이름에 따라 개발 환경변수를 저장해야 했다.

```yaml
      - name: Set ENV # develop 브랜치 -> dev, main 브랜치 -> prod
        run: |
          if [[ "${GITHUB_REF}" == "refs/heads/develop" ]]; then
            echo "ENV=dev" >> $GITHUB_ENV
          else
            echo "ENV=prod" >> $GITHUB_ENV
          fi
```

* `GITHUB_REF`: Github Action을 실행했을 때의 현재 브랜치의 정보다. 
* `GITHUB_ENV`: 환경변수 저장용으로 주로 쓰는 "특수 파일 경로". `echo ENV=dev >> $GITHUB_ENV` 이런 식으로 저장하면, 다음 step에서 `$ENV`로 사용이 가능하다.

### 변경된 함수 확인

이전에 변경함수 감지용으로 작성했던 `detect_function_changed.sh` 를 활용한다. `github.sha`는 가장 최근의 커밋ID이고, `github.event.before`는 그 바로 직전의 커밋 ID이다.

```yaml
      - name: Detect changed lambdas
        id: detect
        run: |
          FROM="$github.event.before"
          TO="$github.sha"
          LAMBDAS=$(sh scripts/detect_function_changed.sh "$FROM" "$TO")
          if [ -z "$LAMBDAS" ]; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi
          echo "lambdas<<EOF" >> $GITHUB_OUTPUT
          echo "$LAMBDAS" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
```


`LAMBDAS=$(sh scripts/detect_function_changed.sh "$FROM" "$TO")`로 스크립트를 실행해서 변경된 람다함수 리스트를 `LAMBDAS`에 저장한다. 그 다음 `if [ -z "$LAMBDAS" ]` 분기문을 활용해 `has_changes`라는 변경 여부 변수를 생성하는데, 이때 if문이 `true`면, 변경된 함수 내역이 없다는 의미이므로 `false`를 입력하고, 반대로 `false`면 `true`를 입력한다.

그 다음, `LAMBDAS`와 `has_changes`를 저장할 때 `GITHUB_OUTPUT`이라는 변수에 저장을 하게 되는데, 이 `GITHUB_OUTPUT`은 현재 step 작업 중에서 나온 변수들을 다음 step으로 넘겨야 할때 사용되는 특수 파일이다. 얼핏 보면 `GITHUB_ENV`와 큰 차이가 없어 보이겠지만, `GITHUB_ENV`는 주로 환경변수를 저장하는 용도로 사용된다.


### 배포 진행하기

리스트업된 함수를 가지고 배포를 진행한다. 단, README.md 작성과 같은 코드 외 작업은 배포 작업이 굳이 필요 없기 때문에 `if`문을 사용해 `steps.detect.outputs.has_changes == 'true'`일 때만 해당 step이 작동할 수 있게 한다.


```yaml
        - name: Deploy lambdas
          if: steps.detect.outputs.has_changes == 'true'
          shell: bash
          run: |
            for lambda in ${{ steps.detect.outputs.lambdas }}; do
              scripts/deploy.sh $lambda $ENV
            done
```

# 개선점

1차 개선에 비해 개선 양은 줄었으나, 퀄리티는 꽤 깊은 편이다. **이제 완전한 배포 자동화를 구축했기 때문이다.**


|항목|개선 전|개선 후|
|---|---|---|
|배포 방식|노트북에서 커맨드 쳐서 배포하는 방식, 사람이 깜박하고 배포를 안하는 등 **휴먼 에러 발생 가능성 있음**|브랜치 merge 또는 push로 무조건 자동 배포. **휴먼 에러 대폭 감소**|
|배포 이력 여부|**X**, 특정 개발자의 노트북에서 진행하기 때문에 누가 배포 날짜를 직접 작성하지 않는 이상 이력이 자동으로 남지 않는다. 심지어 로컬에서 코드 일부 수정을 하고 배포해 버리면, 커밋 내용과 실제 코드가 달라저 알아보기 힘들다. |**O**, Gihtub의 merge 또는 commit 내역이 곧 배포 내역|


# 마치며

1차 개선 때 미처 하지 못했던 CI/CD 구축 작업은 한달이 지나고, 약 2일 정도의 작업을 통해 완전한 자동 배포 까지 이루어 냈다. 이제 어느 개발자든, 굳이 AWS Console을 사용하지 앟고, IDE와 commit 만으로 개발/배포를 할 수 있게 되었다. 그동안 Github Action을 최근에 제대로 써 본적이 없었는데, 이번 프로젝트를 통해 Github Action을 사용할 수 있는 기회를 가져본 것 같다.


## 그래도 아직 개선해야 할 점

하지만 아직 개선해야 할 점은 여전히 남아있다. 

### 공통 모듈 코드가 바뀌는 경우는 어떻게?

함수 내용이 바뀌는 것은 감지가 가능해 바로 배포 적용이 가능하지만, 함수 변경 없이 공통 모듈이 바뀌는 경우는 감지하지 못한다. 즉, 내부 모듈에 뭔가 내부적으로 로직은 변경을 해도 함수 내용이 바뀌지 않으면 반영이 안된다는 문제점을 가지고 있다. 사실 이런 케이스가 있을 때 어떻게 처리해야 할지 아직 설계중이라 해당 부분 까지는 구축하지 못했다. 아미 정책이 어느정도 정립이 되면 바로 진행하지 않을 까 싶다.


### 람다 Configuration도 코드레벨로?

코드 배포는 자동화가 이루어졌지만, 람다 Config 설정은 아직 AWS Console에서 그대로 진행한다. (예: permission 설정, 환경변수 설정 등). `terraform`으로 설정 마저도 코드화 할 수 있다고는 들었는데, 이것도 어떻게 할 지 고민중이다.


<br>

다음화: [AWS Lambda 개발환경 개선기 (2.5): 3편 포스팅 하기 전의 잠깐 회고](/aws/2026/04/14/aws-lambda-operation-2-1.html)