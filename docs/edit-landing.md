---
title: 编辑与投稿入口
meta:
  - name: robots
    content: noindex, follow
---

## 编辑与投稿入口

感谢你愿意为 **Physics Learning Wiki** 做出贡献．现在我们提供三条正式入口：

1.  **GitHub 直接编辑**：适合熟悉 GitHub、希望直接修改页面内容的贡献者．

2.  **邮箱投稿**：适合不熟悉 GitHub，或手头只有笔记、提纲、讲义、课堂整理的同学．

3.  **Web 投稿**：直接在本站填写表单提交内容，无需 GitHub 账号．适合快速分享笔记、提交勘误或提出建议．

开始之前，建议先阅读 [如何参与](./intro/htc.md)、[内容编写指引](./intro/writing.md) 与 [格式手册](./intro/format.md)．

## 你可以提交什么

-   页面勘误、补充说明、参考资料．
-   完整成稿．
-   半成品笔记、提纲、讲义或课堂整理．
-   尚未写成正文，但已经梳理好的章节结构或学习路线建议．

## 署名说明

-   通过 GitHub 编辑时，请按现有规范维护文件头的 author 字段．
-   通过邮箱投稿时，可以在邮件中注明希望使用的署名方式（GitHub ID、姓名、网名或匿名），编辑组会在整理时补入相应信息．

<div class="grid">
  <a class="md-button md-button--primary" href="../submit/">Web 投稿</a>
  <a class="md-button" id="btn-startedit">在 GitHub 上编辑</a>
  <a class="md-button" href="mailto:submit@folderrewind.top?subject=%5BPhysics%20Learning%20Wiki%20%E6%8A%95%E7%A8%BF%5D">通过邮箱投稿</a>
</div>

<script>
    function getQueryVariable(name, dft)
    {
        var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
        var r = window.location.search.substr(1).match(reg);
        if (r != null)
        {
            return unescape(r[2]);
        }
        return dft;
    }
    document.getElementById("btn-startedit").href = "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/edit/main/docs" + getQueryVariable("ref", "");
</script>
