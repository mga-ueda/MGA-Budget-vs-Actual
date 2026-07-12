const EMPLOYEE_STORAGE_KEY = 'mga-employees';

const RESIDENT_TAX_MONTH_KEYS = ['6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];

function normalizeSalary(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeResidentTaxMonthly(value) {
  if (!value || typeof value !== 'object') return null;
  const result = {};
  for (const month of RESIDENT_TAX_MONTH_KEYS) {
    const amount = normalizeSalary(value[month]);
    if (amount !== null && amount !== 0) result[month] = amount;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** 役員報酬フラグを決定。未設定時は金額または旧名前判定から移行 */
function resolveIsDirectorCompensation(employee) {
  if (employee.isDirectorCompensation === true) return true;
  if (employee.isDirectorCompensation === false) return false;
  if ((normalizeSalary(employee.directorSalary) ?? 0) > 0) return true;
  const contract = String(employee.contractType ?? '');
  const position = String(employee.position ?? '');
  return /役員/.test(contract) || /役員/.test(position);
}

export function normalizeEmployee(employee) {
  if (!employee || typeof employee !== 'object') return null;
  const id = String(employee.id ?? '').trim();
  if (!id) return null;
  const result = {
    id,
    employeeNumber: String(employee.employeeNumber ?? '').trim(),
    lastName: String(employee.lastName ?? '').trim(),
    firstName: String(employee.firstName ?? '').trim(),
    lastNameKana: String(employee.lastNameKana ?? '').trim(),
    firstNameKana: String(employee.firstNameKana ?? '').trim(),
    jobType: String(employee.jobType ?? '').trim(),
    position: String(employee.position ?? '').trim(),
    contractType: String(employee.contractType ?? '').trim(),
    joinDate: String(employee.joinDate ?? '').trim(),
    leaveDate: String(employee.leaveDate ?? '').trim(),
    directorSalary: normalizeSalary(employee.directorSalary),
    isDirectorCompensation: resolveIsDirectorCompensation(employee),
    baseSalary: normalizeSalary(employee.baseSalary),
    positionAllowance: normalizeSalary(employee.positionAllowance),
    fixedOvertimePay: normalizeSalary(employee.fixedOvertimePay),
    childAllowance: normalizeSalary(employee.childAllowance),
    fixedOvertimeAllowance: normalizeSalary(employee.fixedOvertimeAllowance),
    commutingAllowance: normalizeSalary(employee.commutingAllowance),
    residentTaxMunicipality: String(employee.residentTaxMunicipality ?? '').trim(),
    residentTaxYear: String(employee.residentTaxYear ?? '').trim(),
    residentTaxMonthly: normalizeResidentTaxMonthly(employee.residentTaxMonthly),
  };
  if (employee.excludedFromSalaryPlan) result.excludedFromSalaryPlan = true;
  return result;
}

export function loadEmployees() {
  try {
    const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return sortEmployees(list.map(normalizeEmployee).filter(Boolean));
  } catch {
    return [];
  }
}

export function saveEmployees(employees) {
  const normalized = sortEmployees(employees.map(normalizeEmployee).filter(Boolean));
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function sortEmployees(employees) {
  return [...employees].sort((a, b) => {
    const numA = parseInt(a.employeeNumber, 10);
    const numB = parseInt(b.employeeNumber, 10);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
      return numA - numB;
    }
    const nameA = `${a.employeeNumber}${a.lastName}${a.firstName}`;
    const nameB = `${b.employeeNumber}${b.lastName}${b.firstName}`;
    return nameA.localeCompare(nameB, 'ja');
  });
}

export function mergeEmployees(existing, imported) {
  const map = new Map(existing.map((e) => [e.id, e]));
  for (const emp of imported) {
    const normalized = normalizeEmployee(emp);
    if (normalized) map.set(normalized.id, normalized);
  }
  return sortEmployees([...map.values()]);
}

export function createManualEmployee({ employeeNumber, lastName, firstName, contractType, joinDate, baseSalary, isDirectorCompensation }) {
  const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return normalizeEmployee({
    id,
    employeeNumber: employeeNumber ?? '',
    lastName: lastName ?? '',
    firstName: firstName ?? '',
    contractType: contractType ?? '',
    joinDate: joinDate ?? '',
    baseSalary: baseSalary ?? null,
    isDirectorCompensation: isDirectorCompensation === true,
  });
}

export function formatEmployeeName(employee) {
  return `${employee.lastName} ${employee.firstName}`.trim();
}

export function formatEmployeeYen(value) {
  if (value === null || value === undefined || value === 0) return '';
  return `\u00a5${value.toLocaleString('ja-JP')}`;
}

export function getEmployeeResidentTaxMunicipality(employee) {
  return String(employee.residentTaxMunicipality ?? '').trim();
}

/** 住民税の市区町村行の対象となる社員か（非表示フラグで除外。給与ゼロでも市区町村があれば対象） */
export function employeeHasResidentTaxObligation(employee) {
  if (employee.excludedFromSalaryPlan) return false;
  return Boolean(getEmployeeResidentTaxMunicipality(employee));
}

/** 住民税の支払い対象となる市区町村名 */
export function collectEmployeeResidentTaxMunicipalityNames(employees) {
  const names = new Set();
  for (const employee of employees ?? []) {
    const municipality = getEmployeeResidentTaxMunicipality(employee);
    if (!municipality) continue;
    if (employeeHasResidentTaxObligation(employee)) {
      names.add(municipality);
    }
  }
  return [...names];
}

export function parseEmployeeDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

/** 現在時点（または退職日）での勤続年月を計算 */
export function computeTenure(joinDateStr, leaveDateStr, refDate = new Date()) {
  const join = parseEmployeeDate(joinDateStr);
  if (!join) return '';

  let end = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const leave = parseEmployeeDate(leaveDateStr);
  if (leave && leave < end) {
    end = leave;
  }

  if (end < join) return '';

  let years = end.getFullYear() - join.getFullYear();
  let months = end.getMonth() - join.getMonth();
  if (end.getDate() < join.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years}年${months}ヶ月`;
}

/** 月額報酬（役員報酬または基本給＋手当）。 */
export function computeMonthlySalary(employee) {
  const director = employee.directorSalary ?? 0;
  const base = employee.baseSalary ?? 0;
  const main = director > 0 ? director : base;
  const allowance =
    (employee.positionAllowance ?? 0) +
    (employee.fixedOvertimePay ?? 0) +
    (employee.fixedOvertimeAllowance ?? 0) +
    (employee.childAllowance ?? 0);
  return main + allowance;
}

export function computeEmployeeAmountTotals(employees) {
  let monthlySalary = 0;
  for (const emp of employees) {
    monthlySalary += computeMonthlySalary(emp);
  }
  return { monthlySalary };
}

export function getEmployeeAmountTotalValue(columnKey, totals) {
  if (columnKey === 'monthlySalary') {
    return formatEmployeeYen(totals.monthlySalary);
  }
  return '';
}

export function isActiveEmployee(employee) {
  return !employee.leaveDate;
}

/** 給与支払い計画表・予実の人件費計画に含める在籍社員 */
export function isSalaryPlanEmployee(employee) {
  return isActiveEmployee(employee) && !employee.excludedFromSalaryPlan;
}

/** 役員報酬チェック */
export function isDirectorEmployee(employee) {
  return employee.isDirectorCompensation === true;
}

export function buildEmployeeTableColumns() {
  return [
    { kind: 'text', key: 'employeeNumber', label: '番号', className: 'col-emp-no' },
    { kind: 'text', key: 'name', label: '氏名', className: 'col-emp-name' },
    { kind: 'text', key: 'residentTaxMunicipality', label: '市区町村', className: 'col-emp-municipality' },
    { kind: 'text', key: 'contractType', label: '契約種別', className: 'col-emp-contract' },
    { kind: 'text', key: 'joinDate', label: '入社日', className: 'col-emp-join' },
    { kind: 'tenure', key: 'tenure', label: '勤続', className: 'col-emp-tenure' },
    {
      kind: 'amount',
      key: 'monthlySalary',
      label: '月額報酬',
      className: 'col-emp-amount',
    },
    {
      kind: 'directorCompensation',
      key: 'directorCompensation',
      label: '役員報酬',
      className: 'col-emp-director',
    },
    {
      kind: 'salaryPlanExclude',
      key: 'salaryPlanExclude',
      label: '非表示',
      className: 'col-emp-exclude',
    },
    { kind: 'actions', key: 'actions', label: '操作', className: 'col-emp-actions' },
  ];
}


/** 手当合計 */
export function getEmployeeAllowanceTotal(employee) {
  return (employee.positionAllowance ?? 0)
    + (employee.fixedOvertimePay ?? 0)
    + (employee.fixedOvertimeAllowance ?? 0)
    + (employee.childAllowance ?? 0);
}

/** 一覧セル編集用の初期値 */
export function getEmployeeTableCellEditRawValue(employee, columnKey) {
  switch (columnKey) {
    case 'employeeNumber':
      return employee.employeeNumber || '';
    case 'name':
      return formatEmployeeName(employee);
    case 'residentTaxMunicipality':
      return getEmployeeResidentTaxMunicipality(employee);
    case 'contractType':
      return employee.contractType || '';
    case 'joinDate':
      return employee.joinDate || '';
    case 'monthlySalary': {
      const total = computeMonthlySalary(employee);
      return total ? String(total) : '';
    }
    default:
      return '';
  }
}

/**
 * 一覧セル編集を適用。不正な入力はエラーを返す
 * @returns {{ employee: object, error?: string } | null}
 */
export function applyEmployeeTableCellEdit(employee, columnKey, rawValue) {
  const text = String(rawValue ?? '').trim();
  switch (columnKey) {
    case 'employeeNumber':
      return { employee: { ...employee, employeeNumber: text } };
    case 'name': {
      const parts = text.split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        return {
          employee: null,
          error: '姓と名を空白区切りで入力してください。',
        };
      }
      return {
        employee: {
          ...employee,
          lastName: parts[0],
          firstName: parts.slice(1).join(' '),
        },
      };
    }
    case 'residentTaxMunicipality':
      return { employee: { ...employee, residentTaxMunicipality: text } };
    case 'contractType':
      return { employee: { ...employee, contractType: text } };
    case 'joinDate':
      return { employee: { ...employee, joinDate: text } };
    case 'monthlySalary': {
      const digits = text.replace(/[^\d]/g, '');
      const total = digits ? parseInt(digits, 10) : null;
      if (digits && !Number.isFinite(total)) return { employee: null, error: '金額が不正です。' };
      const allowance = getEmployeeAllowanceTotal(employee);
      const main = total == null ? null : Math.max(0, total - allowance);
      if ((employee.directorSalary ?? 0) > 0) {
        return { employee: { ...employee, directorSalary: main } };
      }
      return { employee: { ...employee, baseSalary: main } };
    }
    default:
      return { employee };
  }
}

export const EMPLOYEE_TABLE_EDITABLE_KEYS = new Set([
  'employeeNumber',
  'name',
  'residentTaxMunicipality',
  'contractType',
  'joinDate',
  'monthlySalary',
]);

export function getEmployeeCellValue(employee, column, refDate = new Date()) {
  switch (column.key) {
    case 'employeeNumber':
      return employee.employeeNumber || '';
    case 'name':
      return formatEmployeeName(employee);
    case 'residentTaxMunicipality':
      return getEmployeeResidentTaxMunicipality(employee);
    case 'contractType':
      return employee.contractType || '';
    case 'joinDate':
      return employee.joinDate || '';
    case 'tenure':
      return computeTenure(employee.joinDate, employee.leaveDate, refDate);
    case 'monthlySalary':
      return formatEmployeeYen(computeMonthlySalary(employee));
    default:
      return '';
  }
}
