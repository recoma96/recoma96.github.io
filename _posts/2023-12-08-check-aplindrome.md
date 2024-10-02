---
layout: post
title:  "[백준, leetcode] 연결리스트로 팰린드롬 확인하기"
date:   2023-12-08 01:04:25 +0900
categories: "코테_뽀개기"
summary: "연결리스트로도 팰린드롬인지 확인할 수가 있어요."
tags: ["algorithm"]
image: ""
---

# 문제
[백준: 팰린드롬수 [브론즈 1]](https://www.acmicpc.net/problem/1259) <br>
[leetcode: palindrome linked list [Easy]](https://leetcode.com/problems/palindrome-linked-list)

<br>

# 팰린드롬이란?
![palin](https://media.vlpt.us/images/vector7/post/3a8305c6-bc65-4eee-97aa-690c2056f9e6/blog-Page-3.drawio.png)

"회문"이라고도 하며 문장 또는 단어의 왼쪽 오른쪽이 대칭인 것을 말합니다. 예를들어 단어로는 **12321** 이 있고 문장으로는 **a man, a plan, a canal: panama (amanaplana c analpanama)** 가 있습니다.

<br><br>

# 문제
## 공통
입력으로 자연수가 주어집니다. 해당 자연수가 팰린드롬인지 확인하는 문제 입니다.
## 백준
범위가 1부터 99999 까지 이고, 문자열 형태로 주어집니다.
## leetcode
1부터 100000 까지가 범위이고 **문자열이 아닌 연결 리스트로 주어집니다.**
## 접근
**백준-팰린드롬수**에서는 팰린드롬을 구할 수 있는 방법이 여러가지 있습니다. 문자열을 하나 복사한 다음 뒤집어서 팰린드롬을 확인한다거나, 파이썬에서는 문자열을 collections.deque로 변환한 다음에 양쪽으로 하나 씩 pop 하면서 문자 일치/불일치를 확인할 수 있습니다. 하지만 이번 장에서는 **단일 연결 리스트**로 풀어보려 합니다.

<br><br>

# 풀이
**leetcode 기준으로 설명합니다.**

![](https://media.vlpt.us/images/vector7/post/f1915148-79de-4b7e-99bf-47368daf7a69/blog-Page-3.drawio%20(1).png)

위의 문제를 푸는 데 크게 두 가지의 방법이 있습니다.

## Deque로 변환
연결리스트로 되어있는 데이터를 순환해서 deque를 형성한 다음 아까 문제-접근에서 설명한 방법데로 deque를 이용해서 풀 수 있습니다. 그러나 이는 연결리스트를 제대로 활용하지 못한 풀이로 문제에서 원하는 풀이법이 아닙니다. 게다가 한번 순회를 해서 deque를 생성한 다음 다시 문자열 길이의 1/2를 또 순회해서 확인을 해야 할 뿐만 아니라, 노드의 값들을 복사해서 deque에 삽입하기 때문에 추가로 시간이 발생하게 됩니다.

## 러너 기법을 이용한 풀이
러너 기법을 이용해서 다른 자료구조를 따로 생성할 필요 없이 문제를 풀 수 있습니다.

### 러너 기법이란?
![](https://media.vlpt.us/images/vector7/post/742bbed0-e78e-4f61-9c05-b4b47128e604/blog-Page-3.drawio%20(2).png)

러너 기법이란 출발 노드(head)를 두개 선언하고 하나는 한칸, 다른 하나는 두 칸 씩 이동해서 연결 리스트의 중간 지점을 찾는 기법 입니다.
이 문제에서는 left가 중간 지점으로 이동하면서 기존 노드를 이용해 역순 리스트를 만든 다음, left 지점과 역순 리스트를 이용해 팰린드롬을 확인합니다.

<br>

### 순서
#### 역순 리스트 만들기
##### [Turn 1]
1. left, right전부 head에 위치합니다

    ![](https://media.vlpt.us/images/vector7/post/8d9e1a00-3a0c-474f-9c24-0c1a58809342/blog-Page-3.drawio.png)

2. right를 2칸 이동하고 left지점에 tmp를 선언한 다음, left를 한 칸 이동합니다.

    ![](https://media.vlpt.us/images/vector7/post/ada623dd-a6bb-42da-b1e2-612b694c31b7/blog-Page-3.drawio%20(1).png)

3. tmp에 위치해 있는 노드를 역순 연결 리스트로 이동시킵니다.

    ![](https://media.vlpt.us/images/vector7/post/5b9bcd14-b29a-4328-8981-3d48f36c347b/blog-Page-3.drawio.png)


##### [Turn 1]
1. 아까와 마찬가지로 right 2칸, left위치에 tmp, left를 1칸 이동합니다.

    ![](https://media.vlpt.us/images/vector7/post/ce780f5c-42c7-4ba7-9e00-0e3069f43dd9/blog-Page-3.drawio.png)

2. tmp에 위치해 있는 노드를 reverse head 뒷부분에 추가합니다.

    ![](https://media.vlpt.us/images/vector7/post/2f9ed9ff-a64b-4b7e-bee7-5ee5aed2b017/blog-Page-3.drawio%20(1).png)

##### [Turn 3]
1. right의 next부분이 Null인 상태, 즉 맨 끝에 위치해 있기 때문에 턴을 종료합니다.

    > 홀수 길이일 경우 right는 있지만 next가 Null이고 짝수 길이일 경우 right가 Null입니다. 따라서 밑에 코드에서도 쓰여져 있지만 while문을 돌릴 때 right and right.next를 조건으로 잡습니다.

#### 팰린드롬 확인하기

1. 이제 left와 reverse로 팰린드롬을 확인할 일만 남았습니다. 그전에 right의 상태를 파악해야 합니다. 홀수 길이일 경우, left는 말 그대로 정중앙에 위치해 있기 때문에 한 칸 더 이동합니다.

    ![](https://media.vlpt.us/images/vector7/post/e7084b21-1e60-4b47-9c99-33864a44d27f/blog-Page-3.drawio.png)

2. left와 reverse에서의 연결리스트 길이는 일치하기 때문에 맨 끝에 다다를 때 까지 데이터가 일치하는 지만 확인하면 됩니다. 중간에 값이 틀리면 반복문에서 나가기 때문에 reverse가 None이면 False, None이 아니면 True로 출력하면 됩니다.

<br>

# 코드

## Leetcode

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
class Solution:
    def isPalindrome(self, head: Optional[ListNode]) -> bool:
        
        rev = None # 역순 리스트
        left = right = head
        
        while right and right.next:
            right = right.next.next # 2칸씩
            
            # 한 칸 씩, 그리고 역순 리스트에 데이터 추가
            tmp = left
            left = left.next
            
            prev_node, new_node = rev, tmp
            new_node.next = prev_node
            rev = new_node
        
        if right:
            # 해당 문자열은 홀수, 따라서 left가 한 칸 더 이동해서 맞춘다
            left = left.next
            
        
        while rev and rev.val == left.val:
            rev, left = rev.next, left.next
        
        # rev가 None일 경우 끝까지 확인했기 때문에 True다
        # 따라서 not rev -> 팰린드롬 O
        return not rev
```

<br >


## BaekJoon

연결 리스트로 들어오지 않기 때문에 연결리스트를 생성하는 작업을 추가해야 합니다.


```python

class Node:
    def __init__(self, val: str):
        self.val = val
        self.next = None        
class LinkedList:
    def __init__(self):
        self.head = None
    def push(self, val):
        # 입력 연산을 줄이기 위해 Queue 스타일로 구현
        if self.head == None:
            self.head = Node(val)
        else:
            new_node, next_node = Node(val), self.head
            new_node.next, self.head = next_node, new_node

def use_runner(L: LinkedList):

    head = L.head
    left = right = head
    reverse = None # 역순 리스트

    while right and right.next:
        # 오른쪽 두칸 이동
        right = right.next.next
        
        tmp = left # 역순 리스트를 만들기 위한 node
        left = left.next # 한 칸 이동
        
        # 역순 리스트 생성
        prev_reverse, new_reverse = reverse, tmp
        new_reverse.next = prev_reverse
        reverse = new_reverse

        # 또는 이렇게 표현 가능
        # reverse, reverse.next, left = left, reverse, left.next

    if right:
        # right에 노드가 남아있는 경우 -> 노드 길이가 홀수
        # 한칸 이동한다
        left = left.next

    while reverse:
        if left.val != reverse.val:
            # 다르면 팰린드롬이 아니다
            return "no"
        left, reverse = left.next, reverse.next
    return "yes"

def palindrome(S: str):

    # 연결 리스트 생성
    l = LinkedList()
    for char in S:
        l.push(char)
    return use_runner(l)

S = input()
R = []
while S != '0':

    # Check 펠린드롬
    R.append(palindrome(S))
    S = input()


```