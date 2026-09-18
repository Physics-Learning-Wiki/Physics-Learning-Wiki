<!-- docs/submit.md -->

## 提交你的物理知识

感谢你愿意为 Physics Learning Wiki 做出贡献！填写下方表单即可提交内容，无需 GitHub 账号．

***

> 提示：如果你希望为题库贡献自测练习题，请前往专用通道：[贡献题目](/quiz/contribute/)。

<form id="submission-form" method="post" onsubmit="return false">
  <div class="submit-field">
    <label for="submit-type">投稿类型 <span class="submit-required">*</span></label>
    <select id="submit-type" name="type" required>
      <option value="">-- 请选择 --</option>
      <option value="full-page">完整页面 — 结构完整、可直接发布的文章</option>
      <option value="notes">笔记/提纲 — 课堂笔记、复习提纲、思维导图等半成品</option>
      <option value="errata">勘误纠错 — 指出现有页面的错误并提供修正</option>
      <option value="suggestion">建议/想法 — 对网站结构、内容方向的意见</option>
    </select>
  </div>

  <div class="submit-field">
    <label>目标章节（选填）</label>
    <div class="submit-chapter-cascade">
      <select id="submit-chapter-major" aria-label="一级分类">
        <option value="">-- 一级分类 --</option>
      </select>
      <select id="submit-chapter-minor" aria-label="二级/具体小节" disabled>
        <option value="">-- 请先选择一级分类 --</option>
      </select>
    </div>
    <input type="hidden" id="submit-chapter" name="chapter" value="">
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
