---
layout: post
title:  "React 에서 useForm과 zustand를 조합해 본 후기"
date:   2025-09-08 16:00:00 +0900 
categories: "React"
summary: "useForm과 zustand의 조합"
tags: ["frontend", "react", "zustand", "useForm"]
image: ""
---

# 개요

![](/assets/img/20250910/1.png)



최근 등산 및 트레킹 가이드 서비스를 개발하는 프로젝트를 진행하고 있다. 그중에서도 코스 정보를 입력받아 그 결과를 UI로 보여주고, PDF 또는 이미지 파일로 출력하는 NextJS 기반의 서브 프로젝트를 구현하고 있다.

이 서브 프로젝트에서 개발될 가이드 UI는 앞으로 진행할 메인 프로젝트의 초석이 될 것이고, 내가 매번 등산 관련 블로그를 작성할 때마다 일러스트레이터와 포토샵으로 몇 시간씩 걸려 작업하던 과정을 자동화하여 대체할 수 있을 것이다.

현재 진행상황(블로깅 시점)은 입력부만 만든 상태이고, 아직 가이드 UI와 프린팅 기능은 아직 구현이 안됐다. Form과 RHF(React Form Hook) 사이의 통신을 하면서 많이 고전은 했는데, 문제를 해결하면서 얻은 정보들을 간단히나마 공유하고자 한다.


## 요구사항

입력부를 개발할 때 요구되는 사항은 아래와 같다.

1. input 태그를 통해 입력된 정보들은 브라우저를 닫았다 다시 켜도 보존되어야 한다.
2. 입력시 자동저장이 되게 해야 한다.

이러한 요구사항을 만족하기 위해 1번의 경우 상태값을 저장하는 zustand를 사용함과 동시에 영구저장이 되어야 하므로 persist 기능을 추가했고, 2번의 경우 setTimeout과 Devounce를 사용했다.

---

# 본문


## useForm (React Hook Form)을 사용하는 이유

과거 React 프로젝트에서는 각 `input` 필드마다 `useState`를 사용해 상태를 관리하는 경우가 많았습니다. 이 방식은 코드가 길어지고, 입력값이 변경될 때마다 리렌더링이 발생하여 성능 저하를 유발할 수 있습니다.

`react-hook-form` (RHF)은 이러한 문제를 해결하기 위한 라이브러리로, `useForm` 훅을 통해 폼(Form)의 상태 관리, 유효성 검사, 제출 처리 등을 효율적으로 다룰 수 있게 해줍니다.

주요 사용 이유는 다음과 같습니다.

1.  **성능 최적화**: RHF는 비제어 컴포넌트(Uncontrolled Components)를 기반으로 동작합니다. 사용자가 입력할 때마다 리렌더링이 발생하는 대신, 필요한 시점(예: 제출 시)에만 상태를 업데이트하여 불필요한 렌더링을 최소화합니다. 이는 복잡한 폼에서 뛰어난 성능을 보장합니다.

2.  **간결한 코드**: 여러 개의 `useState`와 `onChange` 핸들러를 직접 작성할 필요 없이, `register` 함수 하나로 입력 필드를 폼에 등록하고 관리할 수 있습니다. 이로 인해 코드의 양이 줄고 가독성이 높아집니다.

3.  **강력한 유효성 검사**: `required`, `minLength`, `pattern` 등 HTML 표준 기반의 유효성 검사 규칙을 간단하게 적용할 수 있습니다. 에러 상태와 메시지를 쉽게 관리할 수 있어 사용자에게 직관적인 피드백을 제공하기 용이합니다.

4.  **쉬운 통합**: `shadcn/ui`, `Material-UI`, `Ant Design` 등 다양한 UI 라이브러리와 쉽게 통합하여 사용할 수 있습니다.

이 프로젝트에서도 `zustand`와 함께 RHF를 도입하여, 전역 상태와 폼 상태를 분리하고 각자의 역할에 맞게 효율적으로 관리하고자 했습니다.

## store to RHF

일단 로컬 스토리지에 저장되어 있는 코스 정보를 브라우저 단으로 불러와야 한다. 브라우저로 갱신하는 `useEffect` 코드는 아래와 같다.

```typescript
  const hasHydrated = useRef(false); // 하이드레이션 여부 함수
  const course = useCourse.getState().course;

  useEffect(() => {
    if (!hasHydrated.current && course.segments.length) {
      form.reset(toFormValues(course));
      hasHydrated.current = true;
    }
  }, [course, form]);
```

`course`는 `store`에 저장된 코스 정보를 의미하고, `form`은 그 `course`정보를 Form에서 관리하기 위한 `useForm` 객체, React Hook Form 정도로 보면 된다.

`useEffect`가 걸려 있기 때문에 일단 브라우저에 진입 또는 새로고침을 하게 되면 해당 로직이 실행된다. 단, 로직이 작동되게 위해 선제조건이 필요한데, 그건 바로 **하이드레이션(hydration)이 완료되지 않았을 경우에만 작동하는 것이다.**


### 하이드레이션 (hydration)

Zustand의 `persist` 미들웨어는 상태를 `localStorage`에 저장하여 브라우저를 껐다 켜도 데이터가 유지되게 해준다. 하지만 Next.js와 같은 서버 사이드 렌더링(SSR) 환경에서는 이 과정에서 주의할 점이 있다.

서버에서는 브라우저의 `localStorage`에 접근할 수 없기 때문에, 초기 상태값으로 페이지를 렌더링하여 클라이언트에 보낸다. 클라이언트에서는 JavaScript가 실행되면서 `localStorage`에 저장된 데이터를 불러와 상태를 "복원"하는데, 이 과정을 **하이드레이션(Hydration)**이라고 한다.

이때 서버에서 렌더링한 초기 상태와 클라이언트에서 복원한 상태가 달라 UI 불일치 문제가 발생할 수 있고, 이를 경고로 알려준다.

위 코드에서는 이러한 문제를 해결하기 위해 `hasHydrated`라는 `ref`를 사용한다.

1.  컴포넌트가 처음 렌더링될 때 `hasHydrated.current`는 `false`.
2.  `useEffect`는 `course` 상태가 변경될 때마다 실행된다. 클라이언트에서 `localStorage`로부터 상태 복원이 완료되면(하이드레이션), `course` 상태가 업데이트되면서 `useEffect`가 실행된다.
3.  `if (!hasHydrated.current && course.segments.length)` 조건문은 **"아직 하이드레이션으로 폼을 채우지 않았고, 스토어에 데이터가 있는가?"**를 확인한다.
4.  조건이 참이면, `form.reset(toFormValues(course))`를 통해 `react-hook-form`의 상태를 `zustand` 스토어에서 가져온 데이터로 갱신한다.
5.  마지막으로 `hasHydrated.current = true`로 설정하여, 이 로직이 다시는 실행되지 않도록 한다.

이렇게 함으로써 서버 렌더링 결과물과 클라이언트의 최종 결과물 사이의 불일치를 피하고, `localStorage`의 데이터를 안전하게 폼에 채워 넣을 수 있다.



## RHF to store with auto-save

입력을 했으면, 다시 로컬 스토리지에 갱신해, 나중에 UI를 출력할 때 사용해야 한다.


```typescript
  useEffect(() => {
    const sub = form.watch((values) => {
      // 하이드레이션 끝나지 않았을 경우 무시
      if (!hasHydrated.current || course.segments.length < 1) return;

      // 디바운스
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveCourse({
          title: values.title ?? '',
          subTitle: values.title ?? '',
          description: values.description ?? '',
          difficulty: COURSE_DIFFICULTY_ENUM.find(difficulty => difficulty.code === values.difficulty) ?? COURSE_DIFFICULTY_ENUM[0],
          segments: (values.segments ?? []).map((segment, index) => ({
            name: segment?.name ?? '',
            description: segment?.description ?? '',
            difficulty: TRACK_SEGMENT_DIFFICULTY_ENUM.find(difficulty => difficulty.code === segment?.difficulty) ?? TRACK_SEGMENT_DIFFICULTY_ENUM[0],
            track: course.segments[index].track,
          }))
        });

        // 저장 완료 토스트 실행
        if (saveDoneTimerRef.current) clearTimeout(saveDoneTimerRef.current);
        setIsSaveComplete(true);
        saveDoneTimerRef.current = setTimeout(() => {
          setIsSaveComplete(false);
        }, 1000);
      }, 1000);
    });
    return () => {
      sub.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveDoneTimerRef.current) clearTimeout(saveDoneTimerRef.current);
    }
  }, [form, course.segments, saveCourse]);
```

### 디바운스 (Devounce)
