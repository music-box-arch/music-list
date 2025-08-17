// 汎用テーブル作成モジュール

// td要素作成ヘルパー関数
export function createTd(content, style = '', useHTML = false) {
  const td = document.createElement('td');
  if (useHTML) {
    td.innerHTML = content;
  } else {
    td.textContent = content;
  }
  if (style) td.style.cssText = style;
  return td;
}

// 汎用テーブル作成関数
export function createTable(config) {
  const {
    headers,           // ヘッダー配列
    data,             // データ配列
    context,          // 'ml' or 'sl'
    rowProcessor,     // 行処理関数（チェックボックス以外の部分を返す）
    className = 'tbl', // テーブルクラス
    htmlColumns = [],  // HTMLとして扱う列のインデックス配列（旧方式）
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
    th.style.fontSize = '12px'; // 全部12px統一
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
    checkboxTd.innerHTML = `<input type="checkbox" class="chk" data-context="${context}" data-id="${item.mID}">`;
    tr.appendChild(checkboxTd);
    
    // 新方式: columns配列が指定されている場合
    if (columns.length > 0) {
      columns.forEach((prop, columnIndex) => {
        const value = item[prop] || '';
        const td = document.createElement('td');
        
        // textOnlyColumnsに含まれていない場合はHTML扱い
        if (textOnlyColumns.includes(columnIndex)) {
          td.textContent = value;
        } else {
          td.innerHTML = value;
        }
        
        tr.appendChild(td);
      });
      
      if (cstmRow) cstmRow(tr, item, index);
    } else {
      // 旧方式: rowProcessor使用
      const customResult = rowProcessor(item, index, context);
      
      if (customResult.tds) {
        customResult.tds.forEach((td, tdIndex) => {
          const columnIndex = tdIndex + 1;
          if (htmlColumns.includes(columnIndex)) {
            const content = td.textContent;
            td.innerHTML = content;
          }
          tr.appendChild(td);
        });
      }
      
      // 属性設定
      if (customResult.attributes) {
        Object.entries(customResult.attributes).forEach(([key, value]) => {
          tr.setAttribute(key, value);
        });
      }
    }
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);

  return { table, tbody };
}
