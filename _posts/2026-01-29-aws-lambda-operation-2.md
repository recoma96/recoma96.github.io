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

### 지난 이야기 요약 ([AWS Lambda 개발환경 개선기 (1): 콘솔에서 탈출하다](/aws/2026/01/22/aws-lambda-operation.html))

* AWS Lambda의 Python3.9 런타임 종료(EOL) 대응 과정에서, 다른 툴이나 자동화 없이 순수 AWS Console 상에서 코드를 작성하는 방식의 람다 개발 환경이 문제가 있다고 판단함.
* Console 기반에서 GIT + CLI 기반 개발환경으로 변경
* Github에서 코드 이력을 볼 수 있고, DB ORM 코드 모듈화로 SQL대신 ORM 코드를 람다에 사용할 수 있는 등, 개발 안정성이 생김
* 하지만, 특정 함수 배포 시, 관련없는 다른 함수들이 같이 패키징되는 문제, CI/CD 미구축 등 개선해야 할 점이 아직도 남아있음

# 개요

한달 전, 나는 기존 사내에서 람다를 개발하던 방식이 상당히 비효율적이라고 느껴, 일부 개선을 진행한 적이 있었다. 람다 코드를 Github로 이전해, 다른 개발자들이 쉽게 볼 수 있게 했고, 로컬 노트북에서 Shell Script만 실행하면 바로 배포되는 구조를 구축했다.

# 본론

## 함수 배포시 관련없는 함수들 까지 같이 패키징 되는 문제 해결

## Github Action 기반의 CI/CD 파이프라인 구축


# 마치며

