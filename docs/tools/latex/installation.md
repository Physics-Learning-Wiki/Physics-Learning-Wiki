---
author: Physics Learning Wiki Team
---

## 本地写作环境搭建：TeX Live 与 VS Code 详解

要发挥 LaTeX 在物理写作中的全部威力，搭建一套稳定、高效的本地工具链是最为关键的第一步．本页面提供面向物理学习者的完整环境搭建指南，详细介绍 **TeX Live 发行版** 与 **VS Code + LaTeX Workshop** 的安装、深度配置以及双向定位（SyncTeX）联动设置．

## 常见环境方案选型与对比

在正式安装前，我们先了解目前主流的三种 LaTeX 使用方案：

| 方案                     | 推荐度                                  | 优点                                            | 适用场景与缺点                             |
| :--------------------- | :----------------------------------- | :-------------------------------------------- | :---------------------------------- |
| **TeX Live + VS Code** | :star::star::star::star::star:（强烈推荐） | 宏包最完整、生态极其繁荣；支持 Git 长期版本管理；强大的代码补全、快捷键与双向精准定位 | 首次下载安装体积较大（约 8\~10 GB）；适合个人电脑长期主力写作 |
| **Overleaf 在线写作**      | :star::star::star::star:（优质备选）       | 零安装门槛，打开浏览器即可排版；实时多人协同极其方便                    | 依赖网络稳定性；免费版编译有超时限制；大型多文件项目管理不如本地灵活  |
| **MiKTeX + 本地编辑器**     | :star::star::star:（轻量备选）             | 安装体积小，按需自动联网下载宏包                              | 国内网络不稳定时可能因自动下载宏包卡死；宏包依赖有时容易产生冲突    |

???+ tip "结论"
    对于物理系本科生和科研人员，**「TeX Live + VS Code」是公认的最优解**．一次性完整安装后，无需担心断网或缺少宏包，能陪伴你从大一的物理实验报告一直用到研究生毕业论文．

## 第一步：TeX Live 发行版安装（Windows 详尽指南）

TeX Live 是由国际 TeX 用户组（TUG）维护的跨平台完整发行版，也是学术界最推荐的底层编译环境．

### 1. 下载完整的官方 ISO 镜像

???+ note "切勿使用在线网络安装器"
    官网提供的 `install-tl-windows.exe` 是在线安装器，需要边安装边从境外服务器下载几千个宏包．在国内网络环境下，极易因网络超时而中途失败．**请务必下载完整的离线 ISO 镜像文件**（约 4\~5 GB）．

推荐使用国内高校的开源镜像站下载最新版 `texlive.iso`：

-   **清华大学开源软件镜像站（TUNA）**：<https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/texlive/Images/texlive.iso>
-   **中国科学技术大学开源镜像站（USTC）**：<https://mirrors.ustc.edu.cn/CTAN/systems/texlive/Images/texlive.iso>
-   **北京外国语大学开源镜像站（BFSU）**：<https://mirrors.bfsu.edu.cn/CTAN/systems/texlive/Images/texlive.iso>

### 2. 挂载镜像与启动安装

1.  下载完成后，在 Windows 10/11 系统中，右键点击下载好的 `texlive.iso` 文件，选择 **「装载」（Mount）**．
2.  系统会自动将其映射为一个虚拟光驱驱动器，并打开该目录．
3.  在光驱目录中，找到批处理脚本 `install-tl-windows.bat`．
4.  **右键点击该文件，选择「以管理员身份运行」**（必须以管理员权限运行，以确保系统环境变量正确写入）．

### 3. 关键安装参数设置（避坑重点）

运行后会弹出 TeX Live 的安装图形界面，请按以下步骤仔细配置：

```text
+-------------------------------------------------------------+
| TeX Live 安装界面                                            |
|                                                             |
|  [Advanced] (点击高级设置以展开完整参数)                      |
|                                                             |
|  1. 安装路径 (TEXDIR): D:\texlive\2024                      |
|     * 绝对不能含有中文与空格!                               |
|                                                             |
|  2. 方案 (Selected scheme): scheme-full (完整方案，默认)      |
|                                                             |
|  3. 默认纸张大小: A4 (符合国内公制标准)                      |
|                                                             |
|  4. 选项: 勾选 [为所有用户安装] 与 [将目录添加到 PATH]        |
|                                                             |
|  [安装 (Install)]                                           |
+-------------------------------------------------------------+
```

1.  **点击「Advanced」（高级设置）**：展开全部安装选项．
2.  **修改安装路径（TEXDIR）**：
    -   默认路径通常为 `C:\texlive\2024`．如果 C 盘空间紧张，可修改为 `D:\texlive\2024` 等．
    -   **严重警告：安装路径中绝对不能包含中文字符或空格！** 千万不要安装在如 `C:\Program Files\` 或带中文用户名的文件夹中，否则底层宏包在调用路径时极易出现无法识别的异常．
3.  **安装方案（Scheme）**：保持默认的 **`Scheme-full`（完整安装）**．完整安装解压后占用约 8\~10 GB 硬盘空间，但它包含了物理专业所需的全部宏包（如 `ctex`,`siunitx`,`revtex`,`bm`,`tikz-feynman` 等），一次安装，终生受益．
4.  **纸张格式（Paper size）**：在选项中将默认纸张设置为 **`A4`**（默认可能是美制 Letter 纸张）．
5.  **环境变量选项**：确保勾选「Add to PATH」（自动将可执行文件目录添加到系统 PATH 环境变量）．
6.  点击右下角 **「安装」（Install）** 按钮，耐心等待安装完成．
    -   安装过程需要向磁盘写入数万个小文件，根据固态硬盘速度，通常需要 20 到 40 分钟．
    -   当安装窗口末尾显示 `Welcome to TeX Live!` 时，说明安装已大功告成，点击关闭窗口即可．
    -   最后，在资源管理器中右键虚拟光驱，选择 **「弹出」（Eject）**．

### 4. 验证安装与环境变量

按快捷键 `Win + X` 并选择打开 **PowerShell** 或 **终端**，依次输入以下命令：

```powershell
tex -v
xelatex -v
tlmgr --version
```

如果每条命令均能正确输出版本号信息（例如 `TeX 3.141592653 (TeX Live 2024)`），说明 TeX Live 已成功安装并正确配置到了系统全局环境变量中．

### 5. 配置国内宏包管理器镜像加速

TeX Live 自带宏包管理器 `tlmgr`．为了以后能够飞速更新宏包，建议将其远程更新源切换为国内镜像站．在 PowerShell 中执行：

```powershell
tlmgr option repository https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/texlive/tlnet
```

执行后可以通过更新管理器自身来测试连通性：

```powershell
tlmgr update --self
```

=== "Windows 系统"
    请遵循上述完整图文流程进行 ISO 挂载与安装．

=== "macOS (MacTeX)"
    macOS 用户推荐使用官方打包的 MacTeX（本质是 TeX Live 的 macOS 封装版）：
    
    -   方式 1：前往清华源下载完整的 [MacTeX.pkg](https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/mac/mactex/MacTeX.pkg) 安装包，双击图形化安装即可．
    -   方式 2：使用 Homebrew 命令行安装：
        ```bash
        brew install --cask mactex
        ```

=== "Linux (Ubuntu/Debian/Arch)"
    Linux 用户可直接使用发行版的包管理器安装完整版：
    
    -   Ubuntu/Debian：
        ```bash
        sudo apt update
        sudo apt install texlive-full
        ```
    -   Arch Linux：
        ```bash
        sudo pacman -S texlive-meta texlive-doc
        ```

## 第二步：VS Code 安装与 LaTeX Workshop 插件配置

安装好底层的 TeX Live 编译器后，我们需要为其配备一个现代化、高颜值的代码编辑器．

### 1. 安装 VS Code

前往微软官方网站 <https://code.visualstudio.com/> 下载适合你操作系统的安装包并完成安装．

在 Windows 安装过程中，建议勾选：

-   「将「通过 Code 打开」操作添加到 Windows 资源管理器文件上下文菜单」
-   「添加到 PATH（系统重启后生效）」

### 2. 安装核心插件

打开 VS Code，点击左侧活动栏的 **扩展（Extensions）** 图标（快捷键 `Ctrl + Shift + X`），依次搜索并安装：

1.  **`Chinese (Simplified) Language Pack for Visual Studio Code`**：微软官方中文汉化语言包，安装后右下角提示重启即可变为中文界面．
2.  **`LaTeX Workshop`**（作者：James-Yu）：VS Code 上最强大的 LaTeX 核心扩展，提供语法着色、实时补全、一键构建与 PDF 预览．

### 3. 配置 settings.json（物理写作深度优化配方）

`LaTeX Workshop` 默认的构建流程是针对英文排版的 `latexmk` 或 `pdflatex`，在直接编译包含中文字体的物理文档时经常报错．我们需要对其构建工具（Tools）和配方（Recipes）进行定制．

#### 打开用户设置文件的方法

按快捷键 `Ctrl + Shift + P` 打开命令面板，输入：

```text
Preferences: Open User Settings (JSON)
```

选择 **首选项：打开用户设置 (JSON)**，在打开的 `settings.json` 文件中，添加以下针对物理与中文写作精心优化的配置项：

```json
{
    // ==========================================
    // LaTeX Workshop 核心物理写作与中文编译配置
    // ==========================================
    
    // 编译工具定义
    "latex-workshop.latex.tools": [
        {
            "name": "xelatex",
            "command": "xelatex",
            "args": [
                "-synctex=1",
                "-interaction=nonstopmode",
                "-file-line-error",
                "%DOC%"
            ],
            "env": {}
        },
        {
            "name": "pdflatex",
            "command": "pdflatex",
            "args": [
                "-synctex=1",
                "-interaction=nonstopmode",
                "-file-line-error",
                "%DOC%"
            ],
            "env": {}
        },
        {
            "name": "bibtex",
            "command": "bibtex",
            "args": [
                "%DOCFILE%"
            ],
            "env": {}
        }
    ],
    
    // 编译配方组合 (Recipes)
    "latex-workshop.latex.recipes": [
        {
            "name": "XeLaTeX (中文笔记常用)",
            "tools": [
                "xelatex"
            ]
        },
        {
            "name": "XeLaTeX -> BibTeX -> XeLaTeX*2 (带参考文献中文论文)",
            "tools": [
                "xelatex",
                "bibtex",
                "xelatex",
                "xelatex"
            ]
        },
        {
            "name": "pdfLaTeX (英文论文/arXiv)",
            "tools": [
                "pdflatex"
            ]
        },
        {
            "name": "pdfLaTeX -> BibTeX -> pdfLaTeX*2 (带参考文献英文论文)",
            "tools": [
                "pdflatex",
                "bibtex",
                "pdflatex",
                "pdflatex"
            ]
        }
    ],
    
    // 默认使用第一个配方进行编译
    "latex-workshop.latex.recipe.default": "first",
    
    // 编译触发机制: 强烈建议设置为 onSave (保存时编译) 或 never (手动编译)
    // 默认的 onFileChange 会在打字过程中频繁触发编译, 造成 CPU 飙高和风扇狂转
    "latex-workshop.latex.autoBuild.run": "onSave",
    
    // 编译出错时是否弹出错误提示
    "latex-workshop.message.error.show": true,
    "latex-workshop.message.warning.show": false,
    
    // 自动清理编译产生的中间辅助文件
    "latex-workshop.latex.autoClean.run": "onFailed",
    "latex-workshop.latex.clean.fileTypes": [
        "*.aux",
        "*.bbl",
        "*.blg",
        "*.idx",
        "*.ind",
        "*.lof",
        "*.lot",
        "*.out",
        "*.toc",
        "*.acn",
        "*.acr",
        "*.alg",
        "*.glg",
        "*.glo",
        "*.gls",
        "*.ist",
        "*.fls",
        "*.log",
        "*.fdb_latexmk"
    ],
    
    // PDF 预览查看器设置 (默认使用 VS Code 内置选项卡)
    "latex-workshop.view.pdf.viewer": "tab"
}
```

???+ note "为什么选用上述配置"
    1.  **XeLaTeX 优先**：原生支持 UTF-8 编码与系统级 TrueType/OpenType 字体，是配合 `ctexart` 书写中文物理报告的最佳引擎．
    2.  **保存时编译 (`onSave`)**：有效避免输入长公式或大型推导时因语法暂时未闭合而频繁报错卡顿．
    3.  **辅助文件清理**：LaTeX 编译会产生 `.aux`,`.log`,`.out` 等七八种中间文件，配置清理列表能让你的物理工程目录保持清爽．

## 第三步：PDF 预览与双向定位 (SyncTeX)

双向定位是 LaTeX 写作效率远超 Word 的核心利器：你可以在源码中一键定位到 PDF 对应的排版位置，也可以在阅读 PDF 时双击直达对应的源码行．

### 方案 A：VS Code 内置查看器（开箱即用）

如果你在 `settings.json` 中配置了 `"latex-workshop.view.pdf.viewer": "tab"`：

1.  **查看 PDF**：打开 `.tex` 文件后，按快捷键 `Ctrl + Alt + V`（macOS 为 `Cmd + Option + V`），或者点击右上角的「View LaTeX PDF」图标，即可在右侧分屏打开渲染好的 PDF．
2.  **正向跳转（源码 $\to$ PDF）**：
    -   将光标停留在 `.tex` 源码的某一行（例如某个推导公式）．
    -   按快捷键 **`Ctrl + Alt + J`**（macOS 为 `Cmd + Option + J`）．
    -   右侧 PDF 预览界面会自动滚动并用醒目的黄色圆圈高亮该段落．
3.  **反向跳转（PDF $\to$ 源码）**：
    -   在右侧 PDF 窗口中找到你想修改的文字或公式．
    -   按住 **`Ctrl` 键并鼠标左键单击**（macOS 为 `Cmd + 单击`）．
    -   左侧编辑器光标会自动瞬间跳回对应的 `.tex` 源码行．

### 方案 B：外部 SumatraPDF 联动（Windows 极致体验）

对于 Windows 用户，轻量级阅读器 **SumatraPDF** 是公认的绝配，因为传统 PDF 阅读器（如 Adobe Acrobat）在打开 PDF 时会锁定文件导致 LaTeX 无法写入报错，而 SumatraPDF 不锁定文件，且渲染极快．

1.  下载安装 [SumatraPDF](https://www.sumatrapdfreader.org/)（建议使用默认路径安装）．
2.  在 VS Code 的 `settings.json` 中，将查看器修改为外部命令：
    ```json
    "latex-workshop.view.pdf.viewer": "external",
    "latex-workshop.view.pdf.external.viewer.command": "C:/Users/你的用户名/AppData/Local/SumatraPDF/SumatraPDF.exe",
    "latex-workshop.view.pdf.external.viewer.args": [
        "-forward-search",
        "%DIR%/%DOCFILE%.tex",
        "%LINE%",
        "-reuse-instance",
        "%PDF%"
    ]
    ```
3.  **配置 SumatraPDF 反向搜索回跳 VS Code**：
    -   打开 SumatraPDF，进入菜单：**设置 $\to$ 选项**．
    -   在底部的「设置反向搜索命令行」输入框中填入（请根据你的 VS Code 安装路径微调，一般为用户目录下的 `Code.exe`）：
        ```text
        "C:\Users\你的用户名\AppData\Local\Programs\Microsoft VS Code\Code.exe" -r -g "%f:%l"
        ```
    -   设置完成后，在 SumatraPDF 中 **双击任意文字**，即可直接秒级跳转回 VS Code 对应的代码行！

## 第四步：编译第一份测试文档

现在检验我们的安装成果：

1.  在电脑上新建一个测试文件夹，例如 `D:\physics-test`．
2.  打开 VS Code，点击菜单 **文件 $\to$ 打开文件夹**，选择该目录．
3.  新建文件 `test.tex`，将以下代码粘贴进去并保存（`Ctrl + S`）：

```tex
\documentclass[UTF8]{ctexart}
\usepackage{amsmath, siunitx}

\title{本地 LaTeX 物理环境配置测试}
\author{物理学习者}
\date{\today}

\begin{document}
  \maketitle

  恭喜！你的 TeX Live 与 VS Code 物理写作环境已成功就绪．

  这是一条测试公式（真空中的麦克斯韦方程组之一）：
  \begin{equation}
    \nabla \times \bm{E}= - \frac{\partial \bm{B}}{\partial t}.
  \end{equation}

  光速测量值：$c = \qty{2.99792458e8}{\meter\per\second}$．
\end{document}
```

4.  保存后，VS Code 会自动触发编译（或者点击左侧活动栏的 **TEX 图标 $\to$ Build LaTeX project $\to$ Recipe: XeLaTeX**）．
5.  稍等数秒，左下角状态栏显示对勾，同目录下生成 `test.pdf`．
6.  按 `Ctrl + Alt + V` 查看生成的 PDF，测试双向跳转功能．

## 物理人效率倍增扩展推荐

除了核心的 LaTeX Workshop，以下扩展和外部工具能极大提升你的物理公式输入速度：

1.  **Mathpix Snippets（公式截图神器）**：
    -   支持使用快捷键截取教材、讲义或手写草稿中的公式，瞬间识别并复制为标准 LaTeX 源码，堪称推导整理神器．
2.  **LaTeX Snippets（代码片段库）**：
    -   在扩展商店搜索安装，输入 `fra` 按 Tab 即可补全 `\frac{}{}`，输入 `ali` 即可补全 `align` 环境．
3.  **LTeX/LTeX+（学术英语语法检查）**：
    -   专为 LaTeX 设计的离线语法拼写检查工具，能够智能识别 LaTeX 命令并仅检查英文文本，适合撰写英语论文与实验报告．
4.  **Git/GitHub 扩展**：
    -   配合 VS Code 内置源代码管理，每次完成一个大推导或实验分析后进行一次 Commit，再也不用担心论文版本混淆或手滑误删．

## 在线应急方案：Overleaf 极简指引

如果你在机房公用电脑上、或者需要与同学多人实时在线协同修改同一份物理实验大作业，可以使用 [Overleaf](https://www.overleaf.com/)：

1.  注册登录 Overleaf 账号，点击 **New Project $\to$ Blank Project**．
2.  **至关重要的一步设置**：
    -   点击页面左上角的 **Menu** 按钮；
    -   在 **Settings** 下找到 **Compiler**（编译器）；
    -   将默认的 `pdfLaTeX` 修改为 **`XeLaTeX`**；
    -   TeX Live Version 建议保持最新．
3.  将你的中文 `.tex` 代码粘贴到主窗口，点击右侧的 **Recompile**（重新编译）即可在浏览器中预览．
