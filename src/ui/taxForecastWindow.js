import { getLayoutViewportWidth } from '../config/viewportScale.js';

const TAX_FORECAST_POS_STORAGE_KEY = 'mga-tax-forecast-window-pos';
const TAX_FORECAST_WINDOW_WIDTH_REM = 76;
const TAX_FORECAST_DEFAULT_TOP = 96;
const TAX_FORECAST_DEFAULT_RIGHT = 16;
const TAX_FORECAST_MIN_WINDOW_WIDTH = 880;
const TAX_FORECAST_MIN_WINDOW_HEIGHT = 160;
const TAX_FORECAST_VIEWPORT_EDGE_MARGIN = 16;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMaxWindowWidth() {
  return Math.max(TAX_FORECAST_MIN_WINDOW_WIDTH, getLayoutViewportWidth() - TAX_FORECAST_VIEWPORT_EDGE_MARGIN);
}

function getMaxWindowHeight() {
  return Math.max(
    TAX_FORECAST_MIN_WINDOW_HEIGHT,
    window.innerHeight - TAX_FORECAST_VIEWPORT_EDGE_MARGIN,
  );
}

function loadWindowPosition() {
  try {
    const raw = localStorage.getItem(TAX_FORECAST_POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function saveWindowPosition(left, top) {
  localStorage.setItem(TAX_FORECAST_POS_STORAGE_KEY, JSON.stringify({ left, top }));
}

function applyDefaultPosition(el) {
  const saved = loadWindowPosition();
  if (saved) {
    el.style.left = `${saved.left}px`;
    el.style.top = `${saved.top}px`;
    return;
  }
  el.style.top = `${TAX_FORECAST_DEFAULT_TOP}px`;
  el.style.right = `${TAX_FORECAST_DEFAULT_RIGHT}px`;
  el.style.left = 'auto';
}

function clampWindowPosition(el) {
  const rect = el.getBoundingClientRect();
  const left = clamp(rect.left, 8, getLayoutViewportWidth() - rect.width - 8);
  const top = clamp(rect.top, 8, window.innerHeight - rect.height - 8);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.right = 'auto';
  saveWindowPosition(left, top);
}

function getRootFontSizePx() {
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}

function resolveWindowWidth() {
  return clamp(
    Math.round(TAX_FORECAST_WINDOW_WIDTH_REM * getRootFontSizePx()),
    TAX_FORECAST_MIN_WINDOW_WIDTH,
    getMaxWindowWidth(),
  );
}

function measureWindowContentHeight(shell, body) {
  const header = shell.querySelector('.tax-forecast-window-header');
  const headerHeight = header?.offsetHeight ?? 0;
  const bodyStyle = getComputedStyle(body);
  const paddingTop = parseFloat(bodyStyle.paddingTop) || 0;
  const paddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
  const content = body.firstElementChild;
  const contentHeight = content?.scrollHeight ?? body.scrollHeight;
  const chromeHeight = shell.offsetHeight - body.offsetHeight;
  const total = chromeHeight + paddingTop + paddingBottom + contentHeight;
  return clamp(total, TAX_FORECAST_MIN_WINDOW_HEIGHT, getMaxWindowHeight());
}

/** 来期納税見込みを予実表上にドラッグ可能な小ウィンドウで表示する */
export function createTaxForecastWindow({
  mountContent,
  onOpenChange = null,
}) {
  let open = false;
  let mounted = false;
  let layoutLocked = false;
  let lockedShellWidth = null;
  let lockedShellHeight = null;

  const shell = document.createElement('div');
  shell.className = 'tax-forecast-window';
  shell.hidden = true;
  shell.style.width = `${TAX_FORECAST_WINDOW_WIDTH_REM}rem`;
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'false');
  shell.setAttribute('aria-labelledby', 'tax-forecast-window-title');

  const header = document.createElement('header');
  header.className = 'tax-forecast-window-header';

  const title = document.createElement('h2');
  title.className = 'tax-forecast-window-title';
  title.id = 'tax-forecast-window-title';
  title.textContent = '来期納税見込み';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'tax-forecast-window-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.textContent = '×';

  header.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'tax-forecast-window-body';

  shell.append(header, body);
  const mountTarget = document.querySelector('.plan-app') ?? document.body;
  mountTarget.appendChild(shell);

  applyDefaultPosition(shell);
  bindWindowDrag(header, shell);

  const applyLockedShellSize = () => {
    if (lockedShellWidth != null) {
      shell.style.width = `${lockedShellWidth}px`;
      shell.style.maxWidth = `${getMaxWindowWidth()}px`;
    }
    if (lockedShellHeight != null) {
      shell.style.height = `${lockedShellHeight}px`;
      shell.style.maxHeight = `${getMaxWindowHeight()}px`;
    }
  };

  const lockWindowLayout = () => {
    const maxWidth = getMaxWindowWidth();
    lockedShellWidth = resolveWindowWidth();
    shell.style.width = `${lockedShellWidth}px`;
    shell.style.maxWidth = `${maxWidth}px`;

    const nextHeight = measureWindowContentHeight(shell, body);
    lockedShellHeight = nextHeight;
    shell.style.height = `${nextHeight}px`;
    shell.style.maxHeight = `${getMaxWindowHeight()}px`;
    layoutLocked = true;
  };

  const syncWindowLayout = () => {
    if (!open) return;
    if (!layoutLocked) {
      lockWindowLayout();
    } else {
      applyLockedShellSize();
    }
    clampWindowPosition(shell);
  };

  const ensureMounted = () => {
    if (mounted) return;
    mountContent(body);
    mounted = true;
  };

  const setOpen = (next) => {
    if (open === next) return;
    open = next;
    shell.hidden = !open;
    shell.classList.toggle('is-open', open);
    if (open) {
      ensureMounted();
      requestAnimationFrame(() => syncWindowLayout());
    }
    onOpenChange?.(open);
  };

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('resize', () => {
    if (!open || !layoutLocked) return;
    applyLockedShellSize();
    clampWindowPosition(shell);
  });

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    getBody: () => body,
    syncLayout: syncWindowLayout,
    syncContentHeight: () => {
      if (!open) return;
      lockedShellHeight = measureWindowContentHeight(shell, body);
      applyLockedShellSize();
      clampWindowPosition(shell);
    },
    recalculateLayout: () => {
      if (!open) return;
      lockedShellWidth = resolveWindowWidth();
      lockedShellHeight = measureWindowContentHeight(shell, body);
      layoutLocked = true;
      applyLockedShellSize();
      clampWindowPosition(shell);
    },
    refresh: () => {
      if (!mounted) return;
      body.replaceChildren();
      mounted = false;
      layoutLocked = false;
      lockedShellWidth = null;
      lockedShellHeight = null;
      ensureMounted();
      if (open) {
        requestAnimationFrame(() => syncWindowLayout());
      }
    },
    destroy: () => {
      shell.remove();
    },
  };
}

function bindWindowDrag(handle, el) {
  handle.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    el.style.right = 'auto';

    const onMouseMove = (ev) => {
      const left = clamp(
        startLeft + ev.clientX - startX,
        8,
        getLayoutViewportWidth() - el.offsetWidth - 8,
      );
      const top = clamp(
        startTop + ev.clientY - startY,
        8,
        window.innerHeight - el.offsetHeight - 8,
      );
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      const nextRect = el.getBoundingClientRect();
      saveWindowPosition(nextRect.left, nextRect.top);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
