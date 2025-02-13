---
layout: post
title:  "WARNING: Found orphan containers (***) for this project."
date:   2025-02-13 11:30:00 +0900
categories: "Docker"
summary: "도커 컨테이너가 고아(orphans) 되었다구요..? 말이 너무 심한거 아니에요??"
tags: ["docker", "issue"]
image: ""
---

내가 사내에서 운영하고 있는 서버의 Docker Container구조는 크게 "backend server", "celery", "celerybeat"가 있다.
그리고 이 동일한 서버가 두대가 있고 그 위에 ALB가 배치되어 있다. 그렇다면, 결국 celerybeat가 두개 돌아간다는 뜻이 되는데, 
이렇게 되면 완전 동일한 batch process가 두번 중복되어 작동한다는 뜻이 된다. 이는 즉 리소스 낭비 부터 시작해서 서비스 이슈 까지 
발생할 가능성이 있기 때문에 서버 두개 중 하나만 "celerybeat"를 빌드를 해야 했다. (_가장 확실한 방법은 기존 서버 두대에서 Celerybeat와 Celery를 제외시키고 
서버를 하나 더 대여해서 그곳에 빌드를 하는 것인데. 비용 이슈도 있고, 오늘 포스팅은 그게 주제가 아니라서 패스_)

<br>

그래서 서버에 직접 접속을 해서 `docker-compose` 파일에서 container 목록 중에 celerybeat를 제거했다.

```yaml
version: '3'
services:
  app:
    container_name: backend
    restart: always
  worker:
    container_name: worker
    restart: always
  beat: <- 얘 삭제
    container_name: beat
    command: sh run_celerybeat.sh
    restart: always
```

그리고 빌드를 하기 위해 아래와 같은 명령어를 입력했다.

```shell
$ docker-compose -f docker-compose.yml up -d
```

그랬더니 아래와 같은 경고문과 함께 **celery beat 컨테이너가 소멸되지 않았다.**

```shell
WARNING: Found orphan containers (beat) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up.
```

"orphans"는 한국어로 번역하면 "고아" 라는 뜻이다. 즉, 고아 상태의 컨테이너를 발견했다는 것인데. **docker compose 파일에는 없는 컨테이너가 OS상에서 발견되었다는 뜻이 된다.**

<br>

당연히 다음 빌드시 대상 컨테이너를 지워야 하는데 방법은 간단하다. 아까 빌드 명령어에 `--remove-orphans` 플래그를 추가하면 된다.

```shell
$ docker-compose -f docker-compose.yml up -d --remove-orphans
```