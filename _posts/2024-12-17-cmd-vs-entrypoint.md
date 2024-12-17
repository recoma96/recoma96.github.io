---
layout: post
title:  "CMD vs ENTRYPOINT"
date:   2024-12-17 09:00:00 +0900
categories: "Docker"
summary: "CMD와 ENTRYPOINT 사이의 미묘한 차이"
tags: ["docker", "dockerfile"]
image: ""
---

# 개요

CMD는 Docker Container가 돌아갈 때 실행하는 명령어이다. 예를 들어 Django 기반의 서버 컨테이너를 띄운다고 한다면 CMD는 아래와 같을 것이다.

```dockerfile
CMD ["python", "manage.py", "runserver"]
```

ENTRYPOINT도 마찬가지로 전체적으로 봤을 땐 CMD와 비슷하다. 사용법은 아래와 같고 결과는 일단 CMD와 일치하다.

```dockerfile
ENTRYPOINT ["python", "manage.py", "runserver"]
```

두 개의 기능 차이가 거의 없다 보니, 나 같은 경우에는 아무 생각없이 이 두개를 혼용해서 사용해 왔다. 하지만 이 둘 사이에는 미묘한 차이가 있고 상황에 따라 써야 하는 경우가 다르다.

# CMD

컨테이너가 실행되는 Default 명령어이다. 즉 필요하면 CMD 내용을 바꿀 수 있다. 아래와 같은 DockerFile이 있다고 가정해 보자.

```dockerfile
FROM ubuntu
CMD ["echo", "Hello, World!"]
```

DockerFile을 이미지로 빌드하고 아래와 같이 인자값으로 `ls -al` 를 추가하면 `Hello, World`가 아니라 현재 위치의 디렉토리가 출력된다.

```shell
$ docker run --name example example ls -al
total 56
drwxr-xr-x   1 root root 4096 Dec 16 08:26 .
drwxr-xr-x   1 root root 4096 Dec 16 08:26 ..
-rwxr-xr-x   1 root root    0 Dec 16 08:26 .dockerenv
lrwxrwxrwx   1 root root    7 Apr 22  2024 bin -> usr/bin
drwxr-xr-x   2 root root 4096 Apr 22  2024 boot
drwxr-xr-x   5 root root  340 Dec 16 08:26 dev
drwxr-xr-x   1 root root 4096 Dec 16 08:26 etc
drwxr-xr-x   3 root root 4096 Nov 19 09:50 home
lrwxrwxrwx   1 root root    7 Apr 22  2024 lib -> usr/lib
drwxr-xr-x   2 root root 4096 Nov 19 09:44 media
drwxr-xr-x   2 root root 4096 Nov 19 09:44 mnt
drwxr-xr-x   2 root root 4096 Nov 19 09:44 opt
dr-xr-xr-x 231 root root    0 Dec 16 08:26 proc
drwx------   2 root root 4096 Nov 19 09:50 root
drwxr-xr-x   4 root root 4096 Nov 19 09:50 run
lrwxrwxrwx   1 root root    8 Apr 22  2024 sbin -> usr/sbin
drwxr-xr-x   2 root root 4096 Nov 19 09:44 srv
dr-xr-xr-x  11 root root    0 Dec 16 08:26 sys
drwxrwxrwt   2 root root 4096 Nov 19 09:50 tmp
drwxr-xr-x  11 root root 4096 Nov 19 09:44 usr
drwxr-xr-x  11 root root 4096 Nov 19 09:50 var
```

`docker inspect example` 로 Docker 정보를 살펴보면 `Cmd` 부분에는 `ls -al`로 바뀌어 있고, Path와 Args 역시 `ls -al`로 바뀌어 있다.

```shell
$ docker inspect example
... 이하 생략 ...
        "Path": "ls",
        "Args": [
            "-al"
        ],
... 이하 생략 ...
            "Cmd": [
                "ls",
                "-al"
            ],
            "Entrypoint": null,
```

이렇게 CMD는 명령어를 실행하긴 하지만 언제든지 인자값을 추가함으로써 명령어를 변경할 수 있다. 하지만 ENTRYPOINT는 경우가 다르다.

# ENTRYPOINT

CMD와는 달리 인자가 바뀔 수 없고 무조건 ENTRYPOINT에 기재된 내용대로 컨테이너가 실행된다. 즉, CMD처럼 `ls -al` 를 입력했다고 해서 디렉토리 리스트가 나오지 않는다.

```shell
$ docker run --name example example ls -al
Hello, World! ls -al
```

여전히 `Hello World`! 가 나오고, 바로 옆에 `ls -al` 가 출력되었다. `docker inspect exmaple` 를 입력해서 도커 컨테이너 정보를 알아보자.
```shell
$ docker inspet example
... 이하 생략 ...
        "Path": "echo",
        "Args": [
            "Hello, World!",
            "ls",
            "-al"
        ],
... 이하 생략 ...
            "Cmd": [
                "ls",
                "-al"
            ],
            "Entrypoint": [
                "echo",
                "Hello, World!"
            ],
```

밑에 보면 Cmd에는 변경된 명령어 `ls -al` 이 적혀있지만, Entrypoint의 명령어가 먼저 나왔다. Path는 `echo`로 변함이 없는데, Args에서는 `Hello, World!` 뒤로 `ls`와 `-al`이 추가되었다.

따라서 ENTRYPOINT에서는 인자를 추가하면 명령어 자체가 바뀌는게 아니라 입력한 인자값이 ENTRYPOINT 내용의 뒤로 간다.

# 두개 혼용하기 

CMD와 ENTRYPOINT 두개를 활용할 수도 있다. ENTRYPOINT는 컨테이너 실행부로 사용하고, CMD는 Default 인자값으로 사용할 수 있다. 이렇게 되면 `docker run`으로 컨테이너 실행시, 추가 인자값이 없으면 CMD에 있는 내용이 인자값으로 들어가고, 인자값을 추가하면 그 추가된 인자값이 CMD를 대신한다. 이렇게 해서 컨테이너 실행을 좀더 유연하게 할 수 있다.

```dockerfile
FROM ubuntu
ENTRYPOINT ["echo"]
CMD ["Hello, World!"]
```

```shell
$ docker run --name example example
Hello, World!

$ docker run --name example example 'Hello, Docker!'
Hello, Docker!
```