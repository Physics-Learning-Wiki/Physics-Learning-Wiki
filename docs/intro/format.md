---
author: OI-wiki, Physics Learning Wiki, Find-Light1130
status: review
description: "本站 Markdown、中文标点、数学公式和资源文件的排版规范．"
---

本页维护 **Physics Learning Wiki** 的 Markdown、公式与资源排版规则．教学组织和术语以 [内容编写指引](./writing.md) 为准；按实际编辑任务查阅对应规则即可．

如果您已迫不及待，想要快速上手，建议先阅读 [太长不看版](#太长不看版) 与 [图片举例](#图解) 的章节．

## 太长不看版

为方便初次阅读本文档的用户，本节列举该手册中的若干重点事项：

-   文件存储：

    -   使用小写文件名，以 `-` 代替空格．详见 [SAVE-1](#SAVE-1)．

    -   不要插入外链图片．详见 [SAVE-2](#SAVE-2)．

    -   图片尽可能使用 SVG 格式，只应使用 SVG 1.1 标准．详见 [SAVE-3](#SAVE-3)．

    -   动图应使用 SVG 或 APNG 格式．详见 [SAVE-4](#SAVE-4)．

    -   有源文件的图片建议同时提交源文件．详见 [SAVE-5](#SAVE-5)．

    -   插入外链时建议同时插入快照链接．详见 [SAVE-6](#SAVE-6)．

    -   不要以插入外链的方式插入内链．详见 [SAVE-7](#SAVE-7)．

-   标点符号：

    -   规范使用标点符号．在每句话的末尾添加 **句号**．详见 [PUNC-1](#PUNC-1) 至 [PUNC-7](#PUNC-7)．

    -   注意区分连接号（hyphen、en dash、em dash）．详见 [PUNC-8](#PUNC-8)．

-   Markdown 语法与主题扩展语法：

    -   只应使用二级、三级、四级标题．不要使用标题替代加粗．不要在标题写 LaTeX 公式．详见 [LINT-1](#LINT-1)、[MDFM-1](#MDFM-1)、[CONT-4](#CONT-4)、[CONT-9](#CONT-9)．

    -   使用折叠框[^note3]语法和选项卡[^note6]语法时，须保持内部缩进一致，**对空行也是如此**．**不要漏掉** 空行的空格缩进．详见 [LINT-6](#LINT-6)、[MDFM-6](#MDFM-6)．

    -   不要使用删除线 `~~foo~~` 语法．详见 [LINT-3](#LINT-3)．

    -   行间公式应写作

        ```text
        空行
        $$
        a^{2}=b^{2}+c^{2}
        $$
        空行
        ```

        而不是 `$$a^{2}=b^{2}+c^{2}$$`．详见 [LINT-5](#LINT-5)．

    -   行内公式应该使用单个 `$` 并且应当使用单个空格与周围内容隔开，写作 `文字 $a^{2}=b^{2}+c^{2}$ 文字` 而不是 `文字$a^{2}=b^{2}+c^{2}$文字`．详见 [LINT-4.3](#LINT-4.3)．

    -   补充与答案使用信息框的条件见 [MDFM-5](#MDFM-5)，核心主线保持可见．

    -   代码块只应使用 ` ``` ` 语法，且须标注语言．详见 [LINT-7](#LINT-7)、[MDFM-3](#MDFM-3)．

-   LaTeX 公式：
    -   不应与 [数学符号表](./symbol.md) 相冲突．详见 [MATH-1.1](#MATH-1.1)．

    -   注意字体的使用，详见 [MATH-1.2](#MATH-1.2)、[MATH-1.15](#MATH-1.15)、[MATH-2.6](#MATH-2.6)、[MATH-2.7](#MATH-2.7)．

    -   不要滥用 LaTeX 公式．详见 [MATH-1.14](#MATH-1.14)．

    -   不要 LaTeX 公式里使用程序设计语言的表示方式．（如：不要使用 $a==b$、$a<<1$、$a\%b$．）不要使用中括号连缀（$a[i][j]$）．详见 [MATH-1.9](#MATH-1.9)、[MATH-1.10](#MATH-1.10)．

-   代码：

    -   尽可能简洁易懂，避免压行，说明计算对象与方法．语法见 [MDFM-3](#MDFM-3)．

    -   代码示例使用带实际语言标记的围栏．详见 [MDFM-3](#MDFM-3)．

    -   不推荐在无关场合滥用计算机工具，应先介绍物理内容的概念及思想，而非直接进行计算．

## 对本文档的格式要求

-   <a id="FREQ-1"></a>FREQ-1：修订格式手册的条目时需同时补充 Changelog．若只是修正格式，则无需补充 Changelog．
-   <a id="FREQ-2"></a>FREQ-2：除 [太长不看版](#太长不看版) 一节外，格式手册的条目都需要有不重复的编号，编号需要匹配正则表达式 `(?<category>[A-Z]{4})-(?<id>[1-9][0-9]*(?:\.[1-9][0-9]*)*)`，其中 `category` 应具有直观的含义．说明文字不需要有编号．
-   <a id="FREQ-3"></a>FREQ-3：[太长不看版](#太长不看版) 的条目必须来自格式手册其他章节的内容，且需在末尾引用对应的条目编号．
-   <a id="FREQ-4"></a>FREQ-4：条目的编号一旦确定就不应更改．如果确需更改（如删除、合并条目），则应用类似「已废止」、「迁移至 XXXX-id」的文字注明．

## 贡献文档要求

当你打算贡献某部分的内容时，你应该尽量熟悉以下三部分：

-   文档存储的格式
-   文档的合理性
-   remark-lint 和 $\rm{\LaTeX}$ 公式的格式要求

### 文档引用与存储的格式

-   <a id="SAVE-1"></a>SAVE-1：**文件名请务必都小写，以 `-` 分割．** 例如：`file-name.md`．

-   <a id="SAVE-2"></a>SAVE-2：请务必确保文档中引用的 **外链** 图片已经全部转存到了 **本库内** 对应的 `images` 文件夹中（防止触发某些网站的防盗链），建议处理成 `MD 文档名称 + 编号` 的形式（可参考已有文档中图片的处理方式）．例如：本篇文档的文件名称为 format，则文档中引用的第一张图片的名字为 `format1.png`．

-   <a id="SAVE-3"></a>SAVE-3：推荐使用 SVG 格式的图片[^ref4]，以获取较好的清晰度和缩放效果．由于 **Physics Learning Wiki** 各组件对 SVG 标准的兼容性不同，所以您的图片应基于 [SVG 1.1](http://www.w3.org/TR/SVG11/) 标准．

-   <a id="SAVE-4"></a>SAVE-4：动图如果无法或者不会制作 SVG 格式的，则推荐使用 APNG 格式[^apng]的文件．Windows 用户可使用 [ScreenToGif](https://www.screentogif.com) 录制，Linux 用户可使用 [Peek](https://github.com/phw/peek) 录制，注意需要在设置里调整为录制 APNG．其他情况则推荐先制作为 MP4 等视频文件再转换为 APNG，如果使用 ffmpeg 则可以使用 `ffmpeg -i filename.mp4 -f apng filename.apng -plays 0` 转换．[^intro-apng]

-   <a id="SAVE-5"></a>SAVE-5：同时具有源文件和导出图像的图片（例如 JPG 文件与 PSD 文件或者 SVG 图像与 TikZ TeX 源代码），建议将源文件以与图片相同的文件名保存于同一目录下．

-   <a id="SAVE-6"></a>SAVE-6：请确保您的文档中的引用链接的稳定性．**不推荐** 引用 **自建** 服务中的资源（如缺少长期归档的个人题目页面）．建议在添加时同时将该外链存于互联网档案馆[^webarchive]，以防无法替代的链接失效．

-   <a id="SAVE-7"></a>SAVE-7：站内链接请去掉网站域名，并且使用相对路径链接对应 `.md` 文件．例如，在本页面（`intro/format`）中链接杂项简介（`misc`），应使用 `[杂项简介](../misc/index.md)`．可以在链接中添加 hash 来链接到某一节，例如 [`[Pull Request 信息格式规范](./htc.md#pull-request-信息格式规范)`](./htc.md#pull-request-信息格式规范)，hash 的值可以通过位于每个标题右侧的按钮或者位于网页右侧的目录中的链接得到．

### 文档的合理性

<a id="STRC-1"></a>STRC-1：读者、任务与难度安排以 [内容编写指引](./writing.md) 为准．本手册负责格式，不重复规定教学结构．

<a id="STRC-2"></a>STRC-2：正文中的条件、推理与结论应能连续阅读；组织方式按页面任务选择．

-   <a id="STRC-2.1"></a>STRC-2.1：概念、证明、导读和速查页承担不同任务，不要求相同的栏目或例题数量．取舍见 [教学示例](./teaching-examples.md)．
-   <a id="STRC-2.2"></a>STRC-2.2：工具页说明输入、输出、适用条件和实际操作，下载与配置链接优先使用官方文档．

修改已有文章先保留有效解释，再定位需要替换或合并的片段；追加说明时避免重复．审校与验证流程见 [编辑审校](./editorial-review.md)．

### 文档的基本格式要求

#### Remark-lint 的格式要求

[remark-lint](https://github.com/remarkjs/remark-lint) 可以自动给项目内文件统一风格．**Physics Learning Wiki** 现在启用的配置文件托管在 [.remarkrc](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/blob/main/.remarkrc)．

在配置过程中 **Physics Learning Wiki** 项目组也遇到了一些 remark-lint 不能很好处理的问题，所以请严格按照下列要求编辑文档：

-   <a id="LINT-1"></a>LINT-1：不要使用如 `<h1>` 或者 `# 标题` 的一级标题．

-   <a id="LINT-2"></a>LINT-2：标题要空一个英文半角空格，例如：`## 简介`．

-   <a id="LINT-3"></a>LINT-3：由于 remark-lint 不能很好地处理删除线，因此请不要使用删除线语法（不使用删除线语法的另外一个原因是，删除线划去的内容大多为「抖机灵」性质，对读者理解帮助不大，不符合下面的「文本内容的格式要求」中 [对内容表述的要求](#CONT-5)）．

-   <a id="LINT-4"></a>LINT-4：列表：
    -   <a id="LINT-4.1"></a>LINT-4.1：列表前要有空行，新开一段．
    -   <a id="LINT-4.2"></a>LINT-4.2：使用有序列表（如 `1. 例子`）时，点号后要有空格．
    -   <a id="LINT-4.3"></a>LINT-4.3：使用行内公式时，如果 `$` 符号包裹的公式与周围内容紧邻，可能导致渲染问题．

-   <a id="LINT-5"></a>LINT-5：行间公式前后各要有一行空行，否则会被当做是行内公式．

-   <a id="LINT-6"></a>LINT-6：使用 `???` 或 `!!!` 开头的 Details 语法时，每一行要包括在 Details 语法的文本框的文本，开头必须至少有 4 个空格．

    **即使是空行，也必须保持与其他行一致的缩进．请不要使用编辑器的自动裁剪行末空格功能．**

    ???+ success "示例"
        下面的代码中用 `␣` 表示空格 ` `．
        
        ```text
        ???+ warning
        ␣␣␣␣请记得在文本前面添加 4 个空格．其他的语法还是与 Markdown 语法一致．
        ␣␣␣␣
        ␣␣␣␣不添加 4 个空格的话，文本就不会出现在 Details 文本框里了．
        ␣␣␣␣
        ␣␣␣␣这个`???`是什么的问题会在 [下文](#MDFM-5) 解答．
        ```

-   <a id="LINT-7"></a>LINT-7：代码样式的纯文本块请使用 ` ```text`．直接使用 ` ``` ` 而不指定纯文本块里的语言，可能会导致内容被错误地缩进．

#### 标点符号的使用

-   <a id="PUNC-1"></a>PUNC-1：请在每句话的末尾添加 **句号**．本站中文正文和 description 的句末统一使用全角点「．」（U+FF0E）；代码、URL、引用原文与格式示例中的原有字符保持原意．
-   <a id="PUNC-2"></a>PUNC-2：请正确使用 **全角** 标点符号与 **半角** 标点符号．汉语请使用全角符号，英语请使用半角符号．中文中夹用英文时，请参考 [中文出版物夹用英文的编辑规范](https://www.nppa.gov.cn/xxgk/fdzdgknr/hybz/202210/t20221004_445147.html)．
-   <a id="PUNC-3"></a>PUNC-3：由于 `「……」` 未区分全半角，请使用 `「……」` 作为全角引号，`"..."` 作为半角引号．
-   <a id="PUNC-4"></a>PUNC-4：注意区分 **顿号** 与 **逗号** 的使用．
-   <a id="PUNC-5"></a>PUNC-5：注意 **括号** 的位置．句内括号与句外括号的位置不同．
-   <a id="PUNC-6"></a>PUNC-6：通常使用 **分号** 来表示列表环境中各复句之间的关系．
-   <a id="PUNC-7"></a>PUNC-7：对于有序列表，推荐在每一项的后面添加 **分号**，在列表最后一项的后面添加 **句号**；对于无序列表，推荐在每一项的后面添加 **句号**．
-   <a id="PUNC-8"></a>PUNC-8：注意区分各种不同的连接号，如 hyphen（一般使用 U+002D hyphen-minus（-），即键盘上的「减号」代替），U+2013 en dash（–）和 U+2014 em dash（—）．（英文中连接多个人名时，须用 en dash，但是极常误用为 hyphen．其他误用较为罕见，基本上只需记住这一点即可．）详见 [连接号 - 维基百科](https://zh.wikipedia.org/wiki/%E8%BF%9E%E6%8E%A5%E5%8F%B7)．

    ???+ success "示例"
        -   测量前先说明：「本次以向右为正方向．」
        -   受力分析先选研究对象，再辨认外力：重力、支持力和摩擦力．[^note1]
        -   下面依次检查三个步骤：
            1.  指定系统和参考系；
            2.  写出模型条件与方程；
            3.  核对方向、单位和适用边界．
        -   Euler–Lagrange 方程的英文人名之间使用 en dash．

#### Markdown 格式与主题扩展格式要求

-   <a id="MDFM-1"></a>MDFM-1：表示强调时请使用 `**SOMETHING**` 和 `「」`，而非某级标题，因为使用标题会导致文章结构层次混乱和（或）目录出现问题．

-   <a id="MDFM-2"></a>MDFM-2：当需要引用题目链接时，应尽可能使用原始题目或正式题库中的链接而不是镜像链接．

-   <a id="MDFM-3"></a>MDFM-3：行内代码使用一对反引号，代码块使用围栏并标注实际语言．代码标识不放进数学模式．例如：

    ???+ success "示例"
        函数 `kinetic_energy` 返回质点的动能．
        
        ```python
        def kinetic_energy(mass, speed):
            return 0.5 * mass * speed**2
        ```
        
        质量以 kg、速率以 m/s 输入时，返回值以 J 表示．

-   <a id="MDFM-4"></a>MDFM-4：「参考资料与注释」使用 Markdown 的脚注功能进行编写．格式为：

    ```markdown
    文本内容．[^脚注名]
    [^脚注名]: 参考资料内容．注意：冒号是英文冒号，冒号后面跟着一个空格．
    ```

    脚注名既可以使用数字也可以使用文本．脚注名摆放的位置与括号的用法一致．为美观起见，建议同一个页面内的脚注名遵循统一的命名规律，如：ref1、ref2、note1……

    脚注的内容统一放在 `## 参考资料与注释` 二级标题下．

    ???+ success "示例"
        ```markdown
        单位定义应查阅现行的国际单位制手册．[^si-example]
        
        ## 参考资料与注释
        
        [^si-example]: [BIPM：国际单位制手册](https://www.bipm.org/en/publications/si-brochure)．
        ```

-   <a id="MDFM-5"></a>MDFM-5：信息框语义由 [信息框规范](./admonitions.md) 维护．下面展示默认折叠的答案；主线定义与必要证明不采用这种放置方式．

    示例代码（`␣` 表示一个半角空格）：

    ```text
    ??? note "核对理由"
    ␣␣␣␣位移为零只表示始末位置相同．
    ␣␣␣␣
    ␣␣␣␣路程仍可以大于零．
    ```

    ??? note "核对理由"
        位移为零只表示始末位置相同．
        
        路程仍可以大于零．

-   <a id="MDFM-6"></a>MDFM-6：可用选项卡并列展示同一任务的不同表述，框内内容缩进四个空格，空行同样保留缩进．使用条件和更多语法见 [Material 选项卡文档](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/#usage)．例如：

    === "牛顿方法"
        从受力和加速度的关系出发，保留运动过程的信息．
        
        需要时可以继续求位置随时间的变化．

    === "能量方法"
        只问始末速率时，可以沿运动路径累计功．
        
        所用关系本身不直接给出到达时间．

主题扩展语法以 [Material 官方参考](https://squidfunk.github.io/mkdocs-material/reference/) 为准，本站约定仍以本手册及信息框规范为准．

#### 文本内容的格式要求

-   <a id="CONT-1"></a>CONT-1：所有的 **Physics Learning Wiki** 文本都应使用粗体标记．

-   <a id="CONT-2"></a>CONT-2：开场应让目标读者辨认本页任务，可以从定义、问题、实验、结果或已有方法开始；不强制「本页面将介绍」式概述．教学组织由 [内容编写指引](./writing.md) 维护．

-   <a id="CONT-3"></a>CONT-3：直接先修使用 frontmatter 的 `prerequisites` 声明，正文可补充具体操作要求，不重复自动生成的知识名单，也不强制将手写先修行放在开场之前．

-   <a id="CONT-4"></a>CONT-4：请注意文档结构．文档结构应当十分条理，层次清晰．请不要让诸如「五级标题」这种事情再次发生了，一篇正常的文章是用不到如此复杂的结构层次的．

-   <a id="CONT-5"></a>CONT-5：请注意内容的表述．作为一个百科网站，**Physics Learning Wiki** 使用的语言应该是书面的，客观的．诸如「抖机灵」性质的，对读者理解帮助不大的内容，不应该出现在 **Physics Learning Wiki** 当中．

-   <a id="CONT-6"></a>CONT-6：请尽量为链接提供完整的标题、或者可被识别的提示，避免使用裸地址和「这」、「此」之类的模糊不清的描述．每一个超链接都应尽量对其加以清楚明确的描述，方便读者明白该超链接将指向何处．

    建议使用源文章或者标签页的标题．

    ???+ failure "不推荐的写法"
        ```markdown
        请参考[这个页面](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)
        
        请参考 <https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork>
        ```
        
        请参考 [这个页面](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)
        
        请参考 <https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork>

    ???+ success "推荐的写法"
        ```markdown
        请参考 GitHub 官方的帮助页面 [Syncing a fork - GitHub Docs](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)
        ```
        
        请参考 GitHub 官方的帮助页面 [Syncing a fork - GitHub Docs](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)

-   <a id="CONT-7"></a>CONT-7：受 Markdown 格式限制，`## 参考资料与注释` 二级标题必须放在文末．

-   <a id="CONT-8"></a>CONT-8：所有用作序号的数字建议使用中文．示例：
    -   数列的第一项．
    -   输入文件的第一行．

-   <a id="CONT-9"></a>CONT-9：请尽量避免在标题中使用 MathJax 公式，无论是几级标题．在标题中使用公式有可能会导致目录显示错误．[^ref3]

#### LaTeX 公式的格式要求

LaTeX 作为公式排版的首选，我们应当正确地使用它．因此对于 LaTeX 的使用我们有严格的要求．如果您想要快速上手，可以阅读本章节末给出的表格．

-   <a id="MATH-1.1"></a>MATH-1.1：您使用的符号不应与 [数学符号表](./symbol.md) 规定的符号冲突．

-   <a id="MATH-1.2"></a>MATH-1.2：使用 Roman 体表示数字、常量、算子和函数．使用 Italic 体表示变量、下标．LaTeX 已经预先定义好了一些常见的常量、函数、运算符等，我们可以直接调用，包括但不限于：

    ```latex
    \log, \ln, \lg, \sin, \cos, \tan, \sec, \csc, \cot, \gcd, \min, \max, \exp, \inf, \mod, \bmod, \pmod
    ```

    所以在输入常量、函数名、运算符等时，请先检查一下是否应该使用 Roman 体或其它字体．LaTeX 符号的书写可参考 [KaTeX 的 Supported Functions 页面](https://katex.org/docs/supported.html)（不是全部），也可以搜索求解．

    由于 LaTeX 书写 Roman 体小写希腊字母较为困难，故小写希腊字母常量、算子和函数可以使用 Italic 体，如 $\pi$ 以及 $\delta x$ 中的 $\delta$.

    如果遇到没有预先定义好的需要使用 Roman 体的 **函数名**，我们可以使用 `$\operatorname{something}$` 来产生，如我们可以使用 `$\operatorname{lcm}$` 产生正体的最小公倍数（函数）符号．同理，产生 Roman 体的 **常量** 应用 `$\mathrm{}$`；产生 Roman 体粗体符号应用 `$\mathbf{}$`；产生 Italic 体粗体符号应用 `$\boldsymbol{}$`（如向量 $\boldsymbol{a}$）．对于多字母的变量，应当使用 `$\textit{}$`．其他非数学内容，包括英文、特殊符号等，一律使用 `$\text{}$`．中文我们则建议不放在 LaTeX 公式中．

-   <a id="MATH-1.3"></a>MATH-1.3：如果表达式须折行（常见于较长的行间公式中），则应遵循如下换行规则：

    -   <a id="MATH-1.3.1"></a>MATH-1.3.1：将换行符放在 $=$，$+$，$-$，$\pm$，$\mp$ 之前，如果有必要，也可放在 $\times$，$\cdot$，$/$ 之前，如：

        $$
        \begin{aligned}
            \mathrm{e}^x &= \sum\limits_{n=0}^{\infty} \dfrac{x^n}{n!} \\
            &= \phantom{+} 1 + x + \dfrac{x^2}{2} \\
            & \phantom{=} + \dfrac{x^3}{6} + \dfrac{x^4}{24} + \dots \\
        \end{aligned}
        $$

    -   <a id="MATH-1.3.2"></a>MATH-1.3.2：同一运算符不应在换行符前后同时出现，

    -   <a id="MATH-1.3.3"></a>MATH-1.3.3：换行符尽量不要出现在括号内的表达式中．

-   <a id="MATH-1.4"></a>MATH-1.4：在行内使用分数的时候，请使用 `$\dfrac{}{}$`．比如 `$\dfrac{1}{2}$`，效果 $\dfrac{1}{2}$，而不是 `$\frac{1}{2}$`，效果 $\frac{1}{2}$．

-   <a id="MATH-1.5"></a>MATH-1.5：组合数请使用 `\dbinom{n}{m}`，效果 $\dbinom{n}{m}$，而不是 `{n \choose m}`（在 LaTeX 中这种写法已不推荐）；与上一条关于分数的约定相似，请不要使用 `\binom{n}{m}`，效果 $\binom{n}{m}$．

-   <a id="MATH-1.6"></a>MATH-1.6：尽可能避免在行内使用巨运算符（如 $\sum$，$\prod$，$\int$ 等）．

-   <a id="MATH-1.7"></a>MATH-1.7：在不会引起歧义的情况下，请用 `$\times$` 代替星号，叉乘请使用 `$\times$`，点乘请使用 `$\cdot$`．如 $a\times b$，$a\cdot b$，而不是 $a\ast b$．

-   <a id="MATH-1.8"></a>MATH-1.8：请用 `$\cdots$`（居于排版基线与顶线中间），`$\ldots$`（居于排版基线的位置），`$\vdots$`（竖着的省略号）代替 `$...$`．如 $a_1,a_2,\cdots a_n$，而不是 $a_1,a_2,... a_n$．

-   <a id="MATH-1.9"></a>MATH-1.9：请注意，不要在非代码区域使用任何程序设计语言的表示方式，而是使用 LaTeX 公式．例如，使用 `$=$` 而不是 `$==$`（如 $a=b$，而不是 $a==b$）、使用 `` `a<<1` `` 或者 `$a\times 2$` 而不是 `$a<<1$`、使用 `$a\bmod b$` 代替 `$a\%b$`（如 $a\bmod b$，而不是 $a\%b$）等．

-   <a id="MATH-1.10"></a>MATH-1.10：公式中不要使用中括号连缀（易与代码中的数组索引混淆）而多使用下标．即 $a_{i,j,k}$ 而不是 $a[i][j][k]$．在公式中下标较复杂的情况下建议改用多元函数（$f(i,j,k)$）或内联代码格式．对于一元简单函数使用 `$f_i$`、`$f(i)$` 或 `$f[i]$` 均可．

-   <a id="MATH-1.12"></a>MATH-1.12：在表示等价关系时，请使用 `$\iff$`，效果 $\iff$，而不是 `$\Leftrightarrow$`，效果 $\Leftrightarrow$．

-   <a id="MATH-1.13"></a>MATH-1.13：分段函数环境 `cases`  **只能有两列**（即一个 `&` 分隔符）．

-   <a id="MATH-1.14"></a>MATH-1.14：请不要滥用 LaTeX 公式．这不仅会造成页面加载缓慢（因为 MathJax 的效率低是出了名的），同时也会导致页面的排版混乱．我们通常使用 LaTeX 公式字体表示变量名称．我们的建议是，如非必要，尽量减少公式与普通正文字体的 **大量** 混合使用，如非必要，尽量不要使用公式，如：

    ```LaTeX
    使用 $Python$ 中的 $numpy$ 数组记录位置，再计算 $velocity$．
    ```

    就是一个典型的 **滥用公式字体** 的例子．（在页面中使用斜体请用 `*文本*` 表示．）

-   <a id="MATH-1.15"></a>MATH-1.15：请正确使用对应的 LaTeX 符号，尤其是公式中的希腊字母等特殊符号．如欧拉函数请使用 `$\varphi$`，圆的直径请使用 `$\Phi$`，黄金分割请使用 `$\phi$`．这些符号虽然同样表示希腊字母 Phi，但是在不同的环境下有不同的含义．切记 **不要使用输入法的插入特殊符号** 来插入这种符号．

    另外，由于 LaTeX 历史原因，空集的符号应为 `$\varnothing$` 而不是 `$\emptyset$`；其他的符号应参照 [数学符号表](./symbol.md) 书写．

我们可以使用一个表格来总结一下上述内容．注意本表格没有举出所有符号的用法，只给出常见的错误．类似的情况类比即可．

| 不符合规定的用法                     | 渲染效果              | 符合规定的用法                                  | 渲染效果                                |
| ---------------------------- | ----------------- | ---------------------------------------- | ----------------------------------- |
| `$log, ln, lg$`              | $log, ln, lg$     | `$\log$, $\ln$, $\lg$`                   | $\log$，$\ln$，$\lg$                  |
| `$sin, cos, tan$`            | $sin, cos, tan$   | `$\sin$, $\cos$, $\tan$`                 | $\sin$，$\cos$，$\tan$                |
| `$gcd, lcm$`                 | $gcd, lcm$        | `$\gcd$, $\operatorname{lcm}$`           | $\gcd$，$\operatorname{lcm}$         |
| `$e$, $\text{e}$, e`（自然对数的底） | $e$，$\text{e}$, e | `$\mathrm{e}$`                           | $\mathrm{e}$                        |
| `$i$, $\text{i}$, i`（虚数单位）   | $i$，$\text{i}$, i | `$\mathrm{i}$`                           | $\mathrm{i}$                        |
| `$ 小于 a 的质数 $`               | $小于 a 的质数$        | `小于 $a$ 的质数`                             | 小于 $a$ 的质数                          |
| `$...$`                      | $...$             | `$\cdots$, $\ldots$, $\vdots$, $\ddots$` | $\cdots$，$\ldots$，$\vdots$，$\ddots$ |
| `$a*b$`（两个数相乘）               | $a*b$             | `$a\times b$, $a\cdot b$`                | $a\times b$，$a\cdot b$              |
| `$Python$`（软件名称）             | $Python$          | `Python`                                 | Python                              |
| `$a==b$`                     | $a==b$            | `$a=b$`                                  | $a=b$                               |
| `$f[i][j][k]$`               | $f[i][j][k]$      | `$f_{i,j,k}$, $f(i,j,k)$`                | $f_{i,j,k}$，$f(i,j,k)$              |
| `$R,N^*$`（集合）                | $R,N^*$           | `$\mathbf{R}$, $\mathbf{N}^*$`           | $\mathbf{R}$，$\mathbf{N}^*$         |
| `$\emptyset$`                | $\emptyset$       | `$\varnothing$`                          | $\varnothing$                       |
| `$size$`                     | $size$            | `$\textit{size}$`                        | $\textit{size}$                     |

#### 对数学公式的附加格式要求

请注意，尽管上述输入公式的语法和真正的 LaTeX 排版系统非常相似，但 **MathJax 和 LaTeX 是两个完全没有关系的东西**，MathJax 仅仅使用了一部分与 LaTeX 非常相似的语法而已．实际上，二者之间有不少细节差别，而这些差别经常导致写出来的公式在二者之间不通用．

由于 **Physics Learning Wiki** 使用 LaTeX 排版引擎开发了 PDF 导出工具，因此有必要强调公式在 MathJax 和 LaTeX 之间的兼容性．**请各位在 Wiki 中书写数学公式时注意以下几点．**

这些规则已经向 MathJax 做了尽可能多的妥协．导出工具兼容了一部分原本仅能在 MathJax 中正常输出的写法．

-   <a id="MATH-2.1"></a>MATH-2.1：请使用 `\begin{aligned} ... \end{aligned}` 表示多行对齐的公式；

-   <a id="MATH-2.2"></a>MATH-2.2：如果这些多行对齐的公式需要 **编号**，请用 `align` 或 `equation` 环境；

-   <a id="MATH-2.3"></a>MATH-2.3：不要使用 `split`、`eqnarray` 环境；

-   <a id="MATH-2.4"></a>MATH-2.4：不要使用 `\lt`,`\gt` 来表示大于号和小于号，请直接使用 `<`，`>`；

-   <a id="MATH-2.5"></a>MATH-2.5：不要直接用 `\\` 换行（需要换行的公式，请套在 `aligned` 或其他多行环境下）；

-   <a id="MATH-2.6"></a>MATH-2.6：若要输出 LaTeX 符号 $\rm{\LaTeX}$，请用 `$\rm{\LaTeX}$`，而不是 `mathrm`；（`\LaTeX` 在 TeX 排版系统中是一个不能用于数学模式下的命令，而 `\mathrm` 又不能在普通模式下使用；另外，`\text` 命令虽然在 TeX 上正常输出，但是在 MathJax 中 `\text` 命令的参数会被原样输出，而不是按命令转义）；

-   <a id="MATH-2.7"></a>MATH-2.7：数学公式中的中文文字 **必须置于 `\text{}` 命令之中**，而变量、数字、运算符、函数名称则必须置于 `\text{}` 命令之外．**请不要在 `\text{}` 命令中嵌套数学公式**；

-   <a id="MATH-2.8"></a>MATH-2.8：使用 `array` 环境时请注意 **实际列数与对齐符号的数量保持一致**．例如下面的公式中，数据实际有 3 列（`&` 是列分隔符），因此需要 3 个对齐符号（`l`/`r`/`c` 分别表示左、右、居中对齐）．

    ```latex
    $$
    \begin{array}{lll}
    F_1=\{\frac{0}{1},&&\frac{1}{1}\}\\
    F_2=\{\frac{0}{1},&\frac{1}{2},&\frac{1}{1}\}\\
    \end{array}
    $$
    ```

#### 伪代码格式

<a id="PCOD-1"></a>PCOD-1：伪代码按计算任务选择清楚的记法；自然语言步骤、带语言标记的代码或 LaTeX 都可使用，不强制特定编程语言．明确输入、步长、更新顺序和输出；若属于近似算法，应说明误差与适用范围．

例如，用显式 Euler 方法近似解 $\dot x=v$、$\dot v=a(x)$ 时，两个新量都使用旧时刻的值，不能在未说明时变成另一种更新顺序：

```text
输入 x、v、步长 dt，以及步数 n
重复 n 次：
    x_next = x + v * dt
    v_next = v + a(x) * dt
    x = x_next
    v = v_next
输出 x、v
```

该步骤只是数值近似，不保证机械能严格守恒；具体误差分析属于相应计算工具页．

## 图解

以下用物理写作场景说明排版判断；配图与否由教学任务决定，不使用无关的算法截图作通用范例．

### 例 1

复杂等式用显示公式，并在两侧留空行；标题用可检索的中文对象名，公式留在正文．例如标题写「动能定理」，不直接用整条等式作标题．

### 例 2

同一推导的连续等号可用 `aligned` 对齐．决定性投影、近似与变量替换仍需要文字解释，不能用对齐代替论证．

### 例 3

代码中的数组索引用行内代码 `position[i]`；数学分量写成 $x_i$．来源用脚注说明，并在文末列出可复查的资料．

### 例 4

乘法使用 $\times$ 或 $\cdot$；星号只在已定义的特殊运算中使用．段落写清物理关系，操作步骤可用有序列表，不让短语堆叠取代解释．

### 例 5

几何图与正文统一角度、正方向、源点和场点．替代文字应描述学习所需关系；若图只起装饰作用，可省略．

### 例 6

下标过多时可改用清楚定义的函数或辅助变量．例如先定义源到场点的距离，再写场强投影，避免把全部坐标表达式挤进多层下标．

### 例 7

题目及作答条件留在可见正文；核对答案可折叠，首次方法示范与必要推导则默认可读．具体语义见 [信息框规范](./admonitions.md)．

### 例 8

文末的来源应支持对应命题，数据表给出单位与条件．页面呈现检查和来源核验是不同工作，二者都要诚实记录范围．

## 外部链接

-   [标点符号用法（GB/T 15834—2011）](http://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201001/W020190128580990138234.pdf)
-   [维基百科：格式手册/标点符号](https://zh.wikipedia.org/wiki/Wikipedia:%E6%A0%BC%E5%BC%8F%E6%89%8B%E5%86%8C/%E6%A0%87%E7%82%B9%E7%AC%A6%E5%8F%B7)
-   [中文文案排版指北（简体中文版）](https://mazhuang.org/wiki/chinese-copywriting-guidelines/)
-   [中文文案风格指南 - PDFE GUIDELINE](https://pdfe.github.io/GUIDELINE/#/others/copywriter)
-   [一份（不太）简短的 LATEX2ε 介绍或 106 分钟了解 LATEX2ε](https://github.com/CTeX-org/lshort-zh-cn/releases)
-   [中文出版物夹用英文的编辑规范](https://www.nppa.gov.cn/xxgk/fdzdgknr/hybz/202210/t20221004_445147.html)

## 参考资料与注释

### 修订记录

-   2026-10-25：将教学结构与先修要求归并到内容编写指引，保留 STRC、CONT 等原规则入口；用物理和数值计算示例替换失配内容，并修正配置与失效规则链接．

[^note1]: （冒号）表示总结上文．

[^note3]: 折叠框：参见 [Collapsible Blocks](https://squidfunk.github.io/mkdocs-material/reference/admonitions/#collapsible-blocks)，有时我们也用「Details 语法」指代该语法，因其从功能上与 HTML 中的 [`<details>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) 功能一致．

[^note6]: 选项卡：参见 [Content tabs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs)．

[^ref3]: [我的公式为什么在目录里没有正常显示？好像双倍了](faq.md)

[^ref4]: [SVG|MDN](https://developer.mozilla.org/zh-CN/docs/Web/SVG)

[^webarchive]: [Save Page in Internet Archive](https://web.archive.org/save/)

[^apng]: [APNG](https://en.wikipedia.org/wiki/APNG)

[^intro-apng]: [OI-wiki/OI-wiki#3422](https://github.com/OI-wiki/OI-wiki/issues/3422)
