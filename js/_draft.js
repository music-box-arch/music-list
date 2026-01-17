function addOneRow(fragment, item, tpl) {
    const tr = mkRow(item, tpl);
    fragment.appendChild(tr);
    rowMap.set(item.mID, tr);
}

/**
 * 任意の場所に1行挿入する汎用関数
 * 
 * @param {HTMLElement} tbody - 対象テーブルのtbody要素
 * @param {HTMLElement} newTr - 挿入する<tr>
 * @param {Map<number, HTMLElement>} map - mIDなどをキーとした行Map
 * @param {number|null} nextId - 指定した行の前に挿入。nullなら末尾に追加
 */
function addOneRow(tbody, newTr, map, nextId) {
    const nextRow = nextId !== null ? map.get(nextId) : null;

    if (nextRow && nextRow.parentElement === tbody) {
        nextRow.before(newTr);
    } else {
        tbody.appendChild(newTr);
    }
}

// mkRowで先に<tr>を作ってから
const newTr = mkRow(item, tpl);

// あとは汎用関数で挿入だけ任せる
addOneRow(tbody, newTr, rowMap, nextId);


