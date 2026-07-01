let pendingTabFocus = null;

export function markPlanCellTabTarget(rowKey, month, scopeId) {
  pendingTabFocus = { scopeId, rowKey: String(rowKey), month: String(month) };
}

export function takePlanCellTabTarget(scopeId) {
  if (pendingTabFocus?.scopeId !== scopeId) return null;
  const target = pendingTabFocus;
  pendingTabFocus = null;
  return target;
}

export function tagPlanEditableCell(td, { rowKey, month }) {
  if (rowKey != null) td.dataset.planRowKey = String(rowKey);
  if (month != null) td.dataset.planMonth = String(month);
}

export function tagPlanEditableRow(tr, rowKey) {
  if (rowKey != null) tr.dataset.planRowKey = String(rowKey);
}

export function findNextEditablePlanCell(td) {
  let el = td.nextElementSibling;
  while (el) {
    if (el.matches('td.salary-plan-cell-editable')) return el;
    el = el.nextElementSibling;
  }
  return null;
}

function resolvePlanTabTargetCell(container, target) {
  if (!container || !target) return null;
  const row = container.querySelector(
    `tr[data-plan-row-key="${CSS.escape(target.rowKey)}"]`,
  );
  const cell = row?.querySelector(`td[data-plan-month="${CSS.escape(target.month)}"]`);
  if (cell?.classList.contains('salary-plan-cell-editable')) return cell;
  return null;
}

export function resumePlanCellTabEdit(container, scopeId) {
  const target = takePlanCellTabTarget(scopeId);
  const cell = resolvePlanTabTargetCell(container, target);
  if (!cell) return;
  requestAnimationFrame(() => {
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  });
}

export function handlePlanAmountCellKeydown(e, {
  finish,
  td,
  scopeId,
  allowShiftFillForward = true,
  onTabNext,
}) {
  if (e.isComposing) return false;
  if (e.key === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    finish(true, allowShiftFillForward && e.shiftKey);
    return true;
  }
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const nextTd = findNextEditablePlanCell(td);
    const row = td.closest('tr');
    const rowKey = td.dataset.planRowKey ?? row?.dataset.planRowKey;
    const nextMonth = nextTd?.dataset.planMonth;
    if (onTabNext) {
      finish(true, false);
      onTabNext(nextTd, { rowKey, nextMonth });
    } else {
      if (scopeId && rowKey && nextMonth) {
        markPlanCellTabTarget(rowKey, nextMonth, scopeId);
      }
      finish(true, false);
    }
    return true;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    finish(false);
    return true;
  }
  return false;
}
