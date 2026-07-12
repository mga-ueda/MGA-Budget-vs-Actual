import { getLayoutViewportWidth } from '../config/viewportScale.js';
import { TIP_CLOSE } from '../config/uiTooltipConfig.js';

const DEFAULT_WIDTH = 440;
const DEFAULT_TOP = 72;
const DEFAULT_RIGHT = 16;
const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 140;
const WINDOW_HEIGHT_RATIO = 0.6666666666666666;
const VIEWPORT_EDGE_MARGIN = 16;

function colorSettingsClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function colorSettingsGetMaxWindowWidth() {
  return Math.max(MIN_WINDOW_WIDTH, getLayoutViewportWidth() - VIEWPORT_EDGE_MARGIN);
}

function getTargetWindowHeight() {
  const viewportMax = window.innerHeight - VIEWPORT_EDGE_MARGIN;
  const target = Math.floor(window.innerHeight * WINDOW_HEIGHT_RATIO);
  return Math.max(MIN_WINDOW_HEIGHT, Math.min(target, viewportMax));
}

/** 開き直すたびに内容全体が見える既定位置へ戻す */
function colorSettingsApplyVisibleDefaultPosition(el) {
  el.style.top = `${DEFAULT_TOP}px`;
  el.style.right = `${DEFAULT_RIGHT}px`;
  el.style.left = 'auto';
  el.style.bottom = 'auto';
}

function measureColorSettingsWindowWidth(shell) {
  const previousWidth = shell.style.width;
  const previousMaxWidth = shell.style.maxWidth;
  shell.style.width = 'max-content';
  shell.style.maxWidth = 'none';
  const measured = Math.ceil(shell.offsetWidth);
  shell.style.width = previousWidth;
  shell.style.maxWidth = previousMaxWidth;
  return measured > 0 ? measured : DEFAULT_WIDTH;
}

function fitColorSettingsWindowWidth(shell) {
  const measured = measureColorSettingsWindowWidth(shell);
  const maxWidth = colorSettingsGetMaxWindowWidth();
  const nextWidth = colorSettingsClamp(measured, MIN_WINDOW_WIDTH, maxWidth);
  shell.style.maxWidth = `${maxWidth}px`;
  if (Math.abs(nextWidth - shell.offsetWidth) <= 1) return;
  shell.style.width = `${nextWidth}px`;
}

function fitColorSettingsWindowHeight(shell) {
  const targetHeight = getTargetWindowHeight();
  shell.style.maxHeight = `${targetHeight}px`;
  if (Math.abs(targetHeight - shell.offsetHeight) <= 1) return;
  shell.style.height = `${targetHeight}px`;
}

function syncColorSettingsWindowLayout(shell, { resetPosition = false } = {}) {
  if (resetPosition) {
    colorSettingsApplyVisibleDefaultPosition(shell);
  }
  fitColorSettingsWindowWidth(shell);
  fitColorSettingsWindowHeight(shell);
}

/** ドラッグ中はビューポート外へはみ出してよい（サイズは維持） */
function colorSettingsBindWindowDrag(handle, el) {
  handle.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    // right 指定のまま left を切ると一瞬左端へ飛ぶため、先に left/top を固定する
    el.style.left = `${startLeft}px`;
    el.style.top = `${startTop}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    const onMouseMove = (ev) => {
      el.style.left = `${startLeft + ev.clientX - startX}px`;
      el.style.top = `${startTop + ev.clientY - startY}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * 色設定をドラッグ可能な小ウィンドウで表示する。
 */
export function createColorSettingsWindow({
  mountContent,
  onOpenChange = null,
}) {
  let open = false;
  let mounted = false;

  const shell = document.createElement('div');
  shell.className = 'color-settings-window';
  shell.hidden = true;
  shell.style.width = `${DEFAULT_WIDTH}px`;
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'false');
  shell.setAttribute('aria-labelledby', 'color-settings-window-title');

  const header = document.createElement('header');
  header.className = 'color-settings-window-header';

  const title = document.createElement('h2');
  title.className = 'color-settings-window-title';
  title.id = 'color-settings-window-title';
  title.textContent = '色設定';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'color-settings-window-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.title = TIP_CLOSE;
  closeBtn.textContent = '×';

  header.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'color-settings-window-body';

  shell.append(header, body);
  const mountTarget = document.querySelector('.plan-app') ?? document.body;
  mountTarget.appendChild(shell);

  colorSettingsBindWindowDrag(header, shell);

  let layoutObserver = null;
  const bindLayoutObserver = () => {
    layoutObserver?.disconnect();
    const content = body.querySelector('.color-settings-content');
    if (!content) return;
    layoutObserver = new ResizeObserver(() => {
      if (!open) return;
      // サイズだけ合わせる。はみ出し位置はそのまま
      syncColorSettingsWindowLayout(shell);
    });
    layoutObserver.observe(content);
  };

  const ensureMounted = () => {
    if (mounted) return;
    mountContent(body);
    mounted = true;
    bindLayoutObserver();
  };

  const setOpen = (next) => {
    if (open === next) return;
    open = next;
    shell.hidden = !open;
    shell.classList.toggle('is-open', open);
    if (open) {
      ensureMounted();
      // 開き直すたびに必ず全体が見える位置へ戻す（位置は記憶しない）
      requestAnimationFrame(() => syncColorSettingsWindowLayout(shell, { resetPosition: true }));
    }
    onOpenChange?.(open);
  };

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('resize', () => {
    if (!open) return;
    syncColorSettingsWindowLayout(shell);
  });

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    refresh: () => {
      if (!mounted) return;
      body.replaceChildren();
      mounted = false;
      ensureMounted();
      if (open) {
        requestAnimationFrame(() => syncColorSettingsWindowLayout(shell));
      }
    },
    destroy: () => {
      layoutObserver?.disconnect();
      shell.remove();
    },
  };
}
