import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(repoRoot, 'src/ui/colorSettingsWindow.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const L = {
  title: jp(0x8272, 0x8a2d, 0x5b9a),
  close: jp(0x9589, 0x3058, 0x308b),
  dragHint: jp(0x8272, 0x8a2d, 0x5b9a, 0x30d1, 0x30cd, 0x30eb, 0x30eb, 0x30eb, 0x3092, 0x79fb, 0x52d5),
};

const POS_STORAGE_KEY = 'mga-color-settings-window-pos';
const DEFAULT_WIDTH = 440;
const DEFAULT_TOP = 72;
const DEFAULT_RIGHT = 16;

const content = `const POS_STORAGE_KEY = '${POS_STORAGE_KEY}';
const DEFAULT_WIDTH = ${DEFAULT_WIDTH};
const DEFAULT_TOP = ${DEFAULT_TOP};
const DEFAULT_RIGHT = ${DEFAULT_RIGHT};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadWindowPosition() {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function saveWindowPosition(left, top) {
  localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ left, top }));
}

function applyDefaultPosition(el) {
  const saved = loadWindowPosition();
  if (saved) {
    el.style.left = \`\${saved.left}px\`;
    el.style.top = \`\${saved.top}px\`;
    return;
  }
  el.style.top = \`\${DEFAULT_TOP}px\`;
  el.style.right = \`\${DEFAULT_RIGHT}px\`;
  el.style.left = 'auto';
}

function clampWindowPosition(el) {
  const rect = el.getBoundingClientRect();
  const left = clamp(rect.left, 8, window.innerWidth - rect.width - 8);
  const top = clamp(rect.top, 8, window.innerHeight - rect.height - 8);
  el.style.left = \`\${left}px\`;
  el.style.top = \`\${top}px\`;
  el.style.right = 'auto';
  saveWindowPosition(left, top);
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
        window.innerWidth - el.offsetWidth - 8,
      );
      const top = clamp(
        startTop + ev.clientY - startY,
        8,
        window.innerHeight - el.offsetHeight - 8,
      );
      el.style.left = \`\${left}px\`;
      el.style.top = \`\${top}px\`;
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

/**
 * ${jp(0x8272, 0x8a2d, 0x5b9a, 0x3092, 0x30c9, 0x30e9, 0x30b0, 0x53ef, 0x80fd, 0x306a, 0x5c0f, 0x30a6, 0x30a3, 0x30f3, 0x30c9, 0x30a6, 0x3067, 0x8868, 0x793a, 0x3059, 0x308b, 0x3002)}
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
  shell.style.width = \`\${DEFAULT_WIDTH}px\`;
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'false');
  shell.setAttribute('aria-labelledby', 'color-settings-window-title');

  const header = document.createElement('header');
  header.className = 'color-settings-window-header';

  const title = document.createElement('h2');
  title.className = 'color-settings-window-title';
  title.id = 'color-settings-window-title';
  title.textContent = '${L.title}';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'color-settings-window-close';
  closeBtn.setAttribute('aria-label', '${L.close}');
  closeBtn.textContent = '\u00d7';

  header.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'color-settings-window-body';

  shell.append(header, body);
  const mountTarget = document.querySelector('.plan-app') ?? document.body;
  mountTarget.appendChild(shell);

  applyDefaultPosition(shell);
  bindWindowDrag(header, shell);

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
      requestAnimationFrame(() => clampWindowPosition(shell));
    }
    onOpenChange?.(open);
  };

  closeBtn.addEventListener('click', () => setOpen(false));

  window.addEventListener('resize', () => {
    if (!open) return;
    clampWindowPosition(shell);
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
    },
    destroy: () => {
      shell.remove();
    },
  };
}
`;

writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('Wrote', outPath);
