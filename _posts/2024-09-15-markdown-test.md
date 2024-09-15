---
layout: post
title:  "Markdown Test"
date:   2024-09-15 01:04:25 +0900
series: "kramdown-test"
summary: "마크다운 제대로 잘 나오는 지 테스트"
tags: ["markdown", "test", "kramdown", "jekyll"]
image: ""
---

# H1
## H2
### H3
#### H4
##### H5

# 테스트
해당 문법은 kramdown입니다.
* * *

# 로렘 입숨
Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

# 코드
```python
# 파이썬이 짱이쥐 ㅋㅋㅋ
def hello_world():
    print("Hello World!")
def hello_2022():
    print("Hello 2022!")

hello_world()
hello_2022()
```

# 이미지
이미지 불러오기
기존 마크다운과 일치하나 이미지 루트 의 맨 앞에 site.baseurl 을 붙입니다.
* Example

```c
![testimage](/assets/img/post/example1.gif)
```

![testimage](/assets/img/post/example1.gif)

```bash
aaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbccccccccccccccccdfdddddddddddddddddd
```

# 글씨 👌
* Normal
* _italics_
* <del>Strikethrough</del>
* -- endash --
* --- em-dash ---
* << guilemet >>
* ... ellipsis
* Emoji: 👌
* **bold**

# paragraph
> This is quote \\
> Quote 2 \\
> Quote3 Quote3 Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3 Quote3 Quote3 Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3 Quote3 Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3 Quote3 Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3Quote3

This is a\\
line break

* * *

# Ordered List
* Numbering
    1. Num1
        * Pay Attention
    2. Num2
    3. Num3

# Foot Notes
Here's a simple footnote,[^1] and here's a longer one.[^2]

[^1]: And here is the definition.
[^2]:
    Second Definition
    > with using quote

# Tasks
- [ ] Incomplete
    - [x] Complete
- [x] complete

# Links
[google](https://www.google.com)

[google][gid]

[gid]: http://google.com

# Table

|---------+---------+---------|
| Header1 | Header2 | Header3 |
|---------|:--------|--------:|
| 1       | 2       | 3       |
| 4       | 5       | 6       |
|---------+---------+---------|
| 8       | 95      | 106     |
| 894     | 345     | 866     |
|=========+=========+=========|
| Foot1   | Foot2   | Foot3   |
|---------+---------+---------|

# MATH

$$
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha \\
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha \\
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
a^2 = b^2 + c^2 - 2bc\cos\alpha
$$

<br >
<br >

$$
\begin{aligned}
\sqrt{37} & = \sqrt{\frac{73^2-1}{12^2}} \\
 & = \sqrt{\frac{73^2}{12^2}\cdot\frac{73^2-1}{73^2}} \\ 
 & = \sqrt{\frac{73^2}{12^2}}\sqrt{\frac{73^2-1}{73^2}} \\
 & = \frac{73}{12}\sqrt{1 - \frac{1}{73^2}} \\ 
 & \approx \frac{73}{12}\left(1 - \frac{1}{2\cdot73^2}\right)
\end{aligned}
$$

# 코드
```python
import sys
import heapq
input = sys.stdin.readline
MAX = 100_001

N, K = map(int, input()[:-1].split())
times = [float('inf')] * MAX


def process(N, K):
    Q = [(0, N)]
    # (횟수, 위치)


    # 예외처리
    if N == K:
        return ["0", "1"]
    if N > K:
        return [str(N - K), "1"]

    min_cnt = 0


    def __move(cnt, next_n):
        if 0 <= next_n <= 100_000 and times[K] == float('inf'):
            heapq.heappush(Q, (cnt + 1, next_n))
            
    while Q:
        cur_cnt, cur_n = heapq.heappop(Q)

        # 도착 지점인 지 확인
        if cur_n == K and (times[K] == float('inf') or times[K] == cur_cnt):
            min_cnt += 1

        if times[cur_n] >= cur_cnt:
            # 처음 도달하거나 더 빠른 시간으로 도달한 경우
            # 근데 어차피 힙을 돌리기 때문에 그럴 일은 없다
            # 적립 후 움직이기
            times[cur_n] = cur_cnt
            __move(cur_cnt, cur_n + 1)
            __move(cur_cnt, cur_n - 1)
            if cur_n < K:
                # 작을 때만 가자
                __move(cur_cnt, cur_n * 2)
            


        # 도달했는 지 확인
        # 힙으로 돌렸기 때문에 맨 처음 도착하는 순이 가장 빠른 부분

    return [str(times[K]), str(min_cnt)]

print('\n'.join(process(N, K)))
```