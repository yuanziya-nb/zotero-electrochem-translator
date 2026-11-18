'use strict';

let windows = new WeakSet();
let translationPanel = null;

const builtInTerms = {
  'working electrode': '工作电极',
  'counter electrode': '对电极',
  'auxiliary electrode': '辅助电极',
  'reference electrode': '参比电极',
  'glass carbon electrode': '玻碳电极',
  'glassy carbon electrode': '玻碳电极',
  'cyclic voltammetry': '循环伏安法',
  'linear sweep voltammetry': '线性扫描伏安法',
  'open circuit potential': '开路电位',
  'open-circuit potential': '开路电位',
  'open circuit voltage': '开路电压',
  'electrochemical impedance spectroscopy': '电化学阻抗谱',
  'charge transfer resistance': '电荷转移电阻',
  'double layer capacitance': '双电层电容',
  'equivalent circuit': '等效电路',
  'exchange current density': '交换电流密度',
  'overpotential': '过电位',
  'decomposition potential': '分解电位',
  'formal potential': '形式电位',
  'half-wave potential': '半波电位',
  'redox couple': '氧化还原电对',
  'electron transfer': '电子转移',
  'diffusion coefficient': '扩散系数',
  'scan rate': '扫描速率',
  'supporting electrolyte': '支持电解质',
  'current density': '电流密度',
  'lithium-ion battery': '锂离子电池',
  'solid electrolyte interphase': '固体电解质界面膜（SEI）'
};

function pref(name, defaultValue) {
  const key = 'extensions.electrochem-translator.' + name;
  const value = Zotero.Prefs.get(key);
  return value === undefined || value === null ? defaultValue : value;
}

function setPref(name, value) {
  Zotero.Prefs.set('extensions.electrochem-translator.' + name, value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyElectrochemTerms(text) {
  let custom = {};
  try {
    const raw = pref('customTerms', '{}');
    custom = JSON.parse(raw);
  } catch (e) {
    Zotero.debug('Electrochem Translator: invalid customTerms JSON');
  }
  const terms = Object.assign({}, builtInTerms, custom);
  const keys = Object.keys(terms).sort((a, b) => b.length - a.length);
  for (const source of keys) {
    const translated = terms[source];
    if (!translated) continue;
    text = text.replace(new RegExp('\\b' + escapeRegExp(source) + '\\b', 'gi'), translated);
  }
  return text;
}

async function translateWithLingva(text) {
  const instance = String(pref('lingvaInstance', 'https://lingva.ml')).replace(/\/$/, '');
  const url = instance + '/api/v1/en/zh/' + encodeURIComponent(text);
  const response = await Zotero.HTTP.request('GET', url, {
    headers: { 'Accept': 'application/json' },
    responseType: 'json',
    timeout: 20000
  });
  if (response.status !== 200) throw new Error('Lingva HTTP ' + response.status);
  const data = typeof response.response === 'string' ? JSON.parse(response.response) : response.response;
  if (!data || !data.translation) throw new Error('Lingva returned no translation');
  return data.translation;
}

async function translateWithLibre(text) {
  const endpoint = String(pref('libreEndpoint', 'https://libretranslate.com/translate')).replace(/\/$/, '');
  const response = await Zotero.HTTP.request('POST', endpoint, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'zh', format: 'text' }),
    responseType: 'json',
    timeout: 20000
  });
  if (response.status !== 200) throw new Error('LibreTranslate HTTP ' + response.status);
  const data = typeof response.response === 'string' ? JSON.parse(response.response) : response.response;
  if (!data || !data.translatedText) throw new Error('LibreTranslate returned no translation');
  return data.translatedText;
}

async function translateText(text) {
  text = String(text || '').trim();
  if (!text) throw new Error('No selected text');
  let translated;
  try {
    translated = await translateWithLingva(text);
  } catch (lingvaError) {
    Zotero.debug('Electrochem Translator: Lingva failed: ' + lingvaError);
    translated = await translateWithLibre(text);
  }
  return applyElectrochemTerms(translated);
}

function getSelectedText(win) {
  try {
    const selection = win.getSelection && win.getSelection();
    if (selection && selection.toString().trim()) return selection.toString().trim();
  } catch (e) {}
  for (const frame of win.frames || []) {
    try {
      const selection = frame.getSelection && frame.getSelection();
      if (selection && selection.toString().trim()) return selection.toString().trim();
    } catch (e) {}
  }
  return '';
}

function showPanel(win, source, translated) {
  if (translationPanel && translationPanel.closed) translationPanel = null;
  if (translationPanel) {
    translationPanel.contentWindow.postMessage({ source, translated }, '*');
    translationPanel.focus();
    return;
  }

  const url = rootURI + 'content/translator.html';
  translationPanel = win.open(url, 'electrochem-translator-panel', 'chrome=no,width=620,height=420,resizable=yes');
  if (!translationPanel) {
    win.alert('Electrochem Translator: unable to open translation window.');
    return;
  }
  translationPanel.addEventListener('load', () => {
    translationPanel.contentWindow.postMessage({ source, translated }, '*');
  }, { once: true });
}

async function translateSelection(win) {
  const source = getSelectedText(win);
  if (!source) {
    win.alert('Please select English text in a Zotero PDF or note first.');
    return;
  }
  const notice = 'Translating…';
  showPanel(win, source, notice);
  try {
    const translated = await translateText(source);
    showPanel(win, source, translated);
  } catch (error) {
    Zotero.debug('Electrochem Translator: ' + error);
    showPanel(win, source, 'Translation failed: ' + error.message);
  }
}

function openSettings(win) {
  win.open(rootURI + 'content/settings.html', 'electrochem-translator-settings', 'chrome=no,width=520,height=520,resizable=yes');
}

function addToWindow(win) {
  if (windows.has(win)) return;
  windows.add(win);

  const doc = win.document;
  const menu = doc.getElementById('menu_ToolsPopup');
  if (menu) {
    const item = doc.createXULElement ? doc.createXULElement('menuitem') : doc.createElement('menuitem');
    item.id = 'electrochem-translator-menu';
    item.setAttribute('label', 'Translate selected text (electrochemistry)');
    item.addEventListener('command', () => translateSelection(win));
    menu.appendChild(item);

    const settings = doc.createXULElement ? doc.createXULElement('menuitem') : doc.createElement('menuitem');
    settings.setAttribute('label', 'Electrochem Translator settings…');
    settings.addEventListener('command', () => openSettings(win));
    menu.appendChild(settings);
  }

  const keyHandler = (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLower?.() === 't') {
      event.preventDefault();
      translateSelection(win);
    }
  };
  win.addEventListener('keydown', keyHandler, true);

  const mouseHandler = (event) => {
    if (event.shiftKey && event.ctrlKey) translateSelection(win);
  };
  win.addEventListener('mouseup', mouseHandler);
}

function removeFromWindow(win) {
  const doc = win.document;
  doc.getElementById('electrochem-translator-menu')?.remove();
  windows.delete(win);
}

let rootURI = '';

async function startup({ id, version, rootURI: uri }) {
  rootURI = uri;
  if (pref('lingvaInstance', '') === '') setPref('lingvaInstance', 'https://lingva.ml');
  if (pref('libreEndpoint', '') === '') setPref('libreEndpoint', 'https://libretranslate.com/translate');
  if (pref('customTerms', '') === '') setPref('customTerms', '{}');

  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) addToWindow(enumerator.getNext());
}

function shutdown() {
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) removeFromWindow(enumerator.getNext());
  if (translationPanel && !translationPanel.closed) translationPanel.close();
  translationPanel = null;
}

function onMainWindowLoad(win) { addToWindow(win); }
function onMainWindowUnload(win) { removeFromWindow(win); }
