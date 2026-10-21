---

status: review
description: "向本站提交物理学习内容、笔记与修订建议．"
---

<!-- docs/submit.md -->

## 提交你的物理知识

感谢你愿意为 Physics Learning Wiki 做出贡献！填写下方表单即可提交内容，无需 GitHub 账号．

***

??? note "补充说明"
    提示：如果你希望为题库贡献自测练习题，请前往专用通道：[贡献题目](quiz/contribute.md)．

<form id="submission-form" method="post" onsubmit="return false">
  <div class="submit-field">
    <label for="submit-type">投稿类型 <span class="submit-required">*</span></label>
    <select id="submit-type" data-submission-field="/type" name="type" required>
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
    <input type="hidden" id="submit-chapter" data-submission-field="/payload/chapter" name="chapter" value="">
  </div>

  <div class="submit-field">
    <label for="submit-title">标题 <span class="submit-required">*</span></label>
    <input type="text" id="submit-title" data-submission-field="/payload/title" name="title" required
           placeholder="给你的投稿起个名字" maxlength="120">
  </div>

  <div class="submit-field">
    <label for="submit-content">正文 <span class="submit-required">*</span></label>
    <textarea id="submit-content" data-submission-field="/payload/content" name="content"></textarea>
    <div class="submit-hint" id="submit-hint"></div>
  </div>

  <div class="submit-field">
    <label>署名方式</label>
    <div class="submit-radio-group">
      <label><input type="radio" name="attribution-type" value="named" checked> 姓名/网名</label>
      <label><input type="radio" name="attribution-type" value="anonymous"> 匿名</label>
    </div>
    <label for="submit-attribution">署名名称</label>
    <input type="text" id="submit-attribution" data-submission-field="/payload/attribution" name="attribution"
           placeholder="你希望在页面上显示的署名" maxlength="60">
  </div>



  <fieldset class="submit-field" data-submission-field="/sourceDeclaration">
    <legend>来源与许可</legend>
    <label for="submission-source-kind">内容来源 <span class="submit-required">*</span></label>
    <select id="submission-source-kind" required data-submission-field="/sourceDeclaration/kind">
      <option value="">-- 请选择 --</option>
      <option value="original">本人原创或整理</option>
      <option value="adapted">根据已有作品改编</option>
    </select>
    <label for="submission-source-note">来源说明 <span class="submit-required">*</span></label>
    <textarea id="submission-source-note" required maxlength="2000" data-submission-field="/sourceDeclaration/note" placeholder="说明原创过程、整理依据或参考资料"></textarea>
    <div data-adapted-source hidden>
      <label for="submission-source-url">原作品网址</label>
      <input type="url" id="submission-source-url" data-submission-field="/sourceDeclaration/source">
      <label for="submission-source-permission">改编授权依据</label>
      <input type="text" id="submission-source-permission" maxlength="2000" data-submission-field="/sourceDeclaration/permission">
    </div>
    <label class="submit-checkbox-label"><input type="checkbox" id="submit-license" required data-submission-field="/licenseConsent"> 我有权分享上述内容，并明确同意按 CC BY-SA 4.0 许可公开发布．</label>
  </fieldset>

  <div class="submit-field">
    <div id="turnstile-widget"></div>
  </div>

  <div class="submit-actions">
    <button type="submit" id="submit-btn" class="submit-button submit-button--primary">提交投稿</button>
    <span id="submit-status" role="alert" aria-live="assertive" aria-atomic="true"></span>
  </div>
</form>

<div id="submit-success">
  <h2>投稿已提交！</h2>
  <p>编辑组会尽力处理，处理时间取决于审核队列与稿件情况．请保存管理回执主动查询进度：</p>
  <p><a id="submit-issue-link" href="#" target="_blank"></a></p>
  <p>可使用管理回执修订或申请撤稿，无需 GitHub 账号．网站不收集联系方式；人工补救请联系 submit@folderrewind.top．</p>
</div>
