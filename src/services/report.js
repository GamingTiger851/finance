const { stringify } = require('csv-stringify/sync');
const PDFDocument = require('pdfkit');
function csv(rows) { return stringify(rows, { header: true }); }
function pdf(rows) {
  const doc = new PDFDocument(); const chunks = [];
  doc.on('data', chunk => chunks.push(chunk)); rows.forEach(row => doc.text(Object.entries(row).map(([k,v]) => `${k}: ${v}`).join(' | '))); doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
module.exports = { csv, pdf };
