/**
 * 大屏页面通用交互
 * 实时时间、模式切换、自动轮播、滚动动画等
 */

(function() {
  'use strict';

  // ============================================
  // 实时时间更新
  // 支持：[data-clock], .clock, .current-time, .header-time,
  //      #currentTime, .date-time .date, .date-time span
  // ============================================
  function updateClock() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');

    var dateStr = year + '年' + month + '月' + day + '日 ' + week;
    var timeStr = hours + ':' + minutes + ':' + seconds;

    // 通用时钟元素
    var clockEls = document.querySelectorAll('[data-clock], .clock, .current-time, .header-time');
    clockEls.forEach(function(el) {
      var format = el.getAttribute('data-clock');
      if (format === 'date') {
        el.textContent = dateStr;
      } else if (format === 'time') {
        el.textContent = timeStr;
      } else if (format === 'datetime') {
        el.textContent = dateStr + '  ' + timeStr;
      } else {
        if (el.classList.contains('header-time') || el.closest('.header-left, .header-right')) {
          el.textContent = timeStr;
        } else {
          el.textContent = dateStr + '  ' + timeStr;
        }
      }
    });

    // .date-time 结构：日期 + 时间分开
    var dateTimeContainers = document.querySelectorAll('.date-time');
    dateTimeContainers.forEach(function(container) {
      var dateEl = container.querySelector('.date, #currentDate');
      var timeEl = container.querySelector('#currentTime, .time');
      if (dateEl) dateEl.textContent = dateStr;
      if (timeEl) timeEl.textContent = timeStr;
    });

    // 独立的时间/日期 ID
    var currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) currentTimeEl.textContent = timeStr;
    var currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) currentDateEl.textContent = dateStr;
  }

  // ============================================
  // 模式切换（组织/产业/人才/服务 或 日/周/月）
  // 支持：[data-mode] 属性 和 .mode-switch button 结构
  // ============================================
  function initModeSwitch() {
    // 结构1：data-mode 属性
    var modeBtns = document.querySelectorAll('[data-mode]');
    modeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var group = btn.closest('.mode-switch, .mode-tabs, .header-right');
        if (group) {
          group.querySelectorAll('[data-mode]').forEach(function(b) {
            b.classList.remove('active');
          });
        }
        btn.classList.add('active');
      });
    });

    // 结构2：.mode-switch 容器内的 button
    var modeSwitches = document.querySelectorAll('.mode-switch');
    modeSwitches.forEach(function(sw) {
      var btns = sw.querySelectorAll('button, .mode-btn, .tab-btn');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    });
  }

  // ============================================
  // 自动轮播（卡片列表、跑马灯等）
  // ============================================
  function initCarousel() {
    var carousels = document.querySelectorAll('[data-carousel], .auto-scroll, .scroll-list');
    carousels.forEach(function(carousel) {
      var items = carousel.querySelectorAll('.carousel-item, .scroll-item, .card-item, .list-item');
      if (items.length <= 2) return;

      var interval = parseInt(carousel.getAttribute('data-interval')) || 3000;
      var currentIndex = 0;
      var isPaused = false;

      // 悬停暂停
      carousel.addEventListener('mouseenter', function() { isPaused = true; });
      carousel.addEventListener('mouseleave', function() { isPaused = false; });

      setInterval(function() {
        if (isPaused) return;
        // 简单的滚动效果：将第一个元素移到最后
        var firstItem = carousel.firstElementChild;
        if (firstItem) {
          firstItem.style.transition = 'opacity 0.3s';
          firstItem.style.opacity = '0';
          setTimeout(function() {
            carousel.appendChild(firstItem);
            firstItem.style.opacity = '1';
          }, 300);
        }
      }, interval);
    });
  }

  // ============================================
  // 数字滚动动画
  // ============================================
  function initCountUp() {
    var numbers = document.querySelectorAll('[data-count], .count-number, .kpi-number');
    numbers.forEach(function(el) {
      var target = parseInt(el.getAttribute('data-count')) || parseInt(el.textContent.replace(/[^0-9]/g, ''));
      if (!target || target < 10) return;

      var duration = 1500;
      var start = 0;
      var startTime = null;
      var suffix = el.textContent.replace(/[0-9,]/g, '').trim();

      function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var easeOut = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(start + (target - start) * easeOut);
        el.textContent = current.toLocaleString() + (suffix || '');
        if (progress < 1) requestAnimationFrame(animate);
      }

      // 元素进入视口时触发
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            requestAnimationFrame(animate);
            observer.disconnect();
          }
        });
      }, { threshold: 0.3 });

      observer.observe(el);
    });
  }

  // ============================================
  // 跑马灯/滚动文字
  // ============================================
  function initMarquee() {
    var marquees = document.querySelectorAll('.marquee, [data-marquee]');
    marquees.forEach(function(marquee) {
      var content = marquee.innerHTML;
      marquee.innerHTML = '<div class="marquee-content">' + content + '</div>';
      var inner = marquee.querySelector('.marquee-content');
      // 复制一份实现无缝滚动
      inner.innerHTML = inner.innerHTML + inner.innerHTML;
    });
  }

  // ============================================
  // 初始化
  // ============================================
  function init() {
    updateClock();
    setInterval(updateClock, 1000);
    initModeSwitch();
    initCarousel();
    initCountUp();
    initMarquee();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
