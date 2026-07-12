import { getLayoutViewportWidth } from '../config/viewportScale.js';
import { TIP_CLOSE } from '../config/uiTooltipConfig.js';

const TAX_FORECAST_WINDOW_WIDTH_REM = 76;
const TAX_FORECAST_DEFAULT_TOP = 96;
const TAX_FORECAST_DEFAULT_RIGHT = 16;
const TAX_FORECAST_MIN_WINDOW_WIDTH = 880;
const TAX_FORECAST_MIN_WINDOW_HEIGHT = 160;
const TAX_FORECAST_VIEWPORT_EDGE_MARGIN = 16;
/** サブピクセル丸めで縦スクロールが点灯しないよう、計測高に足す余白 */
const TAX_FORECAST_HEIGHT_MEASURE_BUFFER_PX = 2;

function taxForecastClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function taxForecastGetMaxWindowWidth() {
  return Math.max(TAX_FORECAST_MIN_WINDOW_WIDTH, getLayoutViewportWidth() - TAX_FORECAST_VIEWPORT_EDGE_MARGIN);
}

function taxForecastGetMaxWindowHeight() {
  return Math.max(
    TAX_FORECAST_MIN_WINDOW_HEIGHT,
    window.innerHeight - TAX_FORECAST_VIEWPORT_EDGE_MARGIN,
  );
}

/** 開き直すたびに内容全体が見える既定位置へ戻す */
function taxForecastApplyVisibleDefaultPosition(el) {
  el.style.top = `${TAX_FORECAST_DEFAULT_TOP}px`;
  el.style.right = `${TAX_FORECAST_DEFAULT_RIGHT}px`;
  el.style.left = 'auto';
  el.style.bottom = 'auto';
}

function getRootFontSizePx() {
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}

/** ルートフォント変更後も比率を保てるよう、幅を rem で求める */
function resolveWindowWidthRem() {
  const rootPx = getRootFontSizePx();
  const preferredPx = TAX_FORECAST_WINDOW_WIDTH_REM * rootPx;
  const clampedPx = taxForecastClamp(preferredPx, TAX_FORECAST_MIN_WINDOW_WIDTH, taxForecastGetMaxWindowWidth());
  return clampedPx / rootPx;
}

/**
 * シェル高さを内容に合わせて測る。
 * 固定 height の影響を避けるため、計測中だけ height:auto にする。
 */
function measureWindowContentHeight(shell, body) {
  const prevHeight = shell.style.height;
  const prevMaxHeight = shell.style.maxHeight;
  const prevBodyOverflowY = body?.style.overflowY ?? '';
  shell.style.height = 'auto';
  shell.style.maxHeight = 'none';
  if (body) body.style.overflowY = 'hidden';
  const measured = shell.scrollHeight + TAX_FORECAST_HEIGHT_MEASURE_BUFFER_PX;
  shell.style.height = prevHeight;
  shell.style.maxHeight = prevMaxHeight;
  if (body) body.style.overflowY = prevBodyOverflowY;
  return taxForecastClamp(measured, TAX_FORECAST_MIN_WINDOW_HEIGHT, taxForecastGetMaxWindowHeight());
}

function pxToRem(px) {
  return px / getRootFontSizePx();
}

/** 来期納税見込みを予実表上にドラッグ可能な小ウィンドウで表示する */
export function createTaxForecastWindow({
  mountContent,
  onOpenChange = null,
}) {
  let open = false;
  let mounted = false;
  let layoutLocked = false;
  // px 固定だと予実表の content-fit（rem）変更で中身と枠がずれるため rem で保持する
  let lockedShellWidthRem = TAX_FORECAST_WINDOW_WIDTH_REM;
  let lockedShellHeightRem = null;

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
  closeBtn.title = TIP_CLOSE;
  closeBtn.textContent = '×';

  header.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'tax-forecast-window-body';

  shell.append(header, body);
  const mountTarget = document.querySelector('.plan-app') ?? document.body;
  mountTarget.appendChild(shell);

  taxForecastBindWindowDrag(header, shell);

  const applyLockedShellSize = () => {
    const maxWidth = taxForecastGetMaxWindowWidth();
    const maxHeight = taxForecastGetMaxWindowHeight();
    const rootPx = getRootFontSizePx();
    const widthRem = Math.min(lockedShellWidthRem, maxWidth / rootPx);
    shell.style.width = `${widthRem}rem`;
    shell.style.maxWidth = `${maxWidth}px`;
    if (lockedShellHeightRem != null) {
      const heightPx = Math.min(lockedShellHeightRem * rootPx, maxHeight);
      const heightRem = heightPx / rootPx;
      shell.style.height = `${heightRem}rem`;
      shell.style.maxHeight = `${maxHeight}px`;
      // 内容が枠に収まるときは縦スクロールを出さない（ビューポート上限時のみ許可）
      const needsVerticalScroll = heightPx >= maxHeight - 0.5;
      body.style.overflowY = needsVerticalScroll ? 'auto' : 'hidden';
    }
  };

  const lockWindowLayout = () => {
    lockedShellWidthRem = resolveWindowWidthRem();
    shell.style.width = `${lockedShellWidthRem}rem`;
    shell.style.maxWidth = `${taxForecastGetMaxWindowWidth()}px`;
    lockedShellHeightRem = pxToRem(measureWindowContentHeight(shell, body));
    layoutLocked = true;
    applyLockedShellSize();
  };

  const syncWindowLayout = ({ resetPosition = false } = {}) => {
    if (!open) return;
    if (resetPosition) {
      taxForecastApplyVisibleDefaultPosition(shell);
    }
    if (!layoutLocked) {
      lockWindowLayout();
    } else {
      applyLockedShellSize();
    }
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
      // 開き直すたびに必ず全体が見える位置へ戻す（位置は記憶しない）
      requestAnimationFrame(() => syncWindowLayout({ resetPosition: true }));
    }
    onOpenChange?.(open);
  };

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('resize', () => {
    if (!open || !layoutLocked) return;
    // サイズだけ合わせる。はみ出し位置はそのまま（邪魔回避のため）
    applyLockedShellSize();
  });

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    getBody: () => body,
    syncLayout: () => syncWindowLayout(),
    syncContentHeight: () => {
      if (!open) return;
      lockedShellHeightRem = pxToRem(measureWindowContentHeight(shell, body));
      applyLockedShellSize();
    },
    recalculateLayout: () => {
      if (!open) return;
      lockedShellWidthRem = resolveWindowWidthRem();
      lockedShellHeightRem = pxToRem(measureWindowContentHeight(shell, body));
      layoutLocked = true;
      applyLockedShellSize();
    },
    refresh: () => {
      if (!mounted) return;
      body.replaceChildren();
      mounted = false;
      layoutLocked = false;
      lockedShellWidthRem = TAX_FORECAST_WINDOW_WIDTH_REM;
      lockedShellHeightRem = null;
      shell.style.height = '';
      shell.style.maxHeight = '';
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

/** ドラッグ中はビューポート外へはみ出してよい（サイズは維持） */
function taxForecastBindWindowDrag(handle, el) {
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
