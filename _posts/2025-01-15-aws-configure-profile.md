---
layout: post
title:  "AWS Configure 여러개로 관리하기 "
date:   2025-01-15 14:00:00 +0900
categories: "AWS"
summary: "AWS 계정이 여러개 있다면 AWS Configure 에서는 어떻게 관리를 하지?"
tags: ["aws", "iam", "aws_configure"]
image: ""
---

# 개요

내가 다니고 있는 회사에는 두 개의 서비스를 관리하고 있고, 각 서비스 마다 서로 다른 AWS 계정을 가지고 있다.
나는 두 개의 서비스 중 하나는 전체 관리를 다른 하나는 일부 참여를 하고 있기 때문에 두 개의 AWS 계정을 사용해야 했다.
개발을 로컬에서 하기 때문에 어쩔 수 없이 AWS Configure를 사용해야 하는데, 매번 다른 서비스를 개발할 때마다 일일이 AWS 정보를 입력해야 하는게 여간 귀찮은게 아니다. 
그래서 리서치 결과 `aws configure profile`이라는 게 있다는 것을 알았다.

# aws configure --profile

프로필을 생성방법은 아래와 같다.

```shell
$ aws configure --profile <ProfileName>
AWS Access Key ID [********************]:
AWS Secret Access Key [********************]:
Default region name [ap-northeast-2]:
Default output format [json]:
```

<br>

그리고 아래와 같은 명령어로 s3를 불러올 수 있다.
```shell
$ aws s3 ls --profile <ProfileName>
```

<br>

아래의 명령어로 프로파일의 정보를 출력할 수 있다. 아, 물론 엑세스 키와 시크릿 키는 당연히 마스킹 되어 있다.

```
$ aws configure list

      Name                    Value             Type    Location
      ----                    -----             ----    --------
   profile                <not set>             None    None
access_key     ****************xxxx shared-credentials-file    
secret_key     ****************xxxx shared-credentials-file    
    region           ap-northeast-2      config-file    ~/.aws/config
```


그런데 Pycharm 또는 VSCode IDE에서 사용할 경우 어느 Profile을 사용할 건지 고정을 하고 사용해야 한다. 이때는 환경변수로 세팅을 해서 사용한다.

```shell
export AWS_DEFAULT_PROFILE=<ProfileName>
```