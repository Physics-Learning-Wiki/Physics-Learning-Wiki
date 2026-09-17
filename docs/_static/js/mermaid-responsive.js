/**
 * mermaid-responsive.js
 * 解决 MkDocs Material 中 Mermaid 图表被封装在 closed Shadow DOM 中导致：
 * 1. 外部 CSS 无法穿透设置 min-width / overflow
 * 2. 超宽图表被 SVG width: 100% 强制无底线等比压缩至极小字号且无法触发横向滚动条
 * 
 * 机制：
 * 1. 拦截 Element.prototype.attachShadow 将 .mermaid 宿主的 shadow DOM 设为 open
 * 2. 捕获生成的 SVG，读取其天然 viewBox 宽度
 * 3. 动态向 Shadow DOM 注入保障样式与 Light DOM 滚动条规则，确保图表清晰且超宽时产生横向滚动条
 */
(function () {
  'use strict';

  var origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    var isMermaid = this.classList && this.classList.contains('mermaid');
    var shadow = origAttachShadow.call(
      this,
      isMermaid ? Object.assign({}, init, { mode: 'open' }) : init
    );

    if (isMermaid) {
      var host = this;
      setupMermaidHost(host, shadow);
    }
    return shadow;
  };

  function setupMermaidHost(host, shadow) {
    var svg = shadow.querySelector('svg');
    if (svg) {
      applyStyles(host, shadow, svg);
      return;
    }

    var observer = new MutationObserver(function () {
      var s = shadow.querySelector('svg');
      if (s) {
        observer.disconnect();
        applyStyles(host, shadow, s);
      }
    });
    observer.observe(shadow, { childList: true, subtree: true });
  }

  function applyStyles(host, shadow, svg) {
    if (shadow.querySelector('style[data-mermaid-responsive]')) {
      return;
    }

    var naturalWidth = 0;
    var viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      var parts = viewBox.trim().split(/\s+/);
      if (parts.length >= 3) {
        naturalWidth = parseFloat(parts[2]);
      }
    }
    if (!naturalWidth && svg.style.maxWidth) {
      naturalWidth = parseFloat(svg.style.maxWidth);
    }

    // 宿主元素设置滚动容器属性
    host.style.setProperty('overflow-x', 'auto', 'important');
    host.style.setProperty('overflow-y', 'hidden', 'important');
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('max-width', '100%', 'important');
    host.style.setProperty('-webkit-overflow-scrolling', 'touch');

    // 向 Shadow DOM 注入独立样式，覆盖 Mermaid 内联的压缩行为
    var minW = naturalWidth && naturalWidth > 300 ? Math.round(naturalWidth) : 0;
    var style = document.createElement('style');
    style.setAttribute('data-mermaid-responsive', 'true');

    style.textContent = [
      ':host {',
      '  display: block !important;',
      '  overflow-x: auto !important;',
      '  overflow-y: hidden !important;',
      '  max-width: 100% !important;',
      '  -webkit-overflow-scrolling: touch;',
      '  scrollbar-width: thin;',
      '}',
      'svg {',
      '  display: block !important;',
      '  margin: 0 auto !important;',
      minW ? '  min-width: ' + minW + 'px !important;' : '',
      minW ? '  width: ' + minW + 'px !important;' : '',
      '  max-width: none !important;',
      '  height: auto !important;',
      '}'
    ].join('\n');

    shadow.appendChild(style);
  }

  function scanExisting() {
    document.querySelectorAll('.mermaid').forEach(function (host) {
      if (host.shadowRoot) {
        var svg = host.shadowRoot.querySelector('svg');
        if (svg) {
          applyStyles(host, host.shadowRoot, svg);
        }
      }
    });
  }

  if (window.document$) {
    window.document$.subscribe(scanExisting);
  } else {
    document.addEventListener('DOMContentLoaded', scanExisting);
  }
})();
