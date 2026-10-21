---
title: 贡献题集
description: 选取已有题目并编写新题，编排可复用的物理练习题集．
comments: false
hide:
  - toc
---

将现有题目与自编新题组织成一套学习练习．题集编排和每道新题分别审核，新题入库后也可被其他题集复用．请保存投稿成功后提供的管理回执，以便查询或修订．

<div id="plw-quiz-set-contribute">
  <noscript>题集编辑器需要 JavaScript；启用后可在本机编辑、导出草稿和投稿．</noscript>
  <p id="set-message" role="alert" aria-live="polite"></p>
  <p id="set-draft-notice" role="status">草稿仅保存在本机；管理凭证与许可确认分别处理．</p>
  <div class="set-toolbar">
    <button type="button" id="set-restore">恢复本机草稿</button>
    <button type="button" id="set-discard">忽略旧草稿</button>
    <button type="button" id="set-export">导出 JSON 草稿</button>
    <label for="set-import">导入 JSON 草稿</label><input id="set-import" type="file" accept="application/json,.json">
  </div>
  <nav class="set-toolbar" aria-label="题集编辑步骤">
    <button type="button" data-set-step="1">1．基本信息</button>
    <button type="button" data-set-step="2">2．编排题目</button>
    <button type="button" data-set-step="3">3．预览投稿</button>
  </nav>
  <form id="plw-quiz-set-form">
    <fieldset id="set-editor-fields" disabled>
    <section data-set-panel="1">
      <h2>基本信息</h2>
      <label for="set-title">题集名称（必填）</label><input id="set-title" required maxlength="120" data-submission-field="/payload/title">
      <label for="set-content">简介与学习目标（必填）</label><textarea id="set-content" required maxlength="50000" rows="5" data-submission-field="/payload/content"></textarea>
      <label for="set-tags">标签（以逗号分隔）</label><input id="set-tags">
      <label for="set-attribution">编排署名（留空为匿名）</label><input id="set-attribution" maxlength="60">
      <label for="set-order">题目顺序</label><select id="set-order"><option value="fixed">固定顺序</option><option value="shuffle">随机顺序</option></select>
      <label for="set-feedback">反馈方式</label><select id="set-feedback"><option value="deferred">交卷后统一反馈</option><option value="immediate">逐题反馈</option></select>
      <fieldset>
        <legend>题集编排的来源</legend>
        <label for="set-source-kind">来源类型（必填）</label><select id="set-source-kind" required><option value="">请选择</option><option value="original">本人原创或整理</option><option value="adapted">根据已有作品改编</option></select>
        <label for="set-source-note">来源说明（必填）</label><textarea id="set-source-note" required maxlength="2000"></textarea>
        <div id="set-adapted" hidden><label for="set-source-url">原作品网址</label><input id="set-source-url" type="url"><label for="set-source-permission">改编授权依据</label><input id="set-source-permission" maxlength="2000"></div>
      </fieldset>
    </section>
    <section data-set-panel="2" hidden>
      <h2>编排题目</h2>
      <p>引用已有题目时保留原题作者与来源；新题独立记录署名和许可．移出题集只取消引用，已入库题目继续保留．</p>
      <label for="set-search">搜索题库（题干、编号、主题或概念 ID）</label><input id="set-search" type="search">
      <div id="set-search-results"></div>
      <button type="button" id="set-new">编写新题目</button>
      <h3>题单</h3><ol id="set-items"></ol>
      <h3>本次投稿的新题池</h3><div id="set-new-pool"></div>
    </section>
    <section data-set-panel="3" hidden>
      <h2>预览与投稿</h2>
      <p id="set-size" role="status"></p><div id="set-preview"></div>
      <button type="button" id="set-try">整卷试做</button>
      <p>新题分别审核并可先进入公共题库；题集须在所含题目全部可用且人工审批通过后发布．超过传输体积时请导出草稿并拆分投稿．</p>
      <label><input id="set-license" type="checkbox" data-submission-field="/licenseConsent"> 我确认有权分享题集编排及本次新题，同意按 CC BY-SA 4.0 许可公开发布，并已分别说明来源．</label>
      <div id="set-turnstile"></div>
      <button type="submit" class="submit-button submit-button--primary">提交题集投稿</button>
    </section>
    </fieldset>
  </form>
  <div id="set-question-editor" hidden></div>
  <div id="set-trial" class="plw-quiz-question" hidden></div>
  <!-- plw:question-editor-template -->
</div>
