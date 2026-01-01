// バージョン定義
window.updVer = '20251229';

let mTblReady = false;
let isDrawing = false;
const hasMIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    initControls();

    const tbody = document.querySelector('#music-table tbody');
    const tpl = document.getElementById('tmp-main-row');
    const mlJson = await readJson('data/music-list-new.json');

    // 初期HTML分を hasMIds に登録（1回だけ）
    tbody.querySelectorAll('.chk[data-id]').forEach(chk => {
        hasMIds.add(Number(chk.dataset.id));
    });

    // まず40行、必要なら続けて
    while (!mTblReady) {
        await addChunk(tbody, tpl, mlJson, 40);
        await new Promise(resolve => setTimeout(resolve, 0)); // ← これが必要
    }
});

// DOMContentLoadedで行われる一連の関数

async function waitMTblReady() {
    while (!mTblReady) {
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}

function initControls() {
    // 既存の「押されたらキュー or 即実行」ロジックをここに
}

async function readJson(path) {
    const url = `${path}?v=${window.updVer}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`load failed: ${url}`);
    return await res.json();
}


async function addChunk(tbody, tpl, mlJson, limit = 40) {
    const fragment = document.createDocumentFragment();
    const added = [];

    for (const item of mlJson) {
        if (hasMIds.has(item.mID)) continue;
        addOneRow(fragment, item, tpl);
        added.push(item.mID);
        if (added.length >= limit) break;
    }

    if (added.length === 0) {
        mTblReady = true;
        return;
    }

    tbody.appendChild(fragment);
    added.forEach(id => hasMIds.add(id));
}


// 以下、addChunkで使う関数たち

function addOneRow(fragment, item, tpl) {
    const tr = tpl.content.firstElementChild.cloneNode(true);

    const chk = tr.querySelector('.chk');
    if (chk) chk.dataset.id = item.mID;

    [
        ['ytNd', item.ytUrl, item.yt || '♪'],
        ['lvNd', item.lv, 'LV'],
        ['spfNd', item.spf, 'Spf'],
        ['aplNd', item.apl, 'Apl'],
        ['itnNd', item.itn, 'iTn'],
        ['lrcNd', item.lrc, '歌詞']
    ].forEach(([k, url, label]) => {
        item[k] = mkLink(url, label);
    });

    [
        'title', 'ytNd', 'lvNd', 'spfNd', 'aplNd', 'itnNd', 'lrcNd',
        'exsm', 'firstCd', 'order', 'cdDate'
    ].forEach(k => fill(tr, item, k));

    fragment.appendChild(tr);

    deleteProps(item, ['ytNd', 'lvNd', 'spfNd', 'aplNd', 'itnNd', 'lrcNd']);
}


const mkLink = (url, text) => {
    if (!url) return null;

    const a = document.createElement('a');
    a.href = url;
    a.textContent = text;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    return a;
};

const fill = (tr, item, tplKey, dataKey = tplKey) => {
    const td = tr.querySelector(`.${tplKey}`);
    if (!td) return;

    td.textContent = '';

    const value = item[dataKey];

    if (value instanceof Node) {
        td.appendChild(value);
    } else {
        td.textContent = value ?? '';
    }
};

function deleteProps(item, keys) {
    keys.forEach(k => delete item[k]);
}