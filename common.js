/**
 * 党建数字化平台 - 通用交互脚本
 * 自动检测页面元素并绑定交互，所有页面引入即可
 */
(function() {
  'use strict';

  // ===== 工具函数 =====
  function $(selector, ctx) { return (ctx || document).querySelector(selector); }
  function $$(selector, ctx) { return Array.from((ctx || document).querySelectorAll(selector)); }

  function getRowData(row) {
    var cells = row.querySelectorAll('td');
    var data = {};
    var headers = row.closest('table')?.querySelectorAll('th');
    cells.forEach(function(td, i) {
      var key = headers && headers[i] ? headers[i].textContent.trim() : 'col' + i;
      data[key] = td.textContent.trim();
    });
    return data;
  }

  function getText(el) {
    return el ? el.textContent.trim() : '';
  }

  // ===== 1. 侧边栏菜单展开/收起 =====
  function initSidebarMenu() {
    $$('.menu-group .menu-title').forEach(function(title) {
      // 移除原有事件（避免重复绑定）
      var newTitle = title.cloneNode(true);
      title.parentNode.replaceChild(newTitle, title);
      
      newTitle.addEventListener('click', function(e) {
        e.stopPropagation();
        var group = this.closest('.menu-group');
        if (group) {
          group.classList.toggle('expanded');
        }
      });
    });
  }

  // ===== 2. Tab 切换（支持多种 Tab 结构） =====
  function initTabs() {
    // 通用 Tab: .tab-item[data-tab] + .tab-content[id]
    function bindTabItems(itemsSelector, contentsSelector, activeClass, idPrefix) {
      var items = $$(itemsSelector);
      if (!items.length) return;
      
      items.forEach(function(tab) {
        if (tab._tabBound) return;
        tab._tabBound = true;
        
        tab.addEventListener('click', function() {
          var target = this.getAttribute('data-tab');
          if (!target) return;
          
          var container = this.closest('.tabs, .profile-tabs, .filter-tabs, [class*="tab"]');
          var scope = container || document;
          
          // 切换 tab 激活态
          $$(itemsSelector, scope).forEach(function(t) { t.classList.remove(activeClass || 'active'); });
          this.classList.add(activeClass || 'active');
          
          // 切换内容显示
          var contents = $$(contentsSelector, scope);
          contents.forEach(function(c) { c.classList.remove(activeClass || 'active'); });
          
          var targetEl = document.getElementById(target) || document.querySelector('[data-content="' + target + '"]');
          if (targetEl) targetEl.classList.add(activeClass || 'active');
        });
      });
    }

    bindTabItems('.tab-item', '.tab-content', 'active', '');
    bindTabItems('.profile-tab', '.profile-tab-content', 'active', 'tab-');
    bindTabItems('.filter-tab', '.filter-tab-content', 'active', '');
    bindTabItems('.chart-tab', '.chart-tab-content', 'active', '');
  }

  // ===== 3. 分页交互 =====
  function initPagination() {
    $$('.pagination').forEach(function(pagination) {
      if (pagination._pgBound) return;
      pagination._pgBound = true;

      pagination.addEventListener('click', function(e) {
        var btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        
        var text = btn.textContent.trim();
        var activeBtn = pagination.querySelector('.page-btn.active');
        var currentPage = activeBtn ? parseInt(activeBtn.textContent) : 1;
        var newPage = currentPage;
        
        if (/^\d+$/.test(text)) {
          newPage = parseInt(text);
        } else if (text === '上一页' || text === '上页') {
          newPage = Math.max(1, currentPage - 1);
        } else if (text === '下一页' || text === '下页') {
          newPage = currentPage + 1;
        } else if (text === '首页') {
          newPage = 1;
        } else if (text === '末页') {
          // 找最后一个数字页
          var numBtns = $$('.page-btn', pagination).filter(function(b) { return /^\d+$/.test(b.textContent.trim()); });
          if (numBtns.length) newPage = parseInt(numBtns[numBtns.length - 1].textContent);
        }
        
        // 更新激活态
        var numBtns = $$('.page-btn', pagination).filter(function(b) { return /^\d+$/.test(b.textContent.trim()); });
        numBtns.forEach(function(b) { b.classList.remove('active'); });
        // 找对应页码按钮激活
        var target = numBtns.find(function(b) { return parseInt(b.textContent) === newPage; });
        if (target) target.classList.add('active');
        
        // 更新总记录文字
        var infoEl = pagination.querySelector('.pagination-info, .page-info');
        if (infoEl && infoEl.textContent.includes('第')) {
          infoEl.textContent = infoEl.textContent.replace(/第 \d+ \/ (\d+)/, '第 ' + newPage + ' / $1');
        }
      });
    });
  }

  // ===== 4. 表格操作按钮 =====
  var _tableActionsInited = false;
  function initTableActions() {
    if (_tableActionsInited) return;
    _tableActionsInited = true;
    document.addEventListener('click', function(e) {
      // 支持多种操作按钮：btn-link、action-link、quick-action-btn
      var btn = e.target.closest('.table-actions .btn-link, .table-actions button, td .btn-link, td a.btn-link, td .action-link, td .quick-action-btn');
      if (!btn) return;
      
      var text = getText(btn);
      var row = btn.closest('tr');
      if (!row) return;
      
      var firstCell = row.querySelector('td');
      var nameText = firstCell ? firstCell.textContent.trim().replace(/\s+/g, ' ') : '未知';
      
      // 获取第一个有实际内容的单元格（跳过 checkbox 空列）
      function getFirstContentCell(row) {
        var tds = row.querySelectorAll('td');
        for (var i = 0; i < tds.length; i++) {
          var txt = tds[i].textContent.trim();
          // 跳过只有空格、checkbox 的空列
          if (txt && txt.length > 0 && tds[i].querySelector('.enterprise-name, .member-name, .talent-name, [class*="name"]')) {
            return tds[i];
          }
          if (txt && txt.length > 1 && !tds[i].querySelector('input[type="checkbox"]')) {
            return tds[i];
          }
        }
        return firstCell;
      }
      
      // 从单元格提取名称（优先取 name 类元素，否则清理头像文本）
      function extractName(cell) {
        if (!cell) return '';
        var nameEl = cell.querySelector('.enterprise-name, .member-name, .talent-name, .org-name');
        if (nameEl) return nameEl.textContent.trim();
        var txt = cell.textContent.trim();
        // 清理头像文本（如"张 张伟东" -> "张伟东"）
        var parts = txt.split(/\s+/);
        // 如果第一部分只有1-2个字符（头像字母），去掉
        if (parts.length > 1 && parts[0].length <= 2) {
          return parts.slice(1).join('');
        }
        return txt;
      }
      
      e.preventDefault();

      // 如果按钮本身有有效href，优先使用（页面已明确指定跳转目标）
      var btnHref = btn.getAttribute('href');
      if (btnHref && btnHref !== '#' && !btnHref.startsWith('javascript:')) {
        window.location.href = btnHref;
        return;
      }
      
      // 匹配查看/详情类操作（去掉emoji和空格后判断）
      var cleanText = text.replace(/[\ud800-\udfff\s]/g, '');
      if (cleanText === '查看' || cleanText === '详情' || cleanText === '查看画像') {
        // 智能判断跳转页面
        var table = row.closest('table');
        var tableId = table?.id || '';
        var pageTitle = document.title || '';
        
        // 党员列表 -> 党员画像
        if (pageTitle.includes('党员') && !pageTitle.includes('发展')) {
          var nameCell = getFirstContentCell(row);
          var name = extractName(nameCell);
          if (name) {
            window.location.href = 'member_profile.html?name=' + encodeURIComponent(name);
            return;
          }
        }
        
        // 人才列表 -> 人才画像（优先判断，避免被"党建"标题匹配）
        if (pageTitle.includes('人才')) {
          var talentCell = getFirstContentCell(row);
          var tname = extractName(talentCell);
          if (tname) {
            window.location.href = 'talent_profile.html?name=' + encodeURIComponent(tname);
            return;
          }
        }

        // 企业列表 -> 企业画像
        if (pageTitle.includes('企业') && !pageTitle.includes('分析') && !pageTitle.includes('画像')) {
          var entCell = getFirstContentCell(row);
          var ename = extractName(entCell);
          if (ename) {
            window.location.href = 'enterprise_profile.html?name=' + encodeURIComponent(ename);
            return;
          }
        }
        
        // 党员列表 -> 党员详情
        if (pageTitle.includes('党员') && !pageTitle.includes('发展') && !pageTitle.includes('培养')) {
          var memberCell = getFirstContentCell(row);
          var mname = extractName(memberCell);
          if (mname) {
            window.location.href = 'member_profile.html?name=' + encodeURIComponent(mname);
            return;
          }
        }

        // 组织列表 -> 组织详情（排除人才/企业/产业页面，因标题含"党建"字样）
        if ((pageTitle.includes('组织') || pageTitle.includes('党建')) && !pageTitle.includes('人才') && !pageTitle.includes('企业') && !pageTitle.includes('产业')) {
          var orgCell = getFirstContentCell(row);
          var oname = extractName(orgCell);
          window.location.href = 'org_detail.html?org=' + encodeURIComponent(oname);
          return;
        }
        
        alert('查看详情：' + nameText);
      }
      else if (text === '编辑' || text === '修改') {
        var pageTitle = document.title || '';
        // 党员管理页面的编辑 → 打开编辑弹窗，姓名和身份证号不可编辑
        if (pageTitle.includes('党员管理') || pageTitle.includes('党员数据管理')) {
          var memberName = nameText;
          var mockData = getMemberMockData(memberName);
          var editFields = buildMemberEditFields(mockData);
          var editBody = buildFormHtml(editFields);
          showModal({
            title: '编辑党员信息',
            body: editBody,
            confirmText: '保存',
            onConfirm: function(mask) {
              var form = mask.querySelector('.modal-body');
              var confirmBtn = mask.querySelector('.modal-confirm');
              if (confirmBtn.disabled) return false;
              // 必填校验（跳过 disabled 的字段）
              var requireds = form.querySelectorAll('[data-required="true"]:not(:disabled)');
              for (var i = 0; i < requireds.length; i++) {
                var input = requireds[i];
                var val = input.value.trim();
                if (input.tagName === 'SELECT') {
                  var selectedText = input.options[input.selectedIndex]?.text || '';
                  if (/^请选择|请选择.*/.test(selectedText) || val === '') {
                    var label = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim();
                    showToast('请选择' + (label || '必填项'), 'error');
                    input.focus();
                    return false;
                  }
                } else if (!val) {
                  var label2 = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim();
                  showToast('请填写' + (label2 || '必填项'), 'error');
                  input.focus();
                  return false;
                }
              }
              showToast('保存成功');
              setTimeout(function() { closeModal(); }, 500);
              return false;
            }
          });
          return;
        }
        alert('编辑：' + nameText);
      }
      else if (text === '删除') {
        if (confirm('确定要删除「' + nameText + '」吗？')) {
          alert('已删除：' + nameText);
        }
      }
      else if (text === '新增' || text === '+ 新增') {
        alert('新增记录');
      }
      else if (text === '培养记录') {
        alert('查看培养记录：' + nameText);
      }
      else if (text === '转正申请') {
        if (confirm('确定为「' + nameText + '」办理转正申请？')) {
          alert('已提交转正申请');
        }
      }
      else if (text === '思想汇报') {
        alert('查看思想汇报：' + nameText);
      }
      else if (text === '审批') {
        alert('审批：' + nameText);
      }
      else if (text === '详情') {
        alert('查看详情：' + nameText);
      }
      else if (text === '发布') {
        alert('发布：' + nameText);
      }
      else if (text === '下线') {
        if (confirm('确定要下线「' + nameText + '」吗？')) {
          alert('已下线');
        }
      }
      else if (text === '查看报告') {
        window.location.href = 'report.html';
      }
    });
  }

  // ===== 5. KPI 卡片点击跳转 =====
  function initKpiCards() {
    $$('.kpi-card').forEach(function(card) {
      if (card._kpiBound) return;
      card._kpiBound = true;
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', function() {
        var label = getText(card.querySelector('.kpi-label'));
        var title = document.title || '';
        
        // 党员相关 -> 党员分析页
        if (label.includes('党员') || title.includes('党员')) {
          if (label.includes('发展') || label.includes('预备')) {
            window.location.href = 'member_development.html';
          } else if (label.includes('分析') || label.includes('统计') || label.includes('画像')) {
            window.location.href = 'member_analysis.html';
          } else {
            window.location.href = 'member.html';
          }
          return;
        }
        
        // 企业相关 -> 企业分析/列表
        if (label.includes('企业') || title.includes('企业')) {
          if (label.includes('分析') || label.includes('画像')) {
            window.location.href = 'enterprise_analysis.html';
          } else {
            window.location.href = 'enterprise.html';
          }
          return;
        }
        
        // 组织相关 -> 组织分析
        if (label.includes('组织') || title.includes('组织')) {
          window.location.href = 'org_analysis.html';
          return;
        }
        
        // 人才相关 -> 人才分析
        if (label.includes('人才') || title.includes('人才')) {
          window.location.href = 'talent_analysis.html';
          return;
        }
        
        // 活动相关 -> 活动页
        if (label.includes('活动') || title.includes('活动')) {
          window.location.href = 'activity.html';
          return;
        }
      });
    });
  }

  // ===== 6. 图表卡片点击跳转 =====
  function initChartCards() {
    $$('.chart-card').forEach(function(card) {
      if (card._chartBound) return;
      card._chartBound = true;
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', function() {
        var title = getText(card.querySelector('.card-title, .chart-title, h3, h4'));
        var pageTitle = document.title || '';
        
        if (title.includes('党员') || pageTitle.includes('党员')) {
          window.location.href = 'member.html';
        } else if (title.includes('企业') || pageTitle.includes('企业')) {
          window.location.href = 'enterprise.html';
        } else if (title.includes('组织') || pageTitle.includes('组织')) {
          window.location.href = 'org_analysis.html';
        } else if (title.includes('人才') || pageTitle.includes('人才')) {
          window.location.href = 'talent_management.html';
        } else if (title.includes('活动') || pageTitle.includes('活动')) {
          window.location.href = 'activity.html';
        }
      });
    });
  }

  // ===== 7. 按钮通用交互 =====
  function initButtons() {
    // 操作按钮（非表格内）
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      if (btn.closest('.table-actions')) return; // 表格操作已在第4部分处理
      if (btn.closest('.pagination')) return; // 分页已处理
      if (btn.closest('.filter-bar')) return; // 筛选按钮单独处理
      
      var text = getText(btn);
      
      if (text === '新增' || text === '+ 新增' || text.includes('新增')) {
        if (text.includes('党员')) {
          alert('新增党员');
        } else if (text.includes('企业')) {
          alert('新增企业');
        } else if (text.includes('组织')) {
          alert('新增组织');
        } else {
          alert('新增记录');
        }
      }
      else if (text === '导入' || text === '⬆ 导入') {
        var pageTitle = document.title || '';
        var importTitle = '批量导入数据';
        var templateName = '导入模板.xlsx';
        if (pageTitle.includes('党员管理') || pageTitle.includes('党员数据管理')) {
          importTitle = '批量导入党员';
          templateName = '党员信息导入模板.xlsx';
        } else if (pageTitle.includes('组织') || pageTitle.includes('党工委')) {
          importTitle = '批量导入组织';
          templateName = '党组织信息导入模板.xlsx';
        } else if (pageTitle.includes('企业')) {
          importTitle = '批量导入企业';
          templateName = '企业信息导入模板.xlsx';
        }
        var importBody = '<div class="import-tip-box">' +
            '<div class="import-tip-icon">📋</div>' +
            '<div class="import-tip-content">' +
              '<p style="margin:0 0 6px 0;font-weight:500;color:var(--text-primary);">导入说明：</p>' +
              '<p style="margin:0 0 4px 0;">1. 请先下载导入模板，按照模板格式填写信息</p>' +
              '<p style="margin:0 0 4px 0;">2. 导入字段与新增表单保持一致</p>' +
              '<p style="margin:0 0 4px 0;">3. 支持 .xlsx / .xls 格式，单次最多导入 500 条</p>' +
              '<p style="margin:0;">4. 标有 <span style="color:#ef4444;">*</span> 的字段为必填项</p>' +
            '</div>' +
          '</div>' +
          '<div class="import-template-row">' +
            '<span style="color:var(--text-secondary);font-size:13px;">模板文件：</span>' +
            '<a href="javascript:void(0)" class="import-template-link" onclick="return false;">' + templateName + '</a>' +
            '<button type="button" class="btn btn-outline btn-sm" style="margin-left:12px;" onclick="alert(\'模板下载中...\')">下载模板</button>' +
          '</div>' +
          '<div class="import-upload-box" onclick="this.querySelector(\'input\').click()">' +
            '<div class="import-upload-icon">⬆</div>' +
            '<div class="import-upload-text">点击或拖拽文件到此处上传</div>' +
            '<div class="import-upload-hint">支持 .xlsx / .xls 格式</div>' +
            '<input type="file" accept=".xlsx,.xls" style="display:none;" />' +
          '</div>';
        showModal({
          title: importTitle,
          body: importBody,
          width: '520px',
          confirmText: '开始导入',
          onConfirm: function() {
            showToast('导入中，请稍候...', 'info');
            setTimeout(function() {
              showToast('导入成功');
              closeModal();
            }, 1000);
            return false;
          }
        });
      }
      else if (text === '导出' || text === '⬇ 导出') {
        alert('导出数据');
      }
      else if (text === '查询' || text === '搜索') {
        alert('查询中...');
        setTimeout(function() { alert('查询完成'); }, 500);
      }
      else if (text === '重置') {
        alert('已重置筛选条件');
      }
      else if (text === '保存' || text === '提交') {
        alert('已保存');
      }
      else if (text === '取消') {
        // 关闭弹窗或返回
        history.back();
      }
      else if (text === '返回' || text === '← 返回列表' || text.includes('返回')) {
        history.back();
      }
    });
  }

  // ===== 8. 筛选栏交互 =====
  function initFilterBar() {
    $$('.filter-bar').forEach(function(bar) {
      if (bar._filterBound) return;
      bar._filterBound = true;
      
      // 下拉选择
      bar.addEventListener('change', function(e) {
        if (e.target.tagName === 'SELECT') {
          // 可以在这里加筛选逻辑
        }
      });

      // 操作按钮（新增 / 导入 / 导出 / 查询 / 重置）
      bar.addEventListener('click', function(e) {
        var btn = e.target.closest('.btn');
        if (!btn) return;
        var text = getText(btn);

        // 新增按钮 → 走通用新增弹窗
        if (text.includes('新增')) {
          e.stopPropagation();
          var pageTitle = document.title || '';
          openAddModal(pageTitle, text);
          return;
        }

        // 导入按钮 → 走通用导入弹窗
        if (text === '导入' || text === '⬆ 导入') {
          e.stopPropagation();
          var pageTitle2 = document.title || '';
          var importTitle = '批量导入数据';
          var templateName = '导入模板.xlsx';
          if (pageTitle2.includes('党员管理') || pageTitle2.includes('党员数据管理')) {
            importTitle = '批量导入党员';
            templateName = '党员信息导入模板.xlsx';
          } else if (pageTitle2.includes('组织') || pageTitle2.includes('党工委')) {
            importTitle = '批量导入组织';
            templateName = '党组织信息导入模板.xlsx';
          } else if (pageTitle2.includes('企业')) {
            importTitle = '批量导入企业';
            templateName = '企业信息导入模板.xlsx';
          }
          var importBody = '<div class="import-tip-box">' +
              '<div class="import-tip-icon">📋</div>' +
              '<div class="import-tip-content">' +
                '<p style="margin:0 0 6px 0;font-weight:500;color:var(--text-primary);">导入说明：</p>' +
                '<p style="margin:0 0 4px 0;">1. 请先下载导入模板，按照模板格式填写信息</p>' +
                '<p style="margin:0 0 4px 0;">2. 导入字段与新增表单保持一致</p>' +
                '<p style="margin:0 0 4px 0;">3. 支持 .xlsx / .xls 格式，单次最多导入 500 条</p>' +
                '<p style="margin:0;">4. 标有 <span style="color:#ef4444;">*</span> 的字段为必填项</p>' +
              '</div>' +
            '</div>' +
            '<div class="import-template-row">' +
              '<span style="color:var(--text-secondary);font-size:13px;">模板文件：</span>' +
              '<a href="javascript:void(0)" class="import-template-link" onclick="return false;">' + templateName + '</a>' +
              '<button type="button" class="btn btn-outline btn-sm" style="margin-left:12px;" onclick="alert(\'模板下载中...\')">下载模板</button>' +
            '</div>' +
            '<div class="import-upload-box" onclick="this.querySelector(\'input\').click()">' +
              '<div class="import-upload-icon">⬆</div>' +
              '<div class="import-upload-text">点击或拖拽文件到此处上传</div>' +
              '<div class="import-upload-hint">支持 .xlsx / .xls 格式</div>' +
              '<input type="file" accept=".xlsx,.xls" style="display:none;" />' +
            '</div>';
          showModal({
            title: importTitle,
            body: importBody,
            width: '520px',
            confirmText: '开始导入',
            onConfirm: function() {
              showToast('导入中，请稍候...', 'info');
              setTimeout(function() {
                showToast('导入成功');
                closeModal();
              }, 1000);
              return false;
            }
          });
          return;
        }

        // 导出按钮
        if (text === '导出' || text === '⬇ 导出') {
          e.stopPropagation();
          showToast('导出中...', 'info');
          setTimeout(function() { showToast('导出成功'); }, 800);
          return;
        }

        // 查询按钮
        if (text === '查询' || text === '搜索') {
          e.stopPropagation();
          showToast('查询中...', 'info');
          setTimeout(function() { showToast('查询完成'); }, 500);
          return;
        }

        // 重置按钮
        if (text === '重置') {
          e.stopPropagation();
          showToast('已重置筛选条件');
          return;
        }
      });
    });
  }

  // ===== 9. 组织树交互 =====
  function initOrgTree() {
    $$('.org-tree').forEach(function(tree) {
      if (tree._treeBound) return;
      tree._treeBound = true;
      
      tree.addEventListener('click', function(e) {
        // 展开/收起
        var toggle = e.target.closest('.tree-toggle');
        if (toggle) {
          e.stopPropagation();
          var li = toggle.closest('li');
          if (li) li.classList.toggle('expanded');
          var node = toggle.closest('.tree-node');
          if (node) node.classList.toggle('expanded');
          return;
        }
        
        // 节点选中 + 跳转
        var node = e.target.closest('.tree-node');
        if (node) {
          e.stopPropagation();
          $$('.tree-node', tree).forEach(function(n) { n.classList.remove('active'); });
          node.classList.add('active');
          
          var label = getText(node.querySelector('.tree-label'));
          if (label) {
            window.location.href = 'org_detail.html?org=' + encodeURIComponent(label);
          }
        }
      });
    });
  }

  // ===== 10. 活动卡片交互 =====
  function initActivityCards() {
    $$('.activity-card').forEach(function(card) {
      if (card._acBound) return;
      card._acBound = true;
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', function() {
        var title = getText(card.querySelector('.activity-title, h3, h4'));
        window.location.href = 'activity.html#detail=' + encodeURIComponent(title || '');
      });
    });
  }

  // ===== 11. 课程卡片交互 =====
  function initCourseCards() {
    $$('.course-card').forEach(function(card) {
      if (card._ccBound) return;
      card._ccBound = true;
      
      var btns = $$('.btn', card);
      btns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var text = getText(this);
          var title = getText(card.querySelector('h4, h3, .course-title'));
          
          if (text === '继续学习' || text === '开始学习') {
            alert('开始学习：' + title);
          } else if (text === '查看证书') {
            alert('查看证书：' + title);
          } else if (text === '详情') {
            alert('课程详情：' + title);
          }
        });
      });
    });
  }

  // ===== 12. 企业卡片交互 =====
  function initEnterpriseCards() {
    $$('.enterprise-card').forEach(function(card) {
      if (card._ecBound) return;
      card._ecBound = true;
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', function() {
        var name = getText(card.querySelector('.enterprise-name, h3, h4'));
        window.location.href = 'enterprise_profile.html?name=' + encodeURIComponent(name || '');
      });
    });
  }

  // ===== 13. 时间线交互 =====
  function initTimeline() {
    $$('.timeline-horiz, .dev-timeline').forEach(function(tl) {
      if (tl._tlBound) return;
      tl._tlBound = true;
      
      tl.addEventListener('click', function(e) {
        var item = e.target.closest('.timeline-step, .dev-timeline-item');
        if (item) {
          var title = getText(item.querySelector('.timeline-stage, .dev-timeline-stage'));
          if (title) {
            // 不弹窗，只高亮
            $$('.timeline-step, .dev-timeline-item', tl).forEach(function(i) { i.classList.remove('active'); });
            item.classList.add('active');
          }
        }
      });
    });
  }

  // ===== 14. 表格链接（组织名/企业名等）跳转 =====
  function initTableLinks() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('td a');
      if (!link) return;
      if (link.closest('.table-actions')) return; // 操作列单独处理
      
      var text = getText(link);
      if (!text) return;
      
      // 判断链接类型并跳转
      var parentTd = link.closest('td');
      var colIndex = Array.from(parentTd.parentNode.children).indexOf(parentTd);
      var table = link.closest('table');
      var headers = table ? table.querySelectorAll('th') : [];
      var headerText = headers[colIndex] ? headers[colIndex].textContent.trim() : '';
      
      e.preventDefault();
      
      if (headerText.includes('党组织') || headerText.includes('支部') || headerText.includes('党委') || headerText.includes('党工委')) {
        window.location.href = 'org_detail.html?org=' + encodeURIComponent(text);
      } else if (headerText.includes('企业') || headerText.includes('公司')) {
        window.location.href = 'enterprise_profile.html?name=' + encodeURIComponent(text);
      } else if (headerText.includes('人才') || headerText.includes('姓名')) {
        if (document.title.includes('人才')) {
          window.location.href = 'talent_profile.html?name=' + encodeURIComponent(text);
        } else {
          window.location.href = 'member_profile.html?name=' + encodeURIComponent(text);
        }
      } else {
        // 默认：如果有 href 就用 href
        if (link.getAttribute('href') && link.getAttribute('href') !== '#') {
          window.location.href = link.getAttribute('href');
        }
      }
    });
  }

  // ===== 15. 面包屑导航 =====
  function initBreadcrumb() {
    // 面包屑链接已有 href，无需额外处理
    // 但确保 active 项不可点击
    $$('.breadcrumb-item.active').forEach(function(item) {
      item.style.cursor = 'default';
      item.style.color = 'var(--text-secondary)';
    });
  }

  // ===== 16. Dashboard 卡片跳转 =====
  function initDashboardCards() {
    // 快捷入口卡片
    $$('.quick-card, .stat-card, .dashboard-card').forEach(function(card) {
      if (card._dcBound) return;
      card._dcBound = true;
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', function() {
        var title = getText(card.querySelector('h3, h4, .card-title'));
        
        if (title.includes('党员')) {
          window.location.href = 'member.html';
        } else if (title.includes('组织')) {
          window.location.href = 'org_committee.html';
        } else if (title.includes('企业')) {
          window.location.href = 'enterprise.html';
        } else if (title.includes('人才')) {
          window.location.href = 'talent_management.html';
        } else if (title.includes('活动')) {
          window.location.href = 'activity.html';
        } else if (title.includes('报告') || title.includes('报表')) {
          window.location.href = 'report.html';
        }
      });
    });
  }

  // ===== 17. 大屏页面 Tab/菜单交互 =====
  function initBigscreen() {
    // 大屏 Tab 切换
    $$('.bigscreen-tab, .bs-tab').forEach(function(tab) {
      if (tab._bstBound) return;
      tab._bstBound = true;
      tab.addEventListener('click', function() {
        var target = this.getAttribute('data-tab');
        var container = this.closest('[class*="tabs"]') || this.parentElement;
        if (!container) return;
        
        container.querySelectorAll('[class*="tab"]').forEach(function(t) {
          if (t.classList.contains('active') || t.classList.contains('selected')) {
            t.classList.remove('active', 'selected');
          }
        });
        this.classList.add('active');
        
        var content = document.getElementById(target);
        if (content) {
          // 隐藏兄弟显示自己
          content.parentElement.querySelectorAll(':scope > [id]').forEach(function(c) {
            c.style.display = 'none';
          });
          content.style.display = '';
        }
      });
    });
  }

  // ===== 18. 全选/复选框 =====
  function initCheckboxAll() {
    document.addEventListener('change', function(e) {
      var cb = e.target;
      if (cb.tagName !== 'INPUT' || cb.type !== 'checkbox') return;
      
      // 表头全选
      var table = cb.closest('table');
      if (!table) return;
      
      var th = cb.closest('th');
      if (th) {
        // 全选/取消全选
        var rows = table.querySelectorAll('tbody tr input[type="checkbox"]');
        rows.forEach(function(rowCb) {
          rowCb.checked = cb.checked;
        });
      }
    });
  }

  // ===== 19. 登录/表单提交 =====
  function initForms() {
    $$('form').forEach(function(form) {
      if (form._formBound) return;
      form._formBound = true;
      
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 登录表单
        if (form.querySelector('input[type="password"]')) {
          var userInput = form.querySelector('input[type="text"], input[type="email"], input[name="username"]');
          var username = userInput ? userInput.value : '用户';
          alert('登录成功，欢迎 ' + username);
          setTimeout(function() {
            window.location.href = 'dashboard.html';
          }, 500);
        } else {
          alert('提交成功');
        }
      });
    });
  }

  // ===== 20. 标签页/标签选择交互 =====
  function initTagSelections() {
    $$('.tag-list, .tag-group, .tag-select-wrap').forEach(function(group) {
      if (group._tagBound) return;
      group._tagBound = true;
      
      group.addEventListener('click', function(e) {
        var tag = e.target.closest('.tag, .tag-option');
        if (!tag) return;
        
        // 单选模式：切换 active
        if (group.classList.contains('tag-single')) {
          $$('.tag, .tag-option', group).forEach(function(t) { t.classList.remove('active'); });
          tag.classList.add('active');
        } else {
          // 多选模式
          tag.classList.toggle('active');
        }
      });
    });
  }

  // ===== 21. 通用模态框 =====
  var currentModal = null;

  function showModal(options) {
    if (currentModal) {
      // 立即移除已有弹窗，不等过渡动画
      if (currentModal.parentNode) currentModal.parentNode.removeChild(currentModal);
      currentModal = null;
    }
    // 额外清理：移除所有残留的 modal-mask
    var allMasks = document.querySelectorAll('.modal-mask');
    for (var i = 0; i < allMasks.length; i++) {
      if (allMasks[i].parentNode) allMasks[i].parentNode.removeChild(allMasks[i]);
    }

    var title = options.title || '新增';
    var body = options.body || '';
    var footer = options.footer !== undefined ? options.footer : true;
    var width = options.width || '560px';
    var onConfirm = options.onConfirm || null;
    var confirmText = options.confirmText || '确定';
    var cancelText = options.cancelText || '取消';

    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal-dialog" style="width:' + width + '">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">' + title + '</h3>' +
          '<button type="button" class="modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + body + '</div>' +
        (footer ?
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary modal-cancel">' + cancelText + '</button>' +
            '<button type="button" class="btn btn-primary modal-confirm">' + confirmText + '</button>' +
          '</div>' : '') +
      '</div>';

    document.body.appendChild(mask);
    currentModal = mask;

    requestAnimationFrame(function() {
      mask.classList.add('show');
    });

    mask.querySelector('.modal-close').addEventListener('click', closeModal);
    var cancelBtn = mask.querySelector('.modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    var confirmBtn = mask.querySelector('.modal-confirm');
    if (confirmBtn && onConfirm) {
      confirmBtn.addEventListener('click', function() {
        var result = onConfirm(mask);
        if (result !== false) closeModal();
      });
    }

    mask.addEventListener('click', function(e) {
      if (e.target === mask) closeModal();
    });

    function onEsc(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', onEsc);
      }
    }
    document.addEventListener('keydown', onEsc);
    mask._escHandler = onEsc;

    // 弹窗打开后初始化内部交互（标签选择等）
    setTimeout(function() {
      try {
        if (mask.querySelector('.tag-select-wrap')) initTagSelections();
      } catch(e) {}
    }, 0);

    return mask;
  }

  function closeModal() {
    if (!currentModal) return;
    currentModal.classList.remove('show');
    if (currentModal._escHandler) {
      document.removeEventListener('keydown', currentModal._escHandler);
    }
    var mask = currentModal;
    currentModal = null;
    setTimeout(function() {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 250);
  }

  // Toast 提示
  function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  }

  // ===== 21.5 GIS 地图选点弹窗 =====
  var gisTargetInput = null;
  var gisSelectedData = null;

  // 暴露给 inline onclick 使用
  window.__openGisPicker = function(btnEl) {
    var inputEl = btnEl.closest('.address-input-group')?.querySelector('input');
    if (!inputEl) return;
    gisTargetInput = inputEl;
    openGisPicker(inputEl.value);
  };

  function openGisPicker(currentAddress) {
    gisSelectedData = null;

    var mapHtml = buildGisMapHtml();

    showModal({
      title: '📍 GIS 地图选点',
      body: mapHtml,
      width: '760px',
      confirmText: '确定选点',
      cancelText: '取消',
      onConfirm: function(mask) {
        if (!gisSelectedData) {
          showToast('请在地图上选择一个位置', 'error');
          return false;
        }
        // 回填地址
        if (gisTargetInput) {
          gisTargetInput.value = gisSelectedData.address;
          gisTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        showToast('选点成功');
        return true;
      }
    });

    // 给弹窗加 class
    setTimeout(function() {
      var modal = document.querySelector('.modal-mask.show .modal-dialog');
      if (modal) modal.classList.add('gis-map-modal');
      // 初始化地图标记点击
      initGisMarkerClicks();
    }, 50);
  }

  function buildGisMapHtml() {
    // 模拟地图数据：若干组织/地标点位
    var markers = [
      { x: 25, y: 30, name: '高新区党工委', addr: '高新区科技大道1号', type: 'committee' },
      { x: 45, y: 22, name: '经开区企业工委', addr: '经开区开发大道168号', type: 'committee' },
      { x: 68, y: 38, name: '城西街道党工委', addr: '城西区西凤路126号', type: 'committee' },
      { x: 32, y: 55, name: '南湖产业园党总支', addr: '南区南湖路58号', type: 'org' },
      { x: 58, y: 62, name: '滨江科技园党委', addr: '滨江区滨江路200号', type: 'committee' },
      { x: 78, y: 50, name: '东部工业区党支部', addr: '东城区北环街88号', type: 'org' },
      { x: 20, y: 70, name: '文创园联合党支部', addr: '文教区文化路168号', type: 'org' },
      { x: 52, y: 42, name: '物流园党支部', addr: '物流区物流大道66号', type: 'org' },
      { x: 70, y: 72, name: '高新区第二党支部', addr: '高新区高新二路36号', type: 'org' },
      { x: 40, y: 75, name: '大学城党委', addr: '教育区学府路99号', type: 'committee' }
    ];

    var markersHtml = markers.map(function(m, i) {
      return '<div class="gis-marker" data-index="' + i + '" data-name="' + m.name + '" data-addr="' + m.addr + '" style="left:' + m.x + '%;top:' + m.y + '%">' +
               '<div class="gis-marker-label">' + m.name + '</div>' +
               '<div class="gis-marker-pin"></div>' +
             '</div>';
    }).join('');

    return '' +
      '<div class="gis-map-container">' +
        '<div class="gis-map-search">' +
          '<input type="text" id="gisSearchInput" placeholder="搜索地址、组织名称..." />' +
          '<button type="button" id="gisSearchBtn">搜索</button>' +
        '</div>' +
        '<div class="gis-map-toolbar">' +
          '<button type="button" title="放大">＋</button>' +
          '<button type="button" title="缩小">－</button>' +
          '<button type="button" title="定位">◎</button>' +
        '</div>' +
        '<div class="gis-map-grid"></div>' +
        // 模拟道路
        '<svg class="gis-map-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">' +
          '<path d="M0,35 Q25,30 50,40 T100,35" stroke="#c0d4e8" stroke-width="2" fill="none" opacity="0.7"/>' +
          '<path d="M15,0 Q20,40 25,70 T30,100" stroke="#c0d4e8" stroke-width="1.5" fill="none" opacity="0.7"/>' +
          '<path d="M40,0 Q45,30 50,60 T55,100" stroke="#b0c8dc" stroke-width="2.5" fill="none" opacity="0.6"/>' +
          '<path d="M70,0 Q65,35 60,55 T70,100" stroke="#c0d4e8" stroke-width="1.5" fill="none" opacity="0.7"/>' +
          '<path d="M0,65 Q30,60 60,70 T100,65" stroke="#b0c8dc" stroke-width="2.5" fill="none" opacity="0.6"/>' +
          '<rect x="10" y="15" width="20" height="15" fill="#d8e8f4" opacity="0.5" rx="1"/>' +
          '<rect x="50" y="10" width="25" height="12" fill="#d8e8f4" opacity="0.5" rx="1"/>' +
          '<rect x="35" y="48" width="18" height="14" fill="#d8e8f4" opacity="0.5" rx="1"/>' +
          '<rect x="65" y="55" width="20" height="12" fill="#d8e8f4" opacity="0.5" rx="1"/>' +
          '<rect x="15" y="60" width="15" height="12" fill="#d8e8f4" opacity="0.5" rx="1"/>' +
        '</svg>' +
        '<div class="gis-map-roads">' + markersHtml + '</div>' +
        '<div class="gis-map-legend">' +
          '<div class="gis-map-legend-item"><span class="gis-map-legend-dot" style="background:#c8161d"></span>党工委/党委</div>' +
          '<div class="gis-map-legend-item"><span class="gis-map-legend-dot" style="background:#28a745"></span>党总支/党支部</div>' +
        '</div>' +
      '</div>' +
      '<div class="gis-selected-info" id="gisSelectedInfo">' +
        '<span class="label">当前选点：</span><span class="value">未选择</span>' +
      '</div>';
  }

  function initGisMarkerClicks() {
    var markers = document.querySelectorAll('.gis-marker');
    var infoBox = document.getElementById('gisSelectedInfo');

    markers.forEach(function(marker) {
      marker.addEventListener('click', function() {
        // 移除其他激活
        markers.forEach(function(m) { m.classList.remove('active'); });
        marker.classList.add('active');

        var name = marker.getAttribute('data-name');
        var addr = marker.getAttribute('data-addr');

        gisSelectedData = { name: name, address: addr };

        if (infoBox) {
          infoBox.innerHTML = '<span class="label">当前选点：</span><span class="value">' + name + '（' + addr + '）</span>';
        }
      });
    });

    // 搜索功能
    var searchBtn = document.getElementById('gisSearchBtn');
    var searchInput = document.getElementById('gisSearchInput');
    if (searchBtn && searchInput) {
      function doSearch() {
        var keyword = searchInput.value.trim();
        if (!keyword) {
          markers.forEach(function(m) { m.style.display = ''; });
          return;
        }
        var found = false;
        markers.forEach(function(m) {
          var name = m.getAttribute('data-name') || '';
          var addr = m.getAttribute('data-addr') || '';
          if (name.indexOf(keyword) >= 0 || addr.indexOf(keyword) >= 0) {
            m.style.display = '';
            if (!found) {
              found = true;
              m.classList.add('active');
              var n = m.getAttribute('data-name');
              var a = m.getAttribute('data-addr');
              gisSelectedData = { name: n, address: a };
              if (infoBox) {
                infoBox.innerHTML = '<span class="label">当前选点：</span><span class="value">' + n + '（' + a + '）</span>';
              }
            }
          } else {
            m.style.display = 'none';
          }
        });
        if (!found) {
          showToast('未找到匹配位置', 'error');
        }
      }
      searchBtn.addEventListener('click', doSearch);
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSearch();
      });
    }
  }

  // ===== 22. 新增弹窗（按页面类型自动匹配表单） =====
  function initAddButtons() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var text = btn.textContent.trim();
      if (!/^[+＋]?\s*(新增|添加|新建)/.test(text) && !/新增$/.test(text)) return;
      if (btn.getAttribute('onclick')) return;
      if (btn.closest('a')) return;

      e.preventDefault();
      var pageTitle = document.title || '';
      openAddModal(pageTitle, text);
    });
  }

  function openAddModal(pageTitle, btnText) {
    var formConfig = getAddFormConfig(pageTitle, btnText);
    if (!formConfig) return;

    var body = buildFormHtml(formConfig.fields);

    showModal({
      title: formConfig.title,
      body: body,
      confirmText: '提交',
      onConfirm: function(mask) {
        var form = mask.querySelector('.modal-body');
        var confirmBtn = mask.querySelector('.modal-confirm');
        
        // 防重复提交
        if (confirmBtn.disabled) return false;
        
        // 必填校验
        var requireds = form.querySelectorAll('[data-required="true"]');
        for (var i = 0; i < requireds.length; i++) {
          var input = requireds[i];
          var val = input.value.trim();
          
          // select 特殊处理：第一个选项如果是"请选择"类提示词，视为未选择
          if (input.tagName === 'SELECT') {
            var selectedText = input.options[input.selectedIndex]?.text || '';
            if (/^请选择|请选择.*/.test(selectedText) || val === '') {
              var label = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim();
              showToast('请选择' + (label || '必填项'), 'error');
              input.focus();
              return false;
            }
          } else if (!val) {
            var label2 = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim();
            showToast('请填写' + (label2 || '必填项'), 'error');
            input.focus();
            return false;
          }
        }
        
        // 格式校验
        var formatError = validateFormats(form);
        if (formatError) {
          showToast(formatError, 'error');
          return false;
        }
        
        // 收集表单数据
        var formData = collectFormData(form);
        console.log('[' + formConfig.title + '] 提交数据:', formData);
        
        // 提交中状态
        confirmBtn.disabled = true;
        var originalText = confirmBtn.textContent;
        confirmBtn.textContent = '提交中...';
        confirmBtn.style.opacity = '0.7';
        confirmBtn.style.cursor = 'not-allowed';
        
        // 模拟提交（1s后成功）
        setTimeout(function() {
          showToast(formConfig.successMsg || '新增成功');
          // 关闭弹窗
          setTimeout(function() {
            closeModal();
          }, 500);
        }, 800);
        
        // 不立即关闭，等待模拟提交完成
        return false;
      }
    });
  }
  
  // 格式校验
  function validateFormats(formEl) {
    var inputs = formEl.querySelectorAll('.form-input');
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var val = input.value.trim();
      if (!val) continue;
      
      var label = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim() || '';
      
      // 手机号校验
      if (label.indexOf('电话') >= 0 || label.indexOf('手机') >= 0 || label.indexOf('联系电话') >= 0) {
        if (!/^1[3-9]\d{9}$/.test(val) && !/^0\d{2,3}-?\d{7,8}$/.test(val)) {
          return label + '格式不正确';
        }
      }
      
      // 身份证号校验
      if (label.indexOf('身份证') >= 0) {
        if (!/^\d{17}[\dXx]$/.test(val) && !/^\d{15}$/.test(val)) {
          return label + '格式不正确';
        }
      }
    }
    return null;
  }
  
  // 收集表单数据
  function collectFormData(formEl) {
    var data = {};
    var inputs = formEl.querySelectorAll('.form-input, .form-select, .form-textarea');
    inputs.forEach(function(input, idx) {
      var label = input.closest('.form-group')?.querySelector('.form-label')?.textContent?.replace('*', '').trim() || ('field' + idx);
      var val = input.type === 'checkbox' ? input.checked : input.value;
      data[label] = val;
    });
    return data;
  }

  // 获取党员模拟数据
  function getMemberMockData(name) {
    var dataMap = {
      '张伟东': {
        name: '张伟东', gender: '男', birthday: '1982-03-15', nation: '汉族',
        nativePlace: '山东济南', idCard: '370102198203151234',
        education: '博士研究生', school: '清华大学',
        workDate: '2008-07-01', joinDate: '2010-06-15',
        phone: '138****8888', email: 'zhangweidong@example.com',
        org: '高新区党工委', company: '科技创新有限公司',
        memberType: '正式党员', status: '正常',
        tags: ['骨干党员', '技术能手', '优秀党员']
      },
      '李雪梅': {
        name: '李雪梅', gender: '女', birthday: '1989-12-20', nation: '汉族',
        nativePlace: '四川成都', idCard: '510104198912205678',
        education: '硕士研究生', school: '四川大学',
        workDate: '2012-09-01', joinDate: '2015-03-20',
        phone: '139****6666', email: 'lixuemei@example.com',
        org: '经开区党工委', company: '智能制造集团',
        memberType: '正式党员', status: '正常',
        tags: ['青年党员', '管理岗']
      },
      '王建国': {
        name: '王建国', gender: '男', birthday: '1996-05-10', nation: '汉族',
        nativePlace: '北京朝阳', idCard: '110105199605109012',
        education: '本科', school: '北京理工大学',
        workDate: '2018-07-01', joinDate: '2023-07-01',
        phone: '137****5555', email: 'wangjianguo@example.com',
        org: '国企党委', company: '国有资产经营公司',
        memberType: '预备党员', status: '正常',
        tags: ['青年党员', '研发岗']
      }
    };
    if (dataMap[name]) return dataMap[name];
    // 默认数据
    return {
      name: name, gender: '男', birthday: '', nation: '汉族',
      nativePlace: '', idCard: '',
      education: '请选择', school: '',
      workDate: '', joinDate: '',
      phone: '', email: '',
      org: '请选择', company: '',
      memberType: '请选择', status: '正常',
      tags: []
    };
  }

  // 构建党员编辑表单字段（姓名和身份证号禁用）
  function buildMemberEditFields(data) {
    return [
      { section: '基本信息' },
      { row: [
        { label: '姓名', type: 'text', value: data.name, required: true, disabled: true },
        { label: '性别', type: 'select', options: ['请选择', '男', '女'], value: data.gender, required: true }
      ]},
      { row: [
        { label: '出生日期', type: 'date', value: data.birthday, required: true },
        { label: '民族', type: 'select', options: ['请选择', '汉族', '回族', '满族', '蒙古族', '其他'], value: data.nation, required: true }
      ]},
      { row: [
        { label: '籍贯', type: 'text', placeholder: '请输入籍贯', value: data.nativePlace },
        { label: '身份证号', type: 'text', placeholder: '请输入身份证号', value: data.idCard, required: true, disabled: true }
      ]},
      { row: [
        { label: '学历', type: 'select', options: ['请选择', '博士研究生', '硕士研究生', '本科', '大专', '高中/中专', '初中及以下'], value: data.education },
        { label: '毕业院校', type: 'text', placeholder: '请输入毕业院校', value: data.school }
      ]},
      { row: [
        { label: '参加工作时间', type: 'date', value: data.workDate },
        { label: '入党时间', type: 'date', value: data.joinDate, required: true }
      ]},
      { row: [
        { label: '联系电话', type: 'text', placeholder: '请输入联系电话', value: data.phone, required: true },
        { label: '电子邮箱', type: 'text', placeholder: '请输入电子邮箱', value: data.email }
      ]},
      { section: '所属信息' },
      { row: [
        { label: '所属党组织', type: 'select', options: ['请选择', '高新区党工委', '经开区党工委', '国企党委', '教育系统党委', '卫生系统党委'], value: data.org, required: true },
        { label: '所属企业', type: 'text', placeholder: '请输入所属企业', value: data.company }
      ]},
      { row: [
        { label: '党员类型', type: 'select', options: ['请选择', '正式党员', '预备党员', '发展对象', '积极分子'], value: data.memberType },
        { label: '党员状态', type: 'select', options: ['正常', '暂停', '转出'], value: data.status }
      ]},
      { section: '标签配置' },
      { label: '党员标签', type: 'tagselect', value: data.tags, options: ['骨干党员', '青年党员', '技术能手', '基层党员', '生产一线', '管理岗', '研发岗', '优秀党员', '党务工作者', '离退休党员'] }
    ];
  }

  function getAddFormConfig(pageTitle, btnText) {
    // 党员管理
    if (pageTitle.includes('党员管理') || pageTitle.includes('党员数据管理')) {
      return {
        title: '新增党员',
        successMsg: '党员信息添加成功',
        fields: [
          { section: '基本信息' },
          { row: [
            { label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
            { label: '性别', type: 'select', options: ['请选择', '男', '女'], required: true }
          ]},
          { row: [
            { label: '出生日期', type: 'date', required: true },
            { label: '民族', type: 'select', options: ['请选择', '汉族', '回族', '满族', '蒙古族', '其他'], required: true }
          ]},
          { row: [
            { label: '籍贯', type: 'text', placeholder: '请输入籍贯' },
            { label: '身份证号', type: 'text', placeholder: '请输入身份证号', required: true }
          ]},
          { row: [
            { label: '学历', type: 'select', options: ['请选择', '博士研究生', '硕士研究生', '本科', '大专', '高中/中专', '初中及以下'] },
            { label: '毕业院校', type: 'text', placeholder: '请输入毕业院校' }
          ]},
          { row: [
            { label: '参加工作时间', type: 'date' },
            { label: '入党时间', type: 'date', required: true }
          ]},
          { row: [
            { label: '联系电话', type: 'text', placeholder: '请输入联系电话', required: true },
            { label: '电子邮箱', type: 'text', placeholder: '请输入电子邮箱' }
          ]},
          { section: '所属信息' },
          { row: [
            { label: '所属党组织', type: 'select', options: ['请选择', '高新区党工委', '经开区党工委', '国企党委', '教育系统党委', '卫生系统党委'], required: true },
            { label: '所属企业', type: 'text', placeholder: '请输入所属企业' }
          ]},
          { row: [
            { label: '党员类型', type: 'select', options: ['请选择', '正式党员', '预备党员', '发展对象', '积极分子'] },
            { label: '党员状态', type: 'select', options: ['正常', '暂停', '转出'] }
          ]},
          { section: '标签配置' },
          { label: '党员标签', type: 'tagselect', options: ['骨干党员', '青年党员', '技术能手', '基层党员', '生产一线', '管理岗', '研发岗', '优秀党员', '党务工作者', '离退休党员'] }
        ]
      };
    }

    // 党员发展
    if (pageTitle.includes('党员发展') || pageTitle.includes('党员培养')) {
      return {
        title: '新增发展对象',
        successMsg: '发展对象添加成功',
        fields: [
          { row: [
            { label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
            { label: '性别', type: 'select', options: ['男', '女'], required: true }
          ]},
          { row: [
            { label: '所在支部', type: 'text', placeholder: '请输入党支部名称', required: true },
            { label: '培养阶段', type: 'select', options: ['申请入党', '积极分子', '发展对象', '预备党员', '正式党员'], required: true }
          ]},
          { row: [
            { label: '申请时间', type: 'date' },
            { label: '联系人', type: 'text', placeholder: '请输入培养联系人' }
          ]},
          { label: '备注', type: 'textarea', placeholder: '请输入培养情况说明' }
        ]
      };
    }

    // 人才管理
    if (pageTitle.includes('人才管理') || pageTitle.includes('人才培养')) {
      return {
        title: '新增重点人才',
        successMsg: '人才信息添加成功',
        fields: [
          // 个人基本信息
          { section: '个人基本信息' },
          { row: [
            { label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
            { label: '性别', type: 'select', options: ['男', '女'], required: true }
          ]},
          { row: [
            { label: '出生日期', type: 'month' },
            { label: '民族', type: 'select', options: ['汉族', '蒙古族', '回族', '藏族', '维吾尔族', '其他'] }
          ]},
          { row: [
            { label: '籍贯', type: 'text', placeholder: '请输入籍贯' },
            { label: '政治面貌', type: 'select', options: ['中共党员', '中共预备党员', '共青团员', '民主党派', '群众'] }
          ]},
          { row: [
            { label: '入党时间', type: 'month' },
            { label: '参加工作时间', type: 'month' }
          ]},
          { row: [
            { label: '身份证号', type: 'text', placeholder: '请输入18位身份证号' },
            { label: '联系电话', type: 'text', placeholder: '请输入手机号码' }
          ]},
          { label: '电子邮箱', type: 'text', placeholder: '请输入电子邮箱' },

          // 人才认定信息
          { section: '人才认定信息' },
          { row: [
            { label: '人才层级', type: 'select', options: ['国家级', '省级', '市级', '区级'], required: true },
            { label: '人才类别', type: 'select', options: ['A类', 'B类', 'C类', 'D类', 'E类', 'F类', 'G类'], required: true }
          ]},
          { row: [
            { label: '人才类型', type: 'select', options: ['中国工程院院士', '中国科学院院士', '长江学者特聘教授', '国家杰出青年基金', '国家优青', '万人计划', '省级特聘专家', '省杰青', '省青年拔尖人才', '市级领军人才', '市级拔尖人才', '区级优秀人才'], required: true },
            { label: '入选年份', type: 'select', options: ['2024年', '2023年', '2022年', '2021年', '2020年', '2019年', '2018年', '2017年'], required: true }
          ]},
          { row: [
            { label: '状态', type: 'select', options: ['在库', '出库', '待审核'], required: true },
            { label: '专业职称', type: 'select', options: ['正高级工程师', '高级工程师', '工程师', '助理工程师', '研究员', '副研究员', '教授', '副教授'] }
          ]},
          { label: '职业资格', type: 'text', placeholder: '如：注册工程师、一级建造师等' },

          // 所在单位信息
          { section: '所在单位信息' },
          { label: '工作单位', type: 'text', placeholder: '请输入工作单位，系统将自动关联单位性质与所属行业', required: true },
          { row: [
            { label: '行政职务', type: 'text', placeholder: '请输入行政职务' },
            { label: '在职状态', type: 'select', options: ['在职', '离职', '退休', '调离'] }
          ]},
          { label: '入职时间', type: 'month' }
        ]
      };
    }

    // 企业管理
    if (pageTitle.includes('企业数据管理') || (pageTitle.includes('企业') && !pageTitle.includes('分析') && !pageTitle.includes('画像') && !pageTitle.includes('发布'))) {
      return {
        title: '新增企业',
        successMsg: '企业信息添加成功',
        fields: [
          { label: '企业名称', type: 'text', placeholder: '请输入企业全称', required: true },
          { row: [
            { label: '统一社会信用代码', type: 'text', placeholder: '请输入18位信用代码', required: true },
            { label: '企业类型', type: 'select', options: ['国有企业', '民营企业', '外资企业', '混合所有制'] }
          ]},
          { row: [
            { label: '所属产业', type: 'select', options: ['新一代信息技术', '高端装备制造', '新材料', '新能源', '生物医药', '其他'], required: true },
            { label: '企业规模', type: 'select', options: ['大型', '中型', '小型', '微型'] }
          ]},
          { row: [
            { label: '党组织状态', type: 'select', options: ['已建党委', '已建党总支', '已建党支部', '联合党支部', '未组建', '筹建中'] },
            { label: '党员人数', type: 'text', placeholder: '请输入党员人数' }
          ]},
          { row: [
            { label: '联系人', type: 'text', placeholder: '请输入联系人姓名' },
            { label: '联系电话', type: 'text', placeholder: '请输入联系电话' }
          ]},
          { label: '企业地址', type: 'address', placeholder: '请输入企业详细地址' },
          { label: '企业简介', type: 'textarea', placeholder: '请输入企业简介' }
        ]
      };
    }

    // 组织管理 / 党工委
    if (pageTitle.includes('党工委') || pageTitle.includes('党组织') || pageTitle.includes('组织数据管理')) {
      var orgTitle = btnText.includes('党工委') ? '新增党工委' :
                     btnText.includes('企业工委') ? '新增企业工委' :
                     btnText.includes('组织') ? '新增组织' : '新增党组织';
      return {
        title: orgTitle,
        successMsg: '组织信息添加成功',
        fields: [
          { label: '组织名称', type: 'text', placeholder: '请输入组织全称', required: true },
          { row: [
            { label: '组织类型', type: 'select', options: ['党委', '党总支', '党支部', '党小组'], required: true },
            { label: '上级组织', type: 'text', placeholder: '请输入上级组织名称' }
          ]},
          { row: [
            { label: '书记', type: 'text', placeholder: '请输入书记姓名', required: true },
            { label: '委员数', type: 'text', placeholder: '请输入委员人数' }
          ]},
          { row: [
            { label: '党员总数', type: 'text', placeholder: '请输入党员总数' },
            { label: '成立时间', type: 'date' }
          ]},
          { row: [
            { label: '联系电话', type: 'text', placeholder: '请输入联系电话' },
            { label: '组织状态', type: 'select', options: ['正常', '筹建中', '撤销'] }
          ]},
          { label: '组织地址', type: 'address', placeholder: '请输入组织办公地址' },
          { label: '组织简介', type: 'textarea', placeholder: '请输入组织简介' }
        ]
      };
    }

    return null;
  }

  function buildFormHtml(fields) {
    var html = '';
    var inSection = false;
    fields.forEach(function(field) {
      if (field.section) {
        if (inSection) {
          html += '</div>';
        }
        html += '<div class="form-section">';
        html += '<div class="form-section-title">' + field.section + '</div>';
        inSection = true;
      } else if (field.row) {
        html += '<div class="form-row">';
        field.row.forEach(function(f) {
          html += buildFieldHtml(f);
        });
        html += '</div>';
      } else {
        html += buildFieldHtml(field);
      }
    });
    if (inSection) {
      html += '</div>';
    }
    return html;
  }

  function buildFieldHtml(field) {
    var label = field.label || '';
    var required = field.required ? ' <span class="required">*</span>' : '';
    var requiredAttr = field.required ? ' data-required="true"' : '';
    var placeholder = field.placeholder ? ' placeholder="' + field.placeholder + '"' : '';
    var disabledAttr = field.disabled ? ' disabled' : '';
    var valueAttr = field.value !== undefined && field.value !== null ? ' value="' + field.value + '"' : '';

    var input = '';
    if (field.type === 'select') {
      input = '<select class="form-select"' + requiredAttr + disabledAttr + '>';
      (field.options || []).forEach(function(opt) {
        var selected = field.value === opt ? ' selected' : '';
        input += '<option value="' + opt + '"' + selected + '>' + opt + '</option>';
      });
      input += '</select>';
    } else if (field.type === 'textarea') {
      var textVal = field.value || '';
      input = '<textarea class="form-textarea"' + requiredAttr + placeholder + disabledAttr + '>' + textVal + '</textarea>';
    } else if (field.type === 'date') {
      input = '<input type="date" class="form-input"' + requiredAttr + valueAttr + disabledAttr + ' />';
    } else if (field.type === 'month') {
      input = '<input type="month" class="form-input"' + requiredAttr + valueAttr + disabledAttr + ' />';
    } else if (field.type === 'address') {
      // 地址输入框 + 地图选点按钮
      input = '<div class="address-input-group">' +
                '<input type="text" class="form-input"' + requiredAttr + placeholder + valueAttr + disabledAttr + ' data-field-type="address" />' +
                '<button type="button" class="gis-pick-btn" onclick="__openGisPicker(this)">📍 地图选点</button>' +
              '</div>';
    } else if (field.type === 'tagselect') {
      // 标签多选
      var tagHtml = '';
      var selectedVals = (field.value && Array.isArray(field.value)) ? field.value : [];
      (field.options || []).forEach(function(opt) {
        var selectedClass = selectedVals.indexOf(opt) >= 0 ? ' active' : '';
        tagHtml += '<span class="tag-option' + selectedClass + '" data-value="' + opt + '">' + opt + '</span>';
      });
      input = '<div class="tag-select-wrap" data-field-type="tagselect">' +
                tagHtml +
              '</div>';
    } else {
      input = '<input type="text" class="form-input"' + requiredAttr + placeholder + valueAttr + disabledAttr + ' />';
    }

    return '<div class="form-group">' +
             '<label class="form-label">' + label + required + '</label>' +
             input +
           '</div>';
  }

  // ===== 初始化 =====
  function initAll() {
    try { initSidebarMenu(); } catch(e) {}
    try { initTabs(); } catch(e) {}
    try { initPagination(); } catch(e) {}
    try { initTableActions(); } catch(e) {}
    try { initKpiCards(); } catch(e) {}
    try { initChartCards(); } catch(e) {}
    try { initButtons(); } catch(e) {}
    try { initFilterBar(); } catch(e) {}
    try { initOrgTree(); } catch(e) {}
    try { initActivityCards(); } catch(e) {}
    try { initCourseCards(); } catch(e) {}
    try { initEnterpriseCards(); } catch(e) {}
    try { initTimeline(); } catch(e) {}
    try { initTableLinks(); } catch(e) {}
    try { initBreadcrumb(); } catch(e) {}
    try { initDashboardCards(); } catch(e) {}
    try { initBigscreen(); } catch(e) {}
    try { initCheckboxAll(); } catch(e) {}
    try { initForms(); } catch(e) {}
    try { initTagSelections(); } catch(e) {}
    try { initAddButtons(); } catch(e) {}
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // 暴露给全局，方便页面手动调用
  window.PlatformUI = {
    init: initAll,
    initTabs: initTabs,
    initPagination: initPagination,
    initTableActions: initTableActions
  };
})();
