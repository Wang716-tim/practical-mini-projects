/** Parse comma-separated UTF-8 data, including quoted commas, newlines and quotes. */
export function parseCsv(input) {
  const text = String(input).replace(/^\uFEFF/, '');
  const records = [];
  const errors = [];
  let cells = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  function finishRecord() {
    cells.push(field);
    records.push({ row: recordLine, cells });
    cells = [];
    field = '';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else if (char === '\r' || char === '\n') {
        field += '\n';
        if (char === '\r' && text[i + 1] === '\n') i++;
        line++;
      } else field += char;
    } else if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      finishRecord();
      if (char === '\r' && text[i + 1] === '\n') i++;
      line++;
      recordLine = line;
    } else {
      field += char;
    }
  }
  if (inQuotes) errors.push({ row: recordLine, message: '引号未闭合，记录可能不完整。' });
  if (field !== '' || cells.length > 0 || (text.length && !/[\r\n]$/.test(text))) finishRecord();
  if (records.length === 0) errors.push({ row: 1, message: 'CSV 为空。' });

  const [headerRecord, ...dataRecords] = records;
  return {
    headers: headerRecord?.cells || [],
    rows: dataRecords.map((record) => record.cells),
    rowNumbers: dataRecords.map((record) => record.row),
    errors,
  };
}

/** Inspect structure only; it never edits uploaded data or guesses domain rules. */
export function inspectCsv(text, { keyColumn = null } = {}) {
  const parsed = parseCsv(text);
  const { headers, rows, rowNumbers } = parsed;
  const issues = parsed.errors.map((error) => ({ type: 'parse-error', row: error.row, column: '', message: error.message }));
  const seenHeaders = new Set();
  headers.forEach((header, index) => {
    if (!header.trim()) issues.push({ type: 'empty-header', row: 1, column: `第 ${index + 1} 列`, message: '列名为空。' });
    else if (seenHeaders.has(header)) issues.push({ type: 'duplicate-header', row: 1, column: header, message: '列名重复。' });
    seenHeaders.add(header);
  });
  const keyIndex = keyColumn === null ? -1 : headers.indexOf(keyColumn);
  if (keyColumn !== null && keyIndex === -1) throw new Error(`找不到主键列：${keyColumn}`);
  const seenKeys = new Map();

  rows.forEach((cells, index) => {
    const row = rowNumbers[index];
    if (cells.length !== headers.length) {
      issues.push({ type: 'column-count', row, column: '', message: `预计 ${headers.length} 列，实际 ${cells.length} 列。` });
    }
    if (keyIndex >= 0) {
      const key = cells[keyIndex]?.trim();
      if (key) {
        if (seenKeys.has(key)) issues.push({ type: 'duplicate-key', row, column: keyColumn, message: `与第 ${seenKeys.get(key)} 行的值重复。` });
        else seenKeys.set(key, row);
      }
    }
    headers.forEach((header, columnIndex) => {
      if (!cells[columnIndex]?.trim()) {
        issues.push({ type: 'missing-value', row, column: header || `第 ${columnIndex + 1} 列`, message: '值为空。' });
      }
    });
  });

  return { headers, dataRows: rows.length, issues, rows };
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function issuesToCsv(issues) {
  const lines = [['type', 'row', 'column', 'message']];
  for (const issue of issues) lines.push([issue.type, issue.row, issue.column, issue.message]);
  return '\uFEFF' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
