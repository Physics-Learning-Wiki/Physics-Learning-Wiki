[![Word Art](docs/images/wordArt.webp)](https://physics-learning-wiki.github.io/Physics-Learning-Wiki/)

# 欢迎来到 **Physics Learning Wiki**！

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/Physics-Learning-Wiki/Physics-Learning-Wiki/build.yml?style=flat-square&branch=main)](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/actions/workflows/build.yml)  [![GitHub stars](https://img.shields.io/github/stars/Physics-Learning-Wiki/Physics-Learning-Wiki.svg?style=social&label=Stars)](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki)

---

## 项目简介

**Physics-Learning-Wiki** 是一个面向系统化物理学习与复习的结构化知识框架，旨在帮助学习者高效掌握物理学的基础与进阶知识。项目内容涵盖基础概念、各分支学科、数学与实验支撑、计算物理、题库、术语与参考资源。

---

## 鸣谢

感谢 [OI wiki](https://oi-wiki.org/) 以及 OI wiki 的贡献者们提供的框架、内容与技术支持！
感谢所有为 **Physics Learning Wiki** 做出贡献的朋友们！
> 由于学物理的同学们并不常有GitHub账号，您在页面中可能会看到一些“匿名同学”做出的贡献，这些贡献大多为同学们联系项目成员帮忙提交的内容，也十分感谢他们的付出！

---

## 目录总体框架

项目的主要内容组织在 `docs/` 目录下，包含以下模块：

- **fundamentals**：基础与通用概念
- **math-tools**：数学工具
- **mechanics**：力学
- **thermodynamics**：热学与统计
- **electromagnetism**：电磁学
- **optics**：光学
- **modern-physics**：近代物理（量子 / 原子 / 核 / 粒子 / 相对论）
- **experimental**：实验与测量
- **computational**：计算物理
- **problem-bank**：题库与分类
- **glossary**：术语与符号
- **references**：参考与教材
- **roadmap**：学习路线
- **contributing**：贡献指南
- **structure**：结构说明

---

## 部署

本项目使用 [MkDocs](https://github.com/mkdocs/mkdocs) 进行部署，推荐使用以下步骤在本地运行：

### 环境准备

1. 克隆仓库：

```bash
git clone https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki.git --depth=1
cd Physics-Learning-Wiki
```

2. 安装依赖：

```bash
pip install uv
uv sync --index-url https://pypi.tuna.tsinghua.edu.cn/simple/
```

3. 安装自定义主题（Windows 下请使用 Git Bash 执行）：

```bash
./scripts/pre-build/install-theme.sh
```

### 本地运行

- 启动本地服务器：

```bash
uv run mkdocs serve -v
```

- 构建静态页面：

```bash
uv run mkdocs build -v
```

---

## 如何参与贡献

我们欢迎所有对物理学习感兴趣的小伙伴参与贡献！

- **贡献内容**：分享您的学习笔记、补充知识点或完善现有内容。
- **报告问题**：通过 [Issues](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues) 提交问题或建议。
- **贡献代码**：修复错误、优化功能或改进文档。

具体的贡献方式请参考 [贡献指南](docs/intro/htc.md)。

---

## 版权声明

<a rel="license" href="https://creativecommons.org/licenses/by-sa/4.0/"><img alt="知识共享许可协议" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />除特别注明外，项目中除了代码部分均采用<a rel="license" href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh">(Creative Commons BY-SA 4.0) 知识共享署名 - 相同方式共享 4.0 国际许可协议</a>及附加的 [The Star And Thank Author License](https://github.com/zTrix/sata-license) 进行许可。

换言之，使用过程中您可以自由地共享、演绎，但是必须署名、以相同方式共享、分享时没有附加限制，

而且应该为 GitHub 仓库点赞（Star）:P

引用本项目时，请使用以下 BibTeX：

```bibtex
@misc{physics-learning-wiki,
  author = {Physics-Learning-Wiki Team},
  title = {Physics-Learning-Wiki},
  year = {2025},
  publisher = {GitHub},
  journal = {GitHub Repository},
  howpublished = {\url{https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki}},
}
```
