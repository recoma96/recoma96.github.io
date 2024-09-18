---
layout: post
title:  "시스템 정보 및 구조"
date:   2021-12-01 01:04:25 +0900
series: "Project Report: Microcloudchip"
summary: "프로젝트보고서: 시스템 구조"
tags: ["project", "system-structure", "design-pattern" ]
---

Micocloudchip-NATURAL은 크게 3개의 계층으로 작동합니다. 클라이언트로부터 직접 요청을 받고 이에 대한 응답을 하는 API Layer(3계층),  요청에 대한 작업을 수행하는 Manager Layer(2계층),  Database와 Disk에 직접 엑세스를 하여 저수준의 작업을 수행하는 Builder/Format Layer(1계층)이 있습니다. 해당 패이지는 3계층 서부터 시작하여 하향식으로 설명합니다.

---

# API Layer (3계층)

클라이언트로부터 Http Request를 직접 받고 response를 출력하는 Layer 입니다. 컨텐츠에 따라 요청 처리를 위해 **Manager Layer**로 요청 값을 전달합니다. url list는 urls.py에, view directory안에 API Layer가 작성되어 있습니다.

---

# Manager Layer (2계층)

API Layer로부터 받은 요청 데이터를 Builder/Format Layer의 객체들을 활용해 다시 API Layer에게 결과 값을 전달하는 중간 단계의 역할을 합니다. 컨텐츠에 따라 수행하는 Manager가 다릅니다. 일부 Manager는 Monitoring 작업을 수행하기 위해 Sub Thread를 생성하기도 합니다.

이들은 같은 Manager Instance가 두개 이상 생성되면 동시접근으로 인한 데이터의 손상이 발생하기 때문에 Singletone을 적용해 한개의 Instance만 생성되도록 구현되었습니다.

Manager들은 각 작업을 수행하다 보면 다른 Manager에게 작업을 요청해야 하는 경우가 있습니다. 그렇기 때문에 다른 Manager 객체를 이용해 작업을 수행할 수 있습니다. 대신 다른 Manager의 작업을 직접 수행하지 않습니다.

> **SOLID 기법**이란 객체지향 5대 원칙이라고도 하며 객체지향 계열의 가장 기본적인 디자인 패턴입니다. Manager들은 다른 Manager의 역할을 하지 않는다는 원칙은 **모든 클래스는 단 하나의 책임만을 가진다는 SRP(Single Responsibility Principle)에 해당됩니다.** 대신 다른 Manager의 작업이 필요할 때, 필요한 Manager Instance를 Parameter로 받아서 수행합니다. 하지만 그렇다고 해서 상대 Manager의 상태까진 바꾸지 않습니다.

이들은 DB와 Disk 직접 접근 Builder/Format Layer의 객체들을 생성하여 해당 객체들에게 접근 권한을 넘기기 때문에 **Manager Layer에서는 절대로 직접 접근을 하지 않습니다.**

## UserManager

* User 관련 정보를 관리합니다.
* 특정 사용자를 삭제할 때 사용자가 남긴 모든 데이터를 지워야 하기 때문에 Token Manager를 제외한 모든 Manager를 활용하여 데이터를 삭제합니다. 실제로 UserManager의 Method중 하나인 delete_user의 parameter에서는 StorageManager와 ShareManager가 있습니다. [코드 참고](https://github.com/SweetCase-Cobalto/microcloudchip-natural/blob/master/app/server/module/manager/user_manager.py)

```python
def delete_user(self, req_static_id: str, target_static_id: str,
    storage_manager: StorageManager, share_manager: ShareManager):
```

## StorageManager

* 파일 및 디렉토리를 관리합니다.
* 파일 및 디렉토리를 삭제할 경우 해당 오브젝트에 걸려있는 플래그(공유 여부)등을 제거하기 위해 다른  Manager의 기능을 빌려서 작업합니다. 예를 들어 공유된 파일을 삭제할 때, 공유 정보를 DB에서 삭제하기 위해 ShareManager를 활용합니다.


## ShareManager

* 0.1.0.beta1에 파일 공유 기능을 개발하기 위해 새로 구현된 Manager 입니다.
* 공유 설정 / 공유 해제 기능을 수행합니다.
* SharedID를 이용해 해당 파일의 공유 여부를 판단합니다.
* 공유된 파일은 일정 기간이 지나면 자동으로 해제해야 합니다. 이를 모니터링 하기 위해 Sub Thread를 생성해서 따로 관리합니다.

## Token Manager

* 인증 보안을 담당합니다.
* JWT를 이용해 작업하며 사용자로부터 Token을 받으면 이를 복호화 한 다음 알맞은 데이터가 들어있는 지 확인함으로써 인증 여부를 확인합니다.
* 주로 API Layer들이 작업하기 전 Token이 인증이 된 Token인지 확인하기 위해 Pre-Processing을 진행합니다.
* 실제로 사용할 때는 Decorator를 이용합니다. (아래 페이지 참고)

## InternalDatabaseConcurrencyManager

* SQLite 버전일 경우 안전한 동시성 DB 접근을 위해 threading.Lock()을 활용하여 구현된 특수 Manager 입니다.
* 주로 DB에 접근하는 메소드에 Decorator Method로 선언해서 사용합니다.
* MySQL(MariaDB) 버전에서는 작동하지 않고 무시됩니다.
* 자세한 내용은 아래 페이지를 참고해 주세요

# Builder/Format Layer (1계층)

가장 밑에 있는 계층이며 외부 요소들을 직접 엑세스 해서 작업합니다. Manager Layer에 의해서 생성되어 작업을 수행하고 이에 대한 결과값을 Manager Layer에 전달합니다. 하나의 Manager가 여러 개의 Builder/Format을 사용하기 때문에 Manager Layer와는 달리 Singletone이 적용되지 않습니다.

데이터를 생성하거나, 상태를 수정 또는 소멸하는 작업을 합니다.

오로지 자기 자신이 해야 할 일만 합니다. 같은 계층의 다른 객체의 상태를 변경하지 않고, Manager Layer처럼 다른 객체를 parameter로 활용하여 작업 요청을 하지 않으며 어느 다른 객체의 영향조차도 받지 않는 격리된 상태에서 자기 자신의 작업만 수행하고 소멸됩니다.

> File/Directory Data와 Shared Data의 관계에서 공유된 파일을 삭제되었을 경우를 예로 들을 수 있는데, Manager Layer일 경우 Storage Manager가 공유된 파일을 삭제할 때 Storage Manager는 Shared Manager를 parameter로 받아 먼저 파일이 공유 되어있는지 확인한 다음 공유가 되어있으면 공유부터 해제한 다음 파일을 삭제합니다. 이렇게 **Storage Manager**는 **Shared Manager의 기능을 빌려 공유된 파일을 삭제할 때 공유 해제 작업도 수행합니다.**
> 그러나 Builder/Format Layer 에서는 공유된 "파일"의 파일 정보를 갖고 있는 FileData(Format) 객체는 소멸할 때 **File 데이터만 삭제하고 DB의 Shared table에 접근해서 공유 해제를 하지 않습니다.** 그 이유는 공유 데이터 관리 작업은 SharedData가 할 일이기 때문에 공유 작업 까지 진행 하지 않습니다. 반대로 SharedData도 스토리지에 존재하지 않는 파일의 이름도 공유 지정을 할 수 있습니다.
> 이러한 특징 때문에 Code Test 항목에서도 기술되어 있듯이 Builder/Format Layer의 Test Code에서는 데이터 동기화의 일부분을 예외처리 하지 않고 그냥 넘기는 식으로 진행하고 있습니다.
> 이렇게 되면 데이터 간의 싱크가 안맞지 않냐는 문제가 제기될 수 있지만 뭐, 상관없습니다. 왜냐하면 Manager Layer에서 여러 Builder, Format을 적절히 조합하여 작업하기 때문에 실제 어플리케이션 작동에는 문제가 없습니다.

SQLite를 사용할 경우 외부 리소스를 직접 접근하기 때문에 병행성 처리를 위해 InternalDatabaseConcurrencyManager의 Thread Lock 영향을 받습니다.

데이터를 생성하는 Builder와 데이터의 정보를 수정 또는 소멸(삭제)하는 Format이 있습니다.

## Builder
* 데이터를 생성합니다.
* Java에서 많이 사용하는 Builder Pattern과 유사합니다. Builder Class의 set method는 자기 자신을 return하기 때문에 아래 코드처럼 Method Chaining이 가능합니다. 참고

```python
# 업로드
        # 이 단계에서 발생한 예외들은 바로 송출
        try:
            # File Upload를 위한 Builder 생성 및 저장
            file_builder = FileBuilder()
            file_builder.set_system_root(self.config.get_system_root()) \
                .set_author_static_id(target_static_id) \
                .set_target_root(target_root) \
                .set_raw_data(raw_data).save()
        except Exception as e:
            raise e
```

## Format
* 데이터의 상태를 수정 또는 소멸합니다.
* call() 함수를 사용하여 데이터를 검색합니다. 
    * ``` d: DirectoryData = DirectoryData(src_root)() ```
* update()를 이용하여 상태를 변경하고 delete() 또는 remove()를 이용하여 데이터를 소멸합니다.