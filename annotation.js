/**
 * 党建数字化平台 - 页面批注组件
 * 支持在页面及弹窗/表单等覆盖层上任意位置添加标注。
 * 数据默认落本地 localStorage，便于演示。
 * 替换真实后端：修改 AnnotationAPI 中的 fetch 调用即可。
 *
 * 后端接口契约（供参考）：
 * GET  /api/annotations?pagePath={pagePath}        -> { code, data: [Annotation] }
 * POST /api/annotations                             -> body: Annotation, response: { code, data: Annotation }
 * PUT  /api/annotations/{id}                        -> body: Annotation, response: { code, data: Annotation }
 * DELETE /api/annotations/{id}                      -> { code }
 *
 * Annotation 结构：
 * {
 *   id: string,
 *   pagePath: string,
 *   containerId: string,  // 'page' 或弹窗容器的 id
 *   containerType: 'page' | 'modal',
 *   x: number,            // 相对于容器左上角的百分比 0-100
 *   y: number,
 *   content: string,
 *   type: 'question' | 'suggest' | 'bug' | 'other',
 *   status: 'open' | 'resolved',
 *   author: string,
 *   createTime: string,
 *   updateTime: string
 * }
 */
(function() {
  'use strict';

  // ===== API 层：当前使用 localStorage 模拟，可替换为真实 fetch =====
  var AnnotationAPI = {
    storageKey: 'party-building-annotations',

    getAll: function(pagePath) {
      var list = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return list.filter(function(item) { return item.pagePath === pagePath; });
    },

    create: function(data) {
      var list = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      var now = new Date().toISOString();
      var anno = {
        id: 'anno_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        pagePath: data.pagePath,
        containerId: data.containerId || 'page',
        containerType: data.containerType || 'page',
        x: data.x,
        y: data.y,
        content: data.content || '',
        type: data.type || 'other',
        status: data.status || 'open',
        author: data.author || '当前用户',
        createTime: now,
        updateTime: now
      };
      list.push(anno);
      localStorage.setItem(this.storageKey, JSON.stringify(list));
      return anno;
    },

    update: function(id, data) {
      var list = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      var idx = list.findIndex(function(item) { return item.id === id; });
      if (idx === -1) return null;
      var anno = list[idx];
      anno.content = data.content !== undefined ? data.content : anno.content;
      anno.type = data.type !== undefined ? data.type : anno.type;
      anno.status = data.status !== undefined ? data.status : anno.status;
      anno.updateTime = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(list));
      return anno;
    },

    delete: function(id) {
      var list = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      list = list.filter(function(item) { return item.id !== id; });
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    }
  };

  // ===== UI 层 =====
  var AnnotationUI = {
    active: false,
    annotations: [],
    currentPage: '',
    selectedId: null,
    tempContainer: null,

    init: function() {
      this.currentPage = location.pathname;
      this.annotations = AnnotationAPI.getAll(this.currentPage);
      this.createFab();
      this.createModeBar();
      this.createOverlay();
      this.createEditor();
      this.createPanel();
      this.renderMarkers();
      this.observeModals();
    },

    // 创建浮动入口
    createFab: function() {
      var btn = document.createElement('button');
      btn.className = 'anno-fab';
      btn.title = '页面批注';
      btn.innerHTML = '✎';
      btn.addEventListener('click', this.toggleMode.bind(this));
      document.body.appendChild(btn);
      this.fab = btn;
    },

    // 创建顶部模式提示条
    createModeBar: function() {
      var bar = document.createElement('div');
      bar.className = 'anno-mode-bar';
      bar.innerHTML = '<span>点击页面或弹窗内任意位置添加批注</span>' +
        '<button class="anno-mode-list">批注列表</button>' +
        '<button class="anno-mode-cancel">退出</button>';
      document.body.appendChild(bar);
      this.modeBar = bar;

      bar.querySelector('.anno-mode-list').addEventListener('click', this.openPanel.bind(this));
      bar.querySelector('.anno-mode-cancel').addEventListener('click', this.disableMode.bind(this));
    },

    // 创建遮罩
    createOverlay: function() {
      var overlay = document.createElement('div');
      overlay.className = 'anno-overlay';
      document.body.appendChild(overlay);
      this.overlay = overlay;
    },

    // 创建编辑弹窗
    createEditor: function() {
      var editor = document.createElement('div');
      editor.className = 'anno-editor';
      editor.innerHTML =
        '<div class="anno-editor-header">' +
          '<span>批注</span>' +
          '<button class="anno-editor-close">&times;</button>' +
        '</div>' +
        '<div class="anno-editor-body">' +
          '<textarea placeholder="请输入批注内容..."></textarea>' +
          '<div class="anno-editor-meta">' +
            '<select class="anno-editor-type">' +
              '<option value="question">疑问</option>' +
              '<option value="suggest">建议</option>' +
              '<option value="bug">问题</option>' +
              '<option value="other">其他</option>' +
            '</select>' +
            '<select class="anno-editor-status" style="display:none">' +
              '<option value="open">待处理</option>' +
              '<option value="resolved">已解决</option>' +
            '</select>' +
          '</div>' +
          '<div class="anno-editor-actions">' +
            '<button class="anno-btn-danger anno-editor-delete" style="margin-right:auto">删除</button>' +
            '<button class="anno-btn-default anno-editor-cancel">取消</button>' +
            '<button class="anno-btn-primary anno-editor-save">保存</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(editor);
      this.editor = editor;

      editor.querySelector('.anno-editor-close').addEventListener('click', this.hideEditor.bind(this));
      editor.querySelector('.anno-editor-cancel').addEventListener('click', this.hideEditor.bind(this));
      editor.querySelector('.anno-editor-save').addEventListener('click', this.saveEditor.bind(this));
      editor.querySelector('.anno-editor-delete').addEventListener('click', this.deleteCurrent.bind(this));
    },

    // 创建批注列表面板
    createPanel: function() {
      var mask = document.createElement('div');
      mask.className = 'anno-panel-mask';
      mask.addEventListener('click', this.closePanel.bind(this));
      document.body.appendChild(mask);
      this.panelMask = mask;

      var panel = document.createElement('div');
      panel.className = 'anno-panel';
      panel.innerHTML =
        '<div class="anno-panel-header">' +
          '<span class="anno-panel-title">页面批注</span>' +
          '<button class="anno-panel-close">&times;</button>' +
        '</div>' +
        '<div class="anno-panel-body"></div>';
      document.body.appendChild(panel);
      this.panel = panel;

      panel.querySelector('.anno-panel-close').addEventListener('click', this.closePanel.bind(this));
    },

    // 切换批注模式
    toggleMode: function() {
      if (this.active) {
        this.disableMode();
      } else {
        this.enableMode();
      }
    },

    enableMode: function() {
      this.active = true;
      document.body.classList.add('anno-cursor-crosshair');
      this.fab.classList.add('active');
      this.modeBar.classList.add('show');
      this.overlay.classList.add('show');
      this.hideEditor();
      document.addEventListener('click', this.onPageClick, true);
    },

    disableMode: function() {
      this.active = false;
      document.body.classList.remove('anno-cursor-crosshair');
      this.fab.classList.remove('active');
      this.modeBar.classList.remove('show');
      this.overlay.classList.remove('show');
      this.hideEditor();
      document.removeEventListener('click', this.onPageClick, true);
    },

    // 检测点击位置所在的容器
    getContainerInfo: function(e) {
      var modal = e.target.closest('.modal-mask, .modal, [class*="dialog"], [class*="drawer"], [class*="popup"]');
      if (modal) {
        // 为无 id 的弹窗生成稳定 id
        if (!modal.id) {
          modal.id = 'anno-modal-' + Math.random().toString(36).slice(2, 8);
        }
        var rect = modal.getBoundingClientRect();
        return {
          el: modal,
          id: modal.id,
          type: 'modal',
          rect: rect
        };
      }
      return {
        el: document.body,
        id: 'page',
        type: 'page',
        rect: { left: 0, top: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
      };
    },

    onPageClick: function(e) {
      if (!AnnotationUI.active) return;
      var uiSelectors = '.anno-fab, .anno-mode-bar, .anno-editor, .anno-panel, .anno-panel-mask, .anno-marker';
      if (e.target.closest(uiSelectors)) return;

      var container = AnnotationUI.getContainerInfo(e);
      // 弹窗容器需处于显示状态
      if (container.type === 'modal' && container.el.style.display === 'none') return;

      var x = ((e.clientX - container.rect.left) / container.rect.width) * 100;
      var y = ((e.clientY - container.rect.top) / container.rect.height) * 100;

      // 限制在容器范围内
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));

      AnnotationUI.tempContainer = container;
      AnnotationUI.showEditor(null, { x: x, y: y });
    },

    showEditor: function(annotation, position) {
      this.selectedId = annotation ? annotation.id : null;
      var textarea = this.editor.querySelector('textarea');
      var typeSelect = this.editor.querySelector('.anno-editor-type');
      var statusSelect = this.editor.querySelector('.anno-editor-status');
      var deleteBtn = this.editor.querySelector('.anno-editor-delete');

      if (annotation) {
        textarea.value = annotation.content || '';
        typeSelect.value = annotation.type || 'other';
        statusSelect.value = annotation.status || 'open';
        statusSelect.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
      } else {
        textarea.value = '';
        typeSelect.value = 'question';
        statusSelect.value = 'open';
        statusSelect.style.display = 'none';
        deleteBtn.style.display = 'none';
        this.tempPosition = position;
      }

      // 定位编辑器：优先使用当前容器坐标
      var editorX = annotation ? annotation.x : position.x;
      var editorY = annotation ? annotation.y : position.y;
      var container = this.tempContainer || this.getContainerByAnnotation(annotation);
      if (container && container.el !== document.body) {
        var rect = container.el.getBoundingClientRect();
        var absX = rect.left + (editorX / 100) * rect.width;
        var absY = rect.top + (editorY / 100) * rect.height;
        this.editor.style.left = Math.min(absX + 20, window.innerWidth - 340) + 'px';
        this.editor.style.top = Math.min(absY + 20, window.innerHeight - 240) + 'px';
      } else {
        this.editor.style.left = Math.min(editorX, 85) + '%';
        this.editor.style.top = Math.min(editorY + 3, 80) + '%';
      }
      this.editor.classList.add('show');

      this.highlightMarker(this.selectedId);
    },

    getContainerByAnnotation: function(annotation) {
      if (!annotation || annotation.containerType === 'page' || annotation.containerId === 'page') {
        return { el: document.body, id: 'page', type: 'page' };
      }
      var el = document.getElementById(annotation.containerId);
      if (el) return { el: el, id: annotation.containerId, type: 'modal' };
      return { el: document.body, id: 'page', type: 'page' };
    },

    hideEditor: function() {
      this.editor.classList.remove('show');
      this.tempPosition = null;
      this.tempContainer = null;
      this.selectedId = null;
      this.highlightMarker(null);
    },

    saveEditor: function() {
      var content = this.editor.querySelector('textarea').value.trim();
      if (!content) return alert('请输入批注内容');

      var type = this.editor.querySelector('.anno-editor-type').value;
      var status = this.editor.querySelector('.anno-editor-status').value;

      if (this.selectedId) {
        AnnotationAPI.update(this.selectedId, { content: content, type: type, status: status });
      } else if (this.tempPosition && this.tempContainer) {
        AnnotationAPI.create({
          pagePath: this.currentPage,
          containerId: this.tempContainer.id,
          containerType: this.tempContainer.type,
          x: this.tempPosition.x,
          y: this.tempPosition.y,
          content: content,
          type: type,
          status: status
        });
      }

      this.refresh();
      this.hideEditor();
    },

    deleteCurrent: function() {
      if (!this.selectedId) return;
      if (!confirm('确定删除该批注？')) return;
      AnnotationAPI.delete(this.selectedId);
      this.refresh();
      this.hideEditor();
    },

    refresh: function() {
      this.annotations = AnnotationAPI.getAll(this.currentPage);
      this.renderMarkers();
      this.renderPanelList();
    },

    // 渲染所有标记
    renderMarkers: function() {
      var self = this;
      // 页面级批注
      var pageAnnotations = this.annotations.filter(function(a) { return a.containerType === 'page' || a.containerId === 'page'; });
      this.renderMarkersInContainer(document.body, pageAnnotations, 'page');

      // 弹窗级批注
      var modalAnnotations = this.annotations.filter(function(a) { return a.containerType === 'modal' && a.containerId !== 'page'; });
      var modalMap = {};
      modalAnnotations.forEach(function(a) {
        if (!modalMap[a.containerId]) modalMap[a.containerId] = [];
        modalMap[a.containerId].push(a);
      });
      Object.keys(modalMap).forEach(function(containerId) {
        var el = document.getElementById(containerId);
        if (el) {
          self.renderMarkersInContainer(el, modalMap[containerId], containerId);
        }
      });
    },

    renderMarkersInContainer: function(container, annotations, containerId) {
      // 清除该容器内的旧标记
      var oldMarkers = container.querySelectorAll('.anno-marker[data-container="' + containerId + '"]');
      oldMarkers.forEach(function(m) { m.remove(); });

      var self = this;
      annotations.forEach(function(anno, idx) {
        var marker = document.createElement('div');
        marker.className = 'anno-marker' + (anno.status === 'resolved' ? ' anno-resolved' : '');
        marker.setAttribute('data-container', containerId);
        marker.textContent = idx + 1;
        marker.style.left = anno.x + '%';
        marker.style.top = anno.y + '%';
        marker.title = anno.content;
        marker.addEventListener('click', function(e) {
          e.stopPropagation();
          self.tempContainer = self.getContainerByAnnotation(anno);
          self.showEditor(anno);
        });
        container.appendChild(marker);
      });
    },

    highlightMarker: function(id) {
      document.querySelectorAll('.anno-marker').forEach(function(m) { m.classList.remove('active'); });
      if (!id) return;
      var idx = this.annotations.findIndex(function(a) { return a.id === id; });
      var markers = document.querySelectorAll('.anno-marker');
      if (markers[idx]) markers[idx].classList.add('active');
    },

    // 监听弹窗显示，自动渲染标记
    observeModals: function() {
      var self = this;
      var observer = new MutationObserver(function(mutations) {
        var shouldRender = false;
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
            var target = mutation.target;
            if (target.classList && (target.classList.contains('modal-mask') || target.classList.contains('modal') || target.classList.contains('modal-dialog'))) {
              shouldRender = true;
            }
          }
          if (mutation.type === 'childList') {
            Array.from(mutation.addedNodes).forEach(function(node) {
              if (node.nodeType === 1 && (node.classList.contains('modal-mask') || node.classList.contains('modal') || node.querySelector('.modal-mask, .modal'))) {
                shouldRender = true;
              }
            });
          }
        });
        if (shouldRender) {
          self.annotations = AnnotationAPI.getAll(self.currentPage);
          self.renderMarkers();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    },

    // 批注列表面板
    openPanel: function() {
      this.renderPanelList();
      this.panel.classList.add('show');
      this.panelMask.classList.add('show');
    },

    closePanel: function() {
      this.panel.classList.remove('show');
      this.panelMask.classList.remove('show');
    },

    renderPanelList: function() {
      var body = this.panel.querySelector('.anno-panel-body');
      if (!this.annotations.length) {
        body.innerHTML = '<div class="anno-panel-empty">暂无批注<br>点击右下角按钮进入批注模式</div>';
        return;
      }

      var html = '';
      this.annotations.forEach(function(anno, idx) {
        var typeLabels = { question: '疑问', suggest: '建议', bug: '问题', other: '其他' };
        var typeClass = 'anno-tag-' + (anno.status === 'resolved' ? 'resolved' : anno.type);
        var label = anno.status === 'resolved' ? '已解决' : (typeLabels[anno.type] || '其他');
        var time = anno.updateTime ? anno.updateTime.slice(0, 16).replace('T', ' ') : '';
        var scopeLabel = anno.containerType === 'modal' ? '弹窗' : '页面';
        html +=
          '<div class="anno-item" data-id="' + anno.id + '">' +
            '<div class="anno-item-header">' +
              '<span class="anno-item-author">' + (anno.author || '匿名') + '</span>' +
              '<span class="anno-item-time">' + time + '</span>' +
            '</div>' +
            '<div class="anno-item-text">' + escapeHtml(anno.content || '') + '</div>' +
            '<span class="anno-item-tag ' + typeClass + '">' + label + '</span>' +
            '<span class="anno-item-tag anno-tag-other">' + scopeLabel + '</span>' +
          '</div>';
      });
      body.innerHTML = html;

      var self = this;
      body.querySelectorAll('.anno-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          var anno = self.annotations.find(function(a) { return a.id === id; });
          if (anno) {
            self.closePanel();
            self.tempContainer = self.getContainerByAnnotation(anno);
            self.showEditor(anno);
          }
        });
      });
    }
  };

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 稳定的页面点击事件处理器
  AnnotationUI.onPageClick = function(e) {
    if (!AnnotationUI.active) return;
    var uiSelectors = '.anno-fab, .anno-mode-bar, .anno-editor, .anno-panel, .anno-panel-mask, .anno-marker';
    if (e.target.closest(uiSelectors)) return;

    var container = AnnotationUI.getContainerInfo(e);
    if (container.type === 'modal' && container.el.style.display === 'none') return;

    var x = ((e.clientX - container.rect.left) / container.rect.width) * 100;
    var y = ((e.clientY - container.rect.top) / container.rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    AnnotationUI.tempContainer = container;
    AnnotationUI.showEditor(null, { x: x, y: y });
  };

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { AnnotationUI.init(); });
  } else {
    AnnotationUI.init();
  }
})();
