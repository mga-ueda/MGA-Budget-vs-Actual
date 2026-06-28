import { parseCsvLine, parseNumber } from './parser.js';

const COL = {
  MF_ID: '\u5f93\u696d\u54e1\u8b58\u5225\u5b50',
  EMPLOYEE_NUMBER: '\u5f93\u696d\u54e1\u756a\u53f7',
  LAST_NAME: '\u59d3',
  FIRST_NAME: '\u540d',
  LAST_NAME_KANA: '\u59d3\uff08\u30d5\u30ea\u30ac\u30ca\uff09',
  FIRST_NAME_KANA: '\u540d\uff08\u30d5\u30ea\u30ac\u30ca\uff09',
  JOB_TYPE: '\u8077\u7a2e',
  POSITION: '\u5f79\u8077',
  CONTRACT_TYPE: '\u5951\u7d04\u7a2e\u5225',
  JOIN_DATE: '\u5165\u793e\u5e74\u6708\u65e5',
  LEAVE_DATE: '\u9000\u8077\u5e74\u6708\u65e5',
  DIRECTOR_SALARY: '\u5f79\u54e1\u5831\u916c(\u6708\u7d66)',
  BASE_SALARY: '\u57fa\u672c\u7d66(\u6708\u7d66)',
  POSITION_ALLOWANCE: '\u5f79\u8077\u624b\u5f53(\u6708\u7d66)',
  FIXED_OVERTIME_PAY: '\u56fa\u5b9a\u6b8b\u696d\u4ee3(\u6708\u7d66)',
  CHILD_ALLOWANCE: '\u5b50\u5973\u624b\u5f53(\u6708\u7d66)',
  FIXED_OVERTIME_ALLOWANCE: '\u56fa\u5b9a\u6b8b\u696d\u624b\u5f53\uff08\u307f\u306a\u3057\uff09(\u6708\u7d66)',
  RESIDENT_TAX_MUNICIPALITY: '\u7d0d\u4ed8\u5148\u5e02\u533a\u753a\u6751\u540d(\u4f4f\u6c11\u7a0e)',
  RESIDENT_TAX_YEAR: '\u5e74\u5ea6(\u4f4f\u6c11\u7a0e)',
};

const RESIDENT_TAX_MONTHS = ['6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];

function residentTaxColumn(month) {
  return `${month}\u6708\u7d0d\u4ed8\u984d(\u4f4f\u6c11\u7a0e)`;
}

function commutingAllowanceColumn(n) {
  return `\u652f\u7d66\u984d(\u901a\u52e4\u624b\u5f53${n})`;
}

function trimCell(value) {
  return (value ?? '').replace(/^\s+|\s+$/g, '');
}

function buildHeaderIndex(headers) {
  const index = {};
  headers.forEach((header, i) => {
    index[trimCell(header)] = i;
  });
  return index;
}

function getCell(cells, index, columnName) {
  const i = index[columnName];
  if (i === undefined) return '';
  return trimCell(cells[i] ?? '');
}

function parseCommutingAllowance(cells, index) {
  let total = 0;
  let hasValue = false;
  for (let n = 1; n <= 10; n += 1) {
    const amount = parseNumber(getCell(cells, index, commutingAllowanceColumn(n)));
    if (amount !== null && amount !== 0) {
      total += amount;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

function parseResidentTaxMonthly(cells, index) {
  const monthly = {};
  for (const month of RESIDENT_TAX_MONTHS) {
    const amount = parseNumber(getCell(cells, index, residentTaxColumn(month)));
    if (amount !== null && amount !== 0) {
      monthly[month] = amount;
    }
  }
  return Object.keys(monthly).length > 0 ? monthly : null;
}

export function isEmployeeCsv(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const headers = parseCsvLine(firstLine).map(trimCell);
  return headers.includes(COL.MF_ID) && headers.includes(COL.EMPLOYEE_NUMBER);
}

export function parseEmployeeCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { employees: [], errors: ['\u30c7\u30fc\u30bf\u884c\u304c\u3042\u308a\u307e\u305b\u3093\u3002'] };
  }

  if (!isEmployeeCsv(text)) {
    return {
      employees: [],
      errors: ['\u30de\u30cd\u30fc\u30d5\u30a9\u30ef\u30fc\u30c9\u7d66\u4e0e\u306e\u5f93\u696d\u54e1\u60c5\u5831CSV\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002'],
    };
  }

  const headers = parseCsvLine(lines[0]).map(trimCell);
  const index = buildHeaderIndex(headers);
  const employees = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const mfId = getCell(cells, index, COL.MF_ID);
    const employeeNumber = getCell(cells, index, COL.EMPLOYEE_NUMBER);
    const lastName = getCell(cells, index, COL.LAST_NAME);
    const firstName = getCell(cells, index, COL.FIRST_NAME);

    if (!lastName && !firstName && !employeeNumber) continue;

    if (!lastName && !firstName) {
      errors.push(`${i + 1}\u884c\u76ee: \u6c0f\u540d\u304c\u3042\u308a\u307e\u305b\u3093\u3002`);
      continue;
    }

    employees.push({
      id: mfId || `import-${employeeNumber || i}`,
      employeeNumber,
      lastName,
      firstName,
      lastNameKana: getCell(cells, index, COL.LAST_NAME_KANA),
      firstNameKana: getCell(cells, index, COL.FIRST_NAME_KANA),
      jobType: getCell(cells, index, COL.JOB_TYPE),
      position: getCell(cells, index, COL.POSITION),
      contractType: getCell(cells, index, COL.CONTRACT_TYPE),
      joinDate: getCell(cells, index, COL.JOIN_DATE),
      leaveDate: getCell(cells, index, COL.LEAVE_DATE),
      directorSalary: parseNumber(getCell(cells, index, COL.DIRECTOR_SALARY)),
      baseSalary: parseNumber(getCell(cells, index, COL.BASE_SALARY)),
      positionAllowance: parseNumber(getCell(cells, index, COL.POSITION_ALLOWANCE)),
      fixedOvertimePay: parseNumber(getCell(cells, index, COL.FIXED_OVERTIME_PAY)),
      childAllowance: parseNumber(getCell(cells, index, COL.CHILD_ALLOWANCE)),
      fixedOvertimeAllowance: parseNumber(getCell(cells, index, COL.FIXED_OVERTIME_ALLOWANCE)),
      commutingAllowance: parseCommutingAllowance(cells, index),
      residentTaxMunicipality: getCell(cells, index, COL.RESIDENT_TAX_MUNICIPALITY),
      residentTaxYear: getCell(cells, index, COL.RESIDENT_TAX_YEAR),
      residentTaxMonthly: parseResidentTaxMonthly(cells, index),
    });
  }

  return { employees, errors };
}
