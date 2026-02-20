#!/usr/bin/env node
/**
 * Applies REFLEXDN_HTML_FIXES.md corrections to ReflexDN HTML files.
 * Usage: node scripts/apply-reflexdn-fixes.js [path/to/file.html]
 *        If no path given, processes reflexdn-patient-view.html and reflexdn-patient-list.html in project root.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function applyFixes(html) {
  let out = html;

  // 1. Typos
  out = out.replace(/\bCheif\b/g, 'Chief');
  out = out.replace(/\bchife_Complaint\b/g, 'chief_Complaint');
  out = out.replace(/\bchife_complaint\b/g, 'chief_complaint');
  out = out.replace(/\bHelpatics\b/g, 'Hepatitis');
  out = out.replace(/\bBleeding discorder\b/g, 'Bleeding disorder');
  out = out.replace(/>Ohter</g, '>Other<');

  // 2. Invalid HTML: remove </input> after label (radio blocks)
  out = out.replace(/<label for="radio1">[^<]*<\/label>\s*<\/input>/gi, (m) => m.replace(/\s*<\/input>/i, ''));
  out = out.replace(/<label for="radio2">[^<]*<\/label>\s*<\/input>/gi, (m) => m.replace(/\s*<\/input>/i, ''));

  // 3. Modal close: exampleModal_1 -> data-bs-dismiss
  out = out.replace(/data-bs-toggle="modal"\s+data-bs-target="#exampleModal_1"/g, 'data-bs-dismiss="modal"');

  // 4. Lower Right tooth 45: checkbox has value="46" but label is 45
  out = out.replace(
    /<input type="checkbox" id="t" name="t" value="46" style="display:none" class="select t">\s*\n\s*<p class="mb-0">45<\/p>/,
    '<input type="checkbox" id="t" name="t" value="45" style="display:none" class="select t">\n                                                    <p class="mb-0">45</p>'
  );

  // 5. Duplicate id in Treatment_edit: second btn-tp-1 -> btn-tp-edit-1 (only inside #Treatment_edit)
  const editModalStart = out.indexOf('id="Treatment_edit"');
  if (editModalStart !== -1) {
    const before = out.slice(0, editModalStart);
    const modalBlock = out.slice(editModalStart);
    const inModal = modalBlock.replace(/\bid="btn-tp-1"/, 'id="btn-tp-edit-1"').replace(/\bfor="btn-tp-1"/, 'for="btn-tp-edit-1"');
    out = before + inModal;
  }

  return out;
}

function processFile(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn('Skip (not found):', fullPath);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const fixed = applyFixes(content);
  if (fixed === content) {
    console.log('No changes:', fullPath);
    return;
  }
  const outPath = fullPath.replace(/\.html$/, '.fixed.html');
  fs.writeFileSync(outPath, fixed, 'utf8');
  console.log('Written:', outPath);
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      path.join(projectRoot, 'reflexdn-patient-view.html'),
      path.join(projectRoot, 'reflexdn-patient-list.html'),
    ];

files.forEach(processFile);
