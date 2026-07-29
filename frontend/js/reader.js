async function processDocument(file) {
const name = file.name;
const type = file.type || getFileExtension(file.name);

let text = '';

try {

if (name.toLowerCase().endsWith('.txt')) {
  text = await parseTXT(file);

} else if (name.toLowerCase().endsWith('.docx')) {
  text = await parseDOCX(file);

} else if (name.toLowerCase().endsWith('.pdf')) {
  text = await parsePDF(file);

} else {
  throw new Error('Định dạng chưa được hỗ trợ');
}

const documentData = {
  name,
  type,
  size: file.size,
  content: text,
  createdAt: new Date().toISOString()
};

await saveDocument(documentData);

return documentData;

} catch (err) {
console.error(err);
throw err;
}
}

function getFileExtension(filename) {
const idx = filename.lastIndexOf('.');
if (idx === -1) return '';
return filename.substring(idx + 1);
}
