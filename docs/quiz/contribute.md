---
title: 贡献题目
description: 为 Physics Learning Wiki 贡献新的自测题目与解析，参与开放物理题库建设．
comments: false
hide:
  - toc
---

欢迎向 Physics Learning Wiki 贡献自测题目！无论是典型例题、概念辨析、图像分析还是原创练习，入库后都将成为全站自测与针对性练习资源的一部分．

> 提示：题型、题干与完整解析为必填项．自由作答题不要求唯一正确答案，而是要求提供参考答案和自评评分标准．

***

<form id="plw-question-contribute-form" method="post" onsubmit="return false">
  <div class="submit-field">
    <label for="q-submit-type">题型 <span class="submit-required">*</span></label>
    <select id="q-submit-type" required>
      <option value="single_choice">单选题 (Single Choice)</option>
      <option value="multiple_choice">多选题 (Multiple Choice)</option>
      <option value="true_false">判断题 (True / False)</option>
      <option value="numeric">数值计算题 (Numeric)</option>
      <option value="free_response">自由作答题 (Free Response)</option>
    </select>
  </div>

  <div class="submit-field">
    <label for="q-submit-stem">题干 <span class="submit-required">*</span></label>
    <textarea id="q-submit-stem" rows="6" placeholder="输入题目题干，支持 Markdown 格式与 LaTeX 公式（如 $F=ma$）..."></textarea>
  </div>

  <div class="submit-field q-submit-choice-only">
    <label for="q-submit-choices">选项列表（每行一个选项，格式为「选项标号|选项内容」） <span class="submit-required">*</span></label>
    <textarea id="q-submit-choices" rows="4" placeholder="A|第一项内容&#10;B|第二项内容&#10;C|第三项内容&#10;D|第四项内容"></textarea>
  </div>

  <div class="submit-field">
    <label for="q-submit-answer" id="q-submit-answer-label">正确答案 <span class="submit-required">*</span></label>
    <input type="text" id="q-submit-answer" required placeholder="单选填 A；多选填 A, C；判断填 true/false；数值填 9.8">
  </div>

  <div class="submit-field q-submit-free-only" hidden>
    <label for="q-submit-rubric">自评评分标准（每行「等级 ID|等级名称|分数」，分数范围 0 到 1） <span class="submit-required">*</span></label>
    <textarea id="q-submit-rubric" rows="3" placeholder="incomplete|尚未掌握|0&#10;partial|部分掌握|0.5&#10;complete|基本掌握|1"></textarea>
  </div>

  <div class="submit-field">
    <label for="q-submit-solution">参考答案与考点解析 <span class="submit-required">*</span></label>
    <textarea id="q-submit-solution" rows="6" placeholder="请给出详细的推导过程、物理原理分析或易错点提示..."></textarea>
  </div>

  <fieldset id="question-fields" class="submit-question-fields">
    <legend>题目属性与反馈（选填）</legend>
    <p class="submit-hint">以下属性均可留空，由维护者统一整理并归入知识图谱．</p>

    <div class="submit-field q-submit-choice-only">
      <label for="q-submit-choice-feedback">选项逐项反馈（每行「选项标号|为什么该选项正确或错误」）</label>
      <textarea id="q-submit-choice-feedback" rows="3" placeholder="A|因为……所以正确&#10;B|忽略了……所以错误"></textarea>
    </div>

    <div class="submit-field">
      <label for="q-submit-correct-feedback">全局答对反馈</label>
      <input type="text" id="q-submit-correct-feedback" placeholder="例如：回答正确！很好地掌握了这一物理概念．">
    </div>

    <div class="submit-field">
      <label for="q-submit-incorrect-feedback">全局答错反馈</label>
      <input type="text" id="q-submit-incorrect-feedback" placeholder="例如：回答错误，请注意区分动量与动能守恒条件．">
    </div>

    <div class="submit-question-grid">
      <div class="submit-field">
        <label for="q-submit-topic">物理主题</label>
        <select id="q-submit-topic">
          <option value="">-- 未指定（由维护者归类） --</option>
        </select>
      </div>
      
      <div class="submit-field">
        <label for="q-submit-concepts">核心概念 ID</label>
        <input type="text" id="q-submit-concepts" placeholder="例如 newton.inertia（多个逗号分隔）">
      </div>
      
      <div class="submit-field">
        <label for="q-submit-diff">难度</label>
        <select id="q-submit-diff">
          <option value="">-- 未指定 --</option>
          <option value="1">难度 1 (★☆☆)</option>
          <option value="2">难度 2 (★★☆)</option>
          <option value="3">难度 3 (★★★)</option>
        </select>
      </div>
      
      <div class="submit-field">
        <label for="q-submit-cognitive">认知层级</label>
        <select id="q-submit-cognitive">
          <option value="">-- 未指定 --</option>
          <option value="remember">识记 (Remember)</option>
          <option value="understand">理解 (Understand)</option>
          <option value="apply">应用 (Apply)</option>
          <option value="analyze">分析 (Analyze)</option>
        </select>
      </div>
      
      <div class="submit-field">
        <label for="q-submit-style">考查风格</label>
        <select id="q-submit-style">
          <option value="">-- 未指定 --</option>
          <option value="conceptual">概念辨析 (Conceptual)</option>
          <option value="graphical">图像分析 (Graphical)</option>
          <option value="computational">数值/代数计算 (Computational)</option>
          <option value="modeling">物理建模 (Modeling)</option>
        </select>
      </div>
      
      <div class="submit-field">
        <label for="q-submit-seconds">预计作答时间（秒）</label>
        <input type="number" id="q-submit-seconds" min="10" max="1800" placeholder="例如 60">
      </div>
    </div>

    <div class="submit-field submit-image-group">
      <label for="q-submit-img-url">插图 HTTPS 链接（选填）</label>
      <input type="url" id="q-submit-img-url" placeholder="https://...">
      <input type="text" id="q-submit-img-alt" placeholder="图片替代文本（例如：小车在斜面上下滑示意图）">
      <input type="text" id="q-submit-img-rights" placeholder="图片来源与版权授权（例如：自主绘制 / CC-BY-SA）">
    </div>

    <label class="submit-checkbox-label">
      <input type="checkbox" id="q-submit-ai"> 本题编写或润色过程中使用了 AI 辅助工具，并如实披露
    </label>

  </fieldset>

  <div class="submit-field">
    <label>署名方式</label>
    <div class="submit-radio-group">
      <label><input type="radio" name="q-attribution-type" value="named" checked> 姓名/网名</label>
      <label><input type="radio" name="q-attribution-type" value="anonymous"> 匿名</label>
    </div>
    <input type="text" id="q-submit-attribution" placeholder="你希望在题目署名中显示的名称" maxlength="60">
  </div>

  <div class="submit-field">
    <label for="q-submit-contact">公开联系方式（选填）</label>
    <input type="text" id="q-submit-contact" placeholder="例如 GitHub 用户名或邮箱，方便编辑组向您请教讨论">
    <label class="submit-public-consent">
      <input type="checkbox" id="q-submit-contact-public">
      我理解并同意将上述联系方式公开发布到 GitHub Issue
    </label>
  </div>

  <div class="submit-field">
    <label class="submit-checkbox-label">
      <input type="checkbox" id="q-submit-license" required>
      我确认本题为原创内容或符合知识共享协议，并同意按 <strong>CC BY-SA 4.0</strong> 许可协议将内容公开发布到 Physics Learning Wiki 题库． <span class="submit-required">*</span>
    </label>
  </div>

  <div class="submit-field">
    <div id="turnstile-widget"></div>
  </div>

  <div class="submit-actions">
    <button type="submit" id="q-submit-btn">提交题目投稿</button>
    <span id="q-submit-status"></span>
  </div>
</form>

<div id="q-submit-success" style="display: none;" class="submit-success-card">
  <h2>🎉 题目投稿已成功提交！</h2>
  <p>感谢您对开放物理题库的贡献！编辑组将在 3-5 个工作日内进行同行审阅、分类整理并合并入库．您可以保存下方 Issue 链接关注审阅进展：</p>
  <p><a id="q-submit-issue-link" href="#" target="_blank" rel="noopener noreferrer"></a></p>
  <p>如果您拥有 GitHub 账号，欢迎在 Issue 中参与交流讨论！</p>
  <p><a class="md-button md-button--primary" href="../../quiz/">返回知识小测首页</a></p>
</div>
