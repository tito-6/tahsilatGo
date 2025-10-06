const XLSX = require('xlsx');
const path = 'C:/Users/Net Mimar/Downloads/alooo.xls';
const workbook = XLSX.readFile(path);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

function parseDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)) {
    const [_, d, m, y] = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  if (typeof dateValue === 'number' && dateValue > 1 && dateValue < 100000) {
    let days = Math.floor(dateValue) - 1;
    if (dateValue > 59) days--;
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  return String(dateValue);
}

console.log('Customer Name | Date');
rows.forEach(row => {
  const name = row['Müşteri Adı Soyadı'];
  const tarih = row['Tarih'];
  const parsed = parseDate(tarih);
  console.log(`${name} | ${parsed}`);
});
