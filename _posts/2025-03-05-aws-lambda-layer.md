---
layout: post
title:  "AWS Lambda Layer 활용해 보기 (Python 기준)"
date:   2025-03-05 11:30:00 
categories: "AWS"
summary: "람다에 코드 복붙은 이제 그만 ㅠ"
tags: ["aws", "lambda"]
image: ""
---

# 개요

Lambda Function은 주로 Serverless API를 구현할 때 사용된다. 말 그대로 Serverless이기 때문에 API 작동에 필요한 모든 인프라 세팅은 AWS가 담당하고 개발자는 그저 코딩만 하면 구조다.
그래서 이러한 편의성 덕분에 단순 API부터 배치 프로세스 까지 다양한 용도로 활발하게 사용이 되고 있다.
그런데 하나 단점이 있다면, 외부 모듈(라이브러리) 사용을 위한 설치인데, 일반적인 개발환경에서는 `pip` 같은 패키징 관련 앱을 통해 라이브러리 설치가 가능하고, 앱 빌드에 사용되는 `docker`, `github action` 등에서도
배포 프로세스에 개발자가 라이브러리를 설치하는 코드를 추가할 수 있지만, **Lambda Console에서는 직접 라이브러리 설치가 불가능하다.** 대신 **`Lambda Layer` 를 사용해야 한다.**

# AWS Lambda Layer

`Lambda Layer` 는 AWS Lambda에서 사용하는 모듈 단위로, pymysql이나, requests 같은 외부 모듈 또는 공통으로 사용하는 모듈들은 Lambda에서 Layer 단위로 되어 있다.
이러한 모듈들을 사용하기 위해서는 Lambda Function에 Layer를 추가해야 한다.

## 외부 라이브러리 추가하기

http 요청 모듈은 requests 라이브러리를 설치한다고 가정한다.

1. 람다 콘솔에서 스크롤을 쭉 내려 Layers 항목을 확인하고 "Add Layer" 버튼을 누른다.
![](/assets/img/20250305/1.png)


2. AWS Layers가 아닌 Specity an ARN을 선택한다. AWS Layers에서는 requests 관련 모듈이 없기 때문이다.
![](/assets/img/20250305/2.png)

3. 그러나 requests 모듈이 정확히 어떤 ARN을 가지는지 바로 알 수가 없다. 하지만 파이썬의 경우, 다행히도 파이썬 버전에 따라 사용 가능한 라이브러리의 ARN을 나열한 사이트가 있기 때문에 거기서 찾으면 된다.
   * [Python3.12 에서 사용가능한 ARN 리스트](https://github.com/keithrozario/Klayers/tree/master/deployments/python3.12)
   * [Klayer Github Repository](https://github.com/keithrozario/Klayers?tab=readme-ov-file)

   
    > 아무리 찾아봐도 없다면 직접 대상 모듈을 다운로드받고 압축한 다음에 AWS에 업로드해서 사용하는 방법도 있다.

![](/assets/img/20250305/3.png)

4. ARN을 입력하고 "verify" 버튼을 클릭해 이 ARN이 제대로 되어있는지 검증한다. 아래와 같이 패키지 정보가 보이면 검증에 통과되었다는 의미로 "Add" 버튼을 클릭해 레이어를 추가하면 된다.
![](/assets/img/20250305/4.png)


5. 다시 람다 콘솔로 돌아가서 해당 라이브러리를 임포트해 사용을 해 본다. 정상적으로 임포트가 되었다면 레이어 추가에 성공한 것이다.


## 직접 라이브러리를 구현해서 추가하기

여러 Lambda를 구현하다 보면, 공통로직을 복붙하는 일이 한번씩은 생길 것이다 _(예를 들어 데이터베이스 접속 로직 이라던가)_. 일반적인 개발환경이라면 공통모듈 전용 파일을 만들고 그 안에 API들을 구현해 재활용할 수 있지만. Lambda들 사이에는 안타깝께도 그렇게 할 수가 없다. 이러한 문제를 해결하기 위해 Layer가 사용되기도 한다.


1. 모듈을 구현한다. 이때 디렉토리는 아래와 같아야 한다.
   ```
   /package-name
   `-/python
        `-/package-name
            `-__init__.py
        `-requirements.txt
   ```

2. zip 파일로 압축을 한다. 이때 압축 위치는 최상위 디렉토리가 아닌 **python 디렉토리가 되어야 한다.**
3. AWS 콘솔에서 Lambda > Layers로 들어간다. 여기서 "Create Layer" 버튼을 클릭한다.
![](/assets/img/20250305/5.png)

1. 여기서 패키지 이름과 압축파일 python.zip을 올려서 레이어를 생성한다.
![](/assets/img/20250305/6.png)

1. 생성에 성공하면 아래와 같은 화면이 표시되는데 여기서 Version은 말 그대로 해당 모듈의 버전으로, 다시 추가로 코드를 작성해서 업로드를 하면 이 Version이 올라간다.
![](/assets/img/20250305/7.png)

1. 해당 레이어를 사용할 람다 콘솔로 돌아가서 레이어를 추가한다. "Custom Layers" 항목을 클릭하고 아까 새로 만들었던 레이어의 이름과 버전을 선택한다.
![](/assets/img/20250305/8.png)


7. 정상적으로 적용되었는지 임포트에서 사용해본다.


# 활용

### Lamda에서 AWS Secrets Manager의 환경변수 가져오기

Lambda상의 환경변수는 Configuration > Environment variables탭에서 직접 추가가 가능하다. 그러나 AWS 기반 인프라를 구축하다 보면 데이터베이스 접속 계정같은 공통 환경변수들을 Secrets Manager에 보관하는 경우가 있기 때문에 그쪽으로 접근해야 할 때가 있다. 그러나 boto3로 빈번하게 접근하면 이게 다 비용으로 나기기 때문에 일부는 boto3 대신 아래 이름의 확장팩을 사용하는 경우가 있다.

```
AWS-Parameters-and-Secrets-Lambda-Extension
```

해당 layer는 환경변수를 가져온 다음 람다 내부에 캐싱을 해서 다음에 다시 가져올때 로컬 내 캐싱된 데이터만 가져오게 함으로써 접근 비용을 절약할 수 있다. 단, boto3 모듈을 사용하는 게 아니라 HTTP통신을 해야 한다. [사용법 참고](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html)