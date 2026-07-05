/** Reference viewport width (scale = 1.0 at this width). */
export const DESIGN_VIEWPORT_WIDTH = 1600;

/** WebKit scrollbar thickness (px). Fixed so layout math does not track scrollbar presence. */
export const PLAN_SCROLLBAR_SIZE = 8;

export const MIN_VIEWPORT_SCALE = 0.65;
/** Wide screens may scale above 1.0 up to this cap. */
export const MAX_VIEWPORT_SCALE = 1.1;

/** Plan table fit: shrink when overlapping, grow when space allows. */
export const MIN_CONTENT_FIT_SCALE = 0.72;
export const MAX_CONTENT_FIT_SCALE = 1.28;
export const MAX_CONTENT_FIT_SCALE_ABSOLUTE = 1.42;

let currentViewportScale = 1;
let currentContentFitScale = 1;

/** Layout viewport width excluding the root scrollbar (stable for scale math). */
export function getLayoutViewportWidth() {
  if (typeof document !== 'undefined' && document.documentElement) {
    return document.documentElement.clientWidth;
  }
  return typeof window !== 'undefined' ? window.innerWidth : DESIGN_VIEWPORT_WIDTH;
}

export function computeViewportScale(width = getLayoutViewportWidth()) {
  const raw = width / DESIGN_VIEWPORT_WIDTH;
  const clamped = Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, raw));
  return Math.round(clamped * 100) / 100;
}

/** Upper content-fit cap rises on viewports wider than the design width. */
export function computeMaxContentFitScale(width = getLayoutViewportWidth()) {
  if (width <= DESIGN_VIEWPORT_WIDTH) return MAX_CONTENT_FIT_SCALE;
  const extra = (width - DESIGN_VIEWPORT_WIDTH) / DESIGN_VIEWPORT_WIDTH;
  const scaled = MAX_CONTENT_FIT_SCALE + extra * 0.4;
  return Math.round(Math.min(MAX_CONTENT_FIT_SCALE_ABSOLUTE, scaled) * 100) / 100;
}

export function getViewportScale() {
  return currentViewportScale;
}

export function getContentFitScale() {
  return currentContentFitScale;
}

export function setContentFitScale(scale) {
  const max = computeMaxContentFitScale();
  const clamped = Math.min(max, Math.max(MIN_CONTENT_FIT_SCALE, scale));
  currentContentFitScale = Math.round(clamped * 100) / 100;
}

export function resetContentFitScale() {
  currentContentFitScale = 1;
}

export function applyViewportScale(scale) {
  currentViewportScale = scale;
  document.documentElement.style.setProperty('--plan-viewport-scale', String(scale));
}

export function bindViewportScale(onChange) {
  let raf = null;
  let lastScale = computeViewportScale();
  applyViewportScale(lastScale);

  const update = () => {
    const next = computeViewportScale();
    if (next === lastScale) return;
    lastScale = next;
    applyViewportScale(next);
    onChange?.(next);
  };

  const schedule = () => {
    if (raf != null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      update();
    });
  };

  window.addEventListener('resize', schedule);
  return () => {
    window.removeEventListener('resize', schedule);
    if (raf != null) cancelAnimationFrame(raf);
  };
}
