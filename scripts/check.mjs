// 의존성 없는 사전 검사: 배포 전에 index.html이 깨지지 않았는지 확인한다.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fail = [];

// 1) 필수 엘리먼트 id
for (const id of ['stage', 'weekstrip', 'receipt', 'monthbar', 'stubs', 'seg', 'toast', 'todayBtn']) {
  if (!html.includes(`id="${id}"`)) fail.push(`필수 엘리먼트 #${id} 누락`);
}

// 2) 인라인 스크립트 문법 검사
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length === 0) fail.push('인라인 스크립트를 찾지 못함');
scripts.forEach((src, i) => {
  try { new Function(src); }
  catch (e) { fail.push(`스크립트 #${i + 1} 문법 오류: ${e.message}`); }
});

// 3) 태그 균형 — script/style 안의 문자열은 제외하고 실제 마크업만 센다
const markup = html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '');
for (const tag of ['div', 'section', 'article', 'ul', 'header', 'main']) {
  const open = (markup.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const close = (markup.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  if (open !== close) fail.push(`<${tag}> 태그 불균형: 여는 태그 ${open}개 / 닫는 태그 ${close}개`);
}
if ((html.match(/<script/g) || []).length !== (html.match(/<\/script>/g) || []).length) {
  fail.push('<script> 태그 불균형');
}

// 4) 배경은 항상 흰색이어야 한다 (다크 모드 재정의 금지)
if (/prefers-color-scheme\s*:\s*dark/.test(html)) fail.push('다크 모드 재정의가 발견됨 — 배경은 항상 흰색이어야 함');
if (!/--bg:\s*#FFFFFF/i.test(html)) fail.push('--bg 토큰이 흰색이 아님');

if (fail.length) {
  console.error('검사 실패:\n' + fail.map(f => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('검사 통과 — 인라인 스크립트 ' + scripts.length + '개, 배경 흰색 확인.');
