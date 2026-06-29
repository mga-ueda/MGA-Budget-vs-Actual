import { parseCsvLine, parseNumber } from './parser.js';

const COL = {
  MF_ID: '従業員識別子',
  EMPLOYEE_NUMBER: '従業員番号',
  LAST_NAME: '姓',
  FIRST_NAME: '名',
  LAST_NAME_KANA: '姓（フリガナ）',
  FIRST_NAME_KANA: '名（フリガナ）',
  JOB_TYPE: '職種',
  POSITION: '役職',
  CONTRACT_TYPE: '契約種別',
  JOIN_DATE: '入社年月日',
  LEAVE_DATE: '退職年月日',
  DIRECTOR_SALARY: '役員報酬(月給)',
  BASE_SALARY: '基本給(月給)',
  POSITION_ALLOWANCE: '役職手当(月給)',
  FIXED_OVERTIME_PAY: '固定残業代(月給)',
  CHILD_ALLOWANCE: '子女手当(月給)',
  FIXED_OVERTIME_ALLOWANCE: '固定残業手当（みなし）(月給)',
  RESIDENT_TAX_MUNICIPALITY: '納付先市区町村名(住民税)',
  RESIDENT_TAX_YEAR: '年度(住民税)',
};

const RESIDENT_TAX_MONTHS = ['6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5'];

function residentTaxColumn(month) {
  return `${month}月納付額(住民税)`;
}

function commutingAllowanceColumn(n) {
  return `支給額(通勤手当${n})`;
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
    return { employees: [], errors: ['データ行がありません。'] };
  }

  if (!isEmployeeCsv(text)) {
    return {
      employees: [],
      errors: ['マネーフォワード給与の従業員情報CSVではありません。'],
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
      errors.push(`${i + 1}行目: 氏名がありません。`);
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
