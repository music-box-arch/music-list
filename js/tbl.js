// リソース検証
export function canFetch(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsedUrl = new URL(url, window.location.href);
    return parsedUrl.origin === window.location.origin;
  } catch {
    // 相対パスの場合
    return /^(\.\/|\.\.\/|\/|[^:\/]+\.(json|js|css)$)/.test(url);
  }
}

// URL検証
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;

  // 危険なスキーム禁止
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowercaseUrl = url.toLowerCase().trim();

  if (dangerousSchemes.some(scheme => lowercaseUrl.startsWith(scheme))) {
    return false;
  }

  //URL形式chk
  try {
    new URL(url);
    return true;
  } catch {
    // 相対URL chk
    return /^(\/|\.\/|\.\.\/)/.test(url) || /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(url);
  }
}

// link作成関数
function genLink(url, text, target = '_blank', rel = 'noopener noreferrer') {
  if (!url || !isValidUrl(url)) return '';

  const a = document.createElement('a');
  a.href = url;
  a.textContent = text;
  if (target) a.target = target;
  if (rel) a.rel = rel;
  return a.outerHTML;
}

// 音楽サービスリンク作成関数
function genMscLink(item, prop) {
  switch (prop) {
    case 'yt':
      if (item.ytUrl) {
        const text = item.yt === 'MV' ? 'MV' : '♪';
        return genLink(item.ytUrl, text);
      }
      return '';
    case 'spf':
      return item.spf ? genLink(item.spf, 'Spf') : '';
    case 'apl':
      return item.apl ? genLink(item.apl, 'Apl') : '';
    case 'lv':
      return item.lv ? genLink(item.lv, 'LV') : '';
    case 'itn':
      return item.itn ? genLink(item.itn, 'iTn') : '';
    case 'lrc':
      return item.lrc ? genLink(item.lrc, '歌詞') : '';
    default:
      return item[prop] || '';
  }
}

// td要素作成ヘルパー関数
// export function createTd(content, style = '') {
//   const td = document.createElement('td');
//   td.textContent = content;
//   if (style) td.style.cssText = style;
//   return td;
// }

// 汎用テーブル作成
export function createTable(config) {
  const {
    headers,           // ヘッダー配列
    data,             // データ配列
    context,          // 'ml' or 'sl'
    rowProcessor,     // 行処理関数（チェックボックス以外の部分を返す）
    className = 'tbl', // テーブルクラス
    columns = [],      // プロパティ名配列（新方式）
    textOnlyColumns = [], // テキストのみの列のインデックス配列（新方式）
    cstmRow
  } = config;

  const table = document.createElement('table');
  table.className = className;

  // ヘッダー作成
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    // fontSize削除: CSSで.tbl thで指定済み
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  // ボディ作成
  const tbody = document.createElement('tbody');
  data.forEach((item, index) => {
    const tr = document.createElement('tr');

    // 共通チェックボックス
    const checkboxTd = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'chk';
    checkbox.setAttribute('data-context', context);
    checkbox.setAttribute('data-id', item.mID);
    checkboxTd.appendChild(checkbox);
    tr.appendChild(checkboxTd);

    // 新方式: columns配列が指定されている場合
    if (columns.length > 0) {
      columns.forEach((prop, columnIndex) => {
        const td = document.createElement('td');

        if ([6, 8, 9, 10].includes(columnIndex)) {
          td.classList.add('small');
        }

        // textOnlyColumnsに含まれていない場合は音楽リンク処理
        if (textOnlyColumns.includes(columnIndex)) {
          td.textContent = item[prop] || '';
        } else {
          // 音楽サービスリンク列の場合は安全なリンク生成
          const linkHtml = genMscLink(item, prop);
          if (linkHtml) {
            // innerHTML廃止：DOMParserを使用して安全に挿入
            const parser = new DOMParser();
            const doc = parser.parseFromString(linkHtml, 'text/html');
            const link = doc.querySelector('a');
            if (link) {
              td.appendChild(link);
            } else {
              td.textContent = '';
            }
          } else {
            td.textContent = '';
          }
        }

        tr.appendChild(td);
      });

      if (cstmRow) cstmRow(tr, item, index);
    }
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  return { table, tbody };
}

// 軽量な情報表示テーブルを作る audMd
export function mkMiniTbl(headers, rows) {
  const table = document.createElement('table');
  table.className = 'tbl mini';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}