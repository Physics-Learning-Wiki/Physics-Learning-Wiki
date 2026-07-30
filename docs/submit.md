<!-- docs/submit.md -->

## 提交你的物理知识

感谢你愿意为 Physics Learning Wiki 做出贡献！填写下方表单即可提交内容，无需 GitHub 账号．

***

<form id="submission-form" method="post" onsubmit="return false">
  <div class="submit-field">
    <label for="submit-type">投稿类型 <span class="submit-required">*</span></label>
    <select id="submit-type" name="type" required>
      <option value="">-- 请选择 --</option>
      <option value="full-page">完整页面 — 结构完整、可直接发布的文章</option>
      <option value="notes">笔记/提纲 — 课堂笔记、复习提纲、思维导图等半成品</option>
      <option value="errata">勘误纠错 — 指出现有页面的错误并提供修正</option>
      <option value="question">题目投稿 — 为题库提交一道结构化练习题</option>
      <option value="suggestion">建议/想法 — 对网站结构、内容方向的意见</option>
    </select>
  </div>

  <fieldset id="question-fields" class="submit-question-fields" hidden>
    <legend>题目结构</legend>
    <div class="submit-field">
      <label for="question-page">对应学习页面 <span class="submit-required">*</span></label>
      <select id="question-page"><option value="">-- 请选择 --</option></select>
    </div>
    <div class="submit-field">
      <label for="question-objective">主要学习目标 <span class="submit-required">*</span></label>
      <select id="question-objective"><option value="">-- 请先选择页面 --</option></select>
    </div>
    <div class="submit-field">
      <label for="question-concepts">概念 ID（逗号分隔） <span class="submit-required">*</span></label>
      <input id="question-concepts" placeholder="例如 newton.net-force">
    </div>
    <div class="submit-field">
      <label for="question-type">题型 <span class="submit-required">*</span></label>
      <select id="question-type">
        <option value="single_choice">单选题</option>
        <option value="multiple_choice">多选题</option>
        <option value="true_false">判断题</option>
        <option value="numeric">数值题</option>
      </select>
    </div>
    <div class="submit-field question-choice-only">
      <label for="question-choices">选项（每行“ID|内容”） <span class="submit-required">*</span></label>
      <textarea id="question-choices" placeholder="A|第一个选项&#10;B|第二个选项"></textarea>
    </div>
    <div class="submit-field">
      <label for="question-answer">正确答案 <span class="submit-required">*</span></label>
      <input id="question-answer" placeholder="单选 A；多选 A,C；判断 true/false；数值 3">
    </div>
    <div class="submit-field question-choice-only">
      <label for="question-choice-feedback">逐项反馈（每行“ID|反馈”） <span class="submit-required">*</span></label>
      <textarea id="question-choice-feedback" placeholder="A|为什么正确或错误&#10;B|为什么正确或错误"></textarea>
    </div>
    <div class="submit-field">
      <label for="question-correct-feedback">答对反馈 <span class="submit-required">*</span></label>
      <input id="question-correct-feedback">
    </div>
    <div class="submit-field">
      <label for="question-incorrect-feedback">答错反馈 <span class="submit-required">*</span></label>
      <input id="question-incorrect-feedback">
    </div>
    <div class="submit-field">
      <label for="question-solution">完整解析 <span class="submit-required">*</span></label>
      <textarea id="question-solution"></textarea>
    </div>
    <div class="submit-field">
      <label for="question-hints">提示（每行一条）</label>
      <textarea id="question-hints"></textarea>
    </div>
    <div class="submit-field submit-question-grid">
      <label>难度
        <select id="question-difficulty"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
      </label>
      <label>认知层级
        <select id="question-cognitive"><option value="understand">理解</option><option value="apply">应用</option><option value="analyze">分析</option><option value="remember">记忆</option></select>
      </label>
      <label>风格
        <select id="question-style"><option value="conceptual">概念</option><option value="graphical">图像</option><option value="computational">计算</option><option value="modeling">建模</option></select>
      </label>
      <label>预计秒数 <input id="question-seconds" type="number" min="10" max="1800" value="60"></label>
    </div>
    <div class="submit-field">
      <label for="question-image-url">参考图片 HTTPS 链接（选填）</label>
      <input id="question-image-url" type="url" placeholder="https://...">
      <input id="question-image-alt" placeholder="图片替代文本">
      <input id="question-image-rights" placeholder="图片来源与授权说明">
    </div>
    <label><input id="question-ai-assisted" type="checkbox"> 本题使用了 AI 辅助，并同意如实披露</label>
    <label><input id="question-license" type="checkbox"> 我确认有权按 CC BY-SA 4.0 提交此题 <span class="submit-required">*</span></label>
  </fieldset>

  <div class="submit-field">
    <label for="submit-chapter">目标章节</label>
    <select id="submit-chapter" name="chapter">
      <option value="">-- 可选，帮助编辑组分类 --</option>
    </select>
  </div>

  <div class="submit-field">
    <label for="submit-title">标题 <span class="submit-required">*</span></label>
    <input type="text" id="submit-title" name="title" required
           placeholder="给你的投稿起个名字" maxlength="120">
  </div>

  <div class="submit-field">
    <label for="submit-content">正文 <span class="submit-required">*</span></label>
    <textarea id="submit-content" name="content"></textarea>
    <div class="submit-hint" id="submit-hint"></div>
  </div>

  <div class="submit-field">
    <label>署名方式</label>
    <div class="submit-radio-group">
      <label><input type="radio" name="attribution-type" value="named" checked> 姓名/网名</label>
      <label><input type="radio" name="attribution-type" value="anonymous"> 匿名</label>
    </div>
    <input type="text" id="submit-attribution" name="attribution"
           placeholder="你希望在页面上显示的署名" maxlength="60">
  </div>

  <div class="submit-field">
    <label for="submit-contact">联系方式（选填）</label>
    <input type="text" id="submit-contact" name="contact"
           placeholder="该内容会公开显示在 GitHub Issue 中">
    <label class="submit-public-consent"><input type="checkbox" id="submit-contact-public">
      我理解并同意将上述联系方式公开发布到 GitHub Issue
    </label>
  </div>

  <div class="submit-field">
    <div id="turnstile-widget"></div>
  </div>

  <div class="submit-actions">
    <button type="submit" id="submit-btn">提交投稿</button>
    <span id="submit-status"></span>
  </div>
</form>

<div id="submit-success">
  <h2>投稿已提交！</h2>
  <p>编辑组将在 3-5 天内处理．如需跟进，请保存此链接：</p>
  <p><a id="submit-issue-link" href="#" target="_blank"></a></p>
  <p>如果你愿意注册 GitHub 账号并在 Issue 中参与讨论，修改会更高效．</p>
</div>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback" defer></script>
