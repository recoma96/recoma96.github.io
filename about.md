---
layout: about
title: About
permalink: /about
---

# LolliNeon

**Lollineon** is jekyll engined blog that is LolliPop styled in light-mode and NeonSign styled in dark-mode


## ✔️ Usage

### Setting Configuration

Add following to the `_config.yml`

```yaml
title: <Your blog name>
email: <Your email>

nickname: <Your nickname>
user_description: <Write short description about you>
profile_image: <url of your profile image> # width and height of your image must be same!

social:
  github:
  email:
  x: <Your twitter page>
  instagram:
  youtube:
  website: <Your other website>
```



### Home (About) Page

Modify `index.md` file and add the following

```
---
layout: home
title: Home
permalink: /
---

# This is My Blog

This name is LolliLemon!

```


### Posting

Create markdown file into `_posts` file. This filename following this

```
YYYY-mm-dd-{this is post title}.md
```
* `YYYY-mm-dd` is Date (ex: 2024-09-13)
* `post-title` is only english and hipen `-`


Post header following this

```
---
layout: post
title:  <Post title name>
date:   YYYY-mm-dd HH:MM:SS (+0000)
categories: <Category-name of this post>
summary: <short summary of this post>
tags: ["tag1", "tag2"]
---
```


### Upload And Import Image Into markdown files

Sometimes, You need to import some images into post and index page. To import this following this

1. add image you want into `assets/img/post`
2. write this into markdown file
  ```
  ![testimage](/assets/img/post/{image filename})
  ```
