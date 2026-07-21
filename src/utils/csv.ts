/** RFC-style CSV escaping; quotes are doubled and fields with separators are quoted. */
export function escapeCsv(value: unknown): string { if(value===null||value===undefined)return ''; const text=String(value); return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text; }
export function createCsv(headers:string[],rows:unknown[][]):string { return `\uFEFF${[headers,...rows].map((row)=>row.map(escapeCsv).join(',')).join('\r\n')}`; }
