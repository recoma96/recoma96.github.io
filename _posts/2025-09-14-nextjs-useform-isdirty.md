---
layout: post
title:  "React Hook Form 자동 저장 기능, isDirty로 완성도 높이기"
date:   2025-09-14 12:00:00 +0900 
categories: "Frontend"
summary: "사용자가 form을 직접 건드렸는지 까지 확인이 가능한 RHF... 안 쓸 수가 없잖아?"
tags: ["nextjs", "react", "frontend", "useForm"]
image: ""
---


# 배경

## 등산 코스 편집기와 자동 저장 기능

요즘 사이드 프로젝트로 등산/트레킹 코스 가이드 서비스 개발을 구상하고 있고, 이번에 개발한 [등산 코스 안내서 자동 생성기](https://github.com/recoma96/trail-course-guide)는 이번 프로젝트의 초석이 될 서브 프로젝트이다.

이 웹서비스의 기능은 사용자가 GPX 파일을 업로드하면, 이를 기반으로 코스 정보를 편집하고, 이에 따른 최종 안내서를 보여주며, 필요시 PNG 그림파일 다운로드 까지 해준다.

코스 정보를 편집하는 양은 많기에, 편집을 할 때마다 별도의 작업 없이 0.5초에 스토어로 자동 저장을 하게 했고, 갑작스런 사고로 인해 브라우저가 완전히 닫혀, 다시 작성해야 하는 사고를 예방하기 위해, localStorage에 영구저장할 수 있게 개발을 했다. 이러한 기능을 구현하기 위해 react-hook-form(useForm)의 watch API와 useEffect를 사용해 구현했다.

```typescript
// 변경사항 있으면 저장 (RHF -> Store 복사)
useEffect(() => {
  const sub = form.watch((values) => {
    // 디바운스
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // ...자동 저장 로직 실행
      saveCourse({ ... });

      // 저장 완료 토스트 실행
      setIsSaveComplete(true);
    }, 500);
  });
  return () => sub.unsubscribe();
}, [form, saveCourse]);

  // 저장 완료 여부 값에 대한 텍스트 노출 처리
  useEffect(() => {
    if (isSaveComplete) {
      saveDoneTimerRef.current = setTimeout(() => {
        setIsSaveComplete(false);
      }, 1000);
    }

    return () => {
      if (saveDoneTimerRef.current) clearTimeout(saveDoneTimerRef.current);
    }
  }, [isSaveComplete]);
```

# 이슈

## 페이지에 들어오자마자 "자동저장 완료"

기능 구현 후 테스트를 하는데 이상한 점을 발견했다. 페이지에 접속하거나 새로고침 하자마자, 아무런 입력도 하지 않았는데 "자동저장 완료" 메시지가 뜨는 것이었다.

원인은 `useEffect` 내의 `form.watch` 콜백이 컴포넌트가 처음 렌더링되고 react-hook-form이 초기값을 설정할 때도 실행되었기 때문이다. 즉, 사용자의 입력이 아닌, **초기 데이터 로딩(Hydration) 과정에서 watch가 트리거되어 저장 로직과 setIsSaveComplete(true)가 실행된 것이다.**

# 1차 시도

## useRef 플래그로 첫 실행 막기

가장 먼저 떠오른 해결책은 useRef를 사용해 플래그를 만들어서 초기값을 `true`로 설정하고, `watch` 콜백이 처음 실행될 때는 저장 로직을 건너뛰고 플래그를 `false`로 바꾸는 방식을 생각했다.

```typescript
const isFormFirstSetting = useRef(true);

useEffect(() => {
  const sub = form.watch((values) => {
    // 첫 실행 시에는 무시
    if (isFormFirstSetting.current) {
      isFormFirstSetting.current = false;
      return;
    }

    // 디바운스 및 저장 로직...
    // ...
    setIsSaveComplete(true);
  });
  // ...
}, [/* ... */]);
```

이 방식은 논리적으로는 맞지만, 실질적으로 또 다른 문제가 발생하게 된다.

# 또 다른 문제

## React 개발 모드의 이중 렌더링

원인을 파악하기 위해 리서치를 해보니, **React의 개발 모드에서는 `StrictMode`가 기본적으로 활성화되어 있다는 것을 알게 되었다.**
`StrictMode`는 잠재적인 문제를 개발자가 쉽게 찾을 수 있도록, useEffect와 같은 특정 함수들을 의도적으로 두 번 실행한다.

나는 처음에는 도대체 왜 이 기능이 디버깅하는데 도움이 되는지 의문이 들었는데. 여러번 리서치 해 보니 그럴만한 이유가 있었다.
`useEffect`는 컴포넌트가 마운트될 때 실행되고, 클린업(cleanup) 함수를 통해 언마운트될 때 정리되어야 한다. 
`StrictMode`는 이 과정을 (마운트 -> 언마운트 -> 마운트)처럼 두 번 실행함으로써, 개발자가 클린업 로직을 빠뜨렸을 때 발생하는 버그(메모리 누수, 중복된 구독 등)를 조기에 발견하도록 지원을 한다.
즉, 어떤 `useEffect`라도 두 번 실행되어도 문제가 없도록 강제하여 더 견고한 코드를 작성하게 만드는 것이다.

여기에서 작성된 코드에서는 이런 일이 벌어졌다.

1. 첫 번째 렌더링: `useEffect` 실행. `isFormFirstSetting.current`는 `true`이므로 저장 로직을 건너뛰고 `false로` 변경됨.
2. 두 번째 렌더링: `useEffect가` 다시 실행됨. 이때 i`sFormFirstSetting.current`는 이미 `false`이므로, 저장 로직이 실행되어 "자동저장 완료" 메시지가 뜨게 됨.

결국 `useRef` 플래그 방식은 `StrictMode` 환경에서는 무용지물이었다.

# 2차 시도 (최종해결)

## form.formState.isDirty 로 form 수정 여부 확인

근본적인 문제는 **'초기 렌더링'과 '사용자의 실제 입력'을 구분하지 못하는 것이었다.**
`StrictMode`에서도 해결 가능한 방법이 있는지 리서치를 했고. 그 결과, `form.formState.isDirty`라는 변수를 발견했다.
`isDirty`는 클라이언트가 폼의 필드를 하나라도 직접 수정했을 때 `true`가 되는 `boolean` 값이다. `reset`과 같이 프로그래밍 방식으로 폼의 값을 변경할 때는 `false`를 유지한다. 즉, 사용자가 직접 폼을 건드렸는지 여부를 알려주기 때문에, 초기 데이터 로딩과 사용자 입력을 명확하게 구분할 수 있었다. 기존의 분기 조건에 `!form.formState.isDirty`를 추가하여 이 문제를 해결할 수 있게 되었다.

```typescript
useEffect(() => {
  const sub = form.watch((values) => {
    // 하이드레이션이 끝나지 않았거나, 사용자가 직접 폼을 수정하지 않았다면 무시
    if (!hasHydrated.current || course.segments.length < 1 || !form.formState.isDirty) {
      return;
    }

    // 디바운스 및 저장 로직...
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCourse({ ... });
      setIsSaveComplete(true);
    }, 500);
  });

  return () => {
    sub.unsubscribe();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }
}, [form, course.segments, saveCourse]);
```

# 후기

지금 까지 React나 NextJS 관련 개발을 하면서 에디터 관련 개발을 했을 때 일반 form태그를 사용하고, 단순히 `onChange`, `submit` 만 사용해왔다. 하지만 React 계열에서 form 관련 개발을 할때는 react-hook-form (useForm) 을 사용하는게 좋다는 조언을 받아, 이번 프로젝트에 처음으로 사용하게 되었다.

react-hook-form은 단순히 폼의 상태를 관리하는 것을 넘어, formState 객체를 통해 `isDirty`, `isValid`, `errors` 등 폼의 현재 상태를 매우 정밀하게 추적할 수 있다는 점이 인상 깊었다.

특히 `isDirty`는 이번 문제처럼 프로그래밍에 의한 값 변경과 사용자의 직접적인 입력을 구분해야 하는 복잡한 시나리오에서 매우 유용했다. 수동으로 플래그를 관리하는 방식보다 훨씬 선언적이고 안정적인 코드를 작성할 수 있었다. 

비록 사용을 하게 된지 얼마 되지 않았기에, 아직 관련해서 배워야 할 게 많긴 하지만, 그래도 계속 유용하게 사용할 수 있을 것 같다.

# 기타

아래는 useForm을 이용해 실제로 구현한 프로덕트의 스크린 샷이다.

![](/assets/img/20250914/1.png)