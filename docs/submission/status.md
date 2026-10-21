---
title: 投稿进度与稿件管理
description: 查询投稿进度，使用管理回执修订或申请撤稿．
comments: false
status: review
---

输入回执中的投稿编号可查询公开进度．导入管理回执后，可继续修订和申请撤稿；管理凭证仅通过请求头发送．

<section id="plw-submission-status">
  <form id="submission-lookup-form">
    <div class="submit-field">
      <label for="submission-lookup-id">投稿编号</label>
      <input id="submission-lookup-id" type="text" required autocomplete="off" placeholder="填写管理回执中的投稿编号">
    </div>
    <button class="submit-button submit-button--primary" type="submit">查询进度</button>
  </form>
  <div class="submit-field">
    <label for="submission-receipt-file">导入管理回执</label>
    <input id="submission-receipt-file" type="file" accept="application/json,.json">
  </div>
  <p id="submission-query-message" class="submit-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
  <div id="submission-query-result"></div>
  <section id="submission-author-actions" hidden>
    <p><a id="submission-edit-link" class="submit-button" href="#">编辑最新版本</a></p>
    <form id="submission-withdraw-form">
      <div class="submit-field">
        <label for="submission-withdraw-reason">撤稿申请说明</label>
        <textarea id="submission-withdraw-reason" required maxlength="2000"></textarea>
      </div>
      <div id="turnstile-widget"></div>
      <div class="submit-actions">
        <button id="submission-withdraw-submit" class="submit-button" type="submit">提交撤稿申请</button>
      </div>
    </form>
    <p>撤稿申请由维护者审核，实际下线后才会标记「已撤回」．关闭 GitHub Issue 表示处理结束，不会自动撤稿．</p>
  </section>
</section>

无法找回回执时，请通过 [编辑组邮箱](mailto:submit@folderrewind.top) 人工核验．公开 Issue 编号不能作为稿件修改凭证．
