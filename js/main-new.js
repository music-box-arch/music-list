// バージョン定義
window.updVer = '20251229';

function addVer(path) {
    if (!path) return path;
    // すでに ? があれば &v=、なければ ?v=
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}v=${window.updVer}`;
}

let mTblReady = false;
let isDrawing = false;
const hasMIds = new Set();

const featEvents = [
    { selector: '.showDiscsButton', module: './result.js', export: 'buildMatrix' },
    { selector: '.clearAllChecksBtn', module: '', export: '' }
];
const tabEvents = [
    { selector: '.tab-btn[data-tab="songlist"]', module: '', export: '' },
    { selector: '.tab-btn[data-tab="setlist"]', module: '', export: '', wait: false }
];
const searchEvents = [{ id: 'sngSrch', module: '', export: '' }];
const filterEvents = [
    { id: 'chkSb', module: './main-lazy.js', export: 'SubNoFn' },
    { id: 'shStChk', module: './main-lazy.js', export: 'toggleSm' },
    { id: 'shMxChk', module: './main-lazy.js', export: 'toggleSm' },
    { id: 'shChkOnly', module: './main-lazy.js', export: 'hdlMlChkOnly' }
];
const audModeEvents = [{ id: 'audioInfoMode', module: '', export: '' }];
const eventDefs = [...featEvents, ...tabEvents, ...searchEvents, ...filterEvents, ...audModeEvents];

document.addEventListener('DOMContentLoaded', async () => {
    //イベントリスナー設置、ハンドラ登録
    initControls(eventDefs);

    const tbody = document.querySelector('#musicTbl tbody');
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

function initControls(defs) {
    setType([featEvents, tabEvents], 'click');
    setType(searchEvents, 'input');
    setType([filterEvents, audModeEvents], 'change');

    bindEvents(defs);
}
// 以下、initControlsで使われる関数
function setType(targets, type) {
    const lists = Array.isArray(targets[0]) ? targets : [targets];
    lists.forEach(list => {
        list.forEach(item => {
            item.type = type;
        });
    });
}
function bindEvents(defs) {
    defs.forEach(def => {
        const elements = def.selector
            ? document.querySelectorAll(def.selector)
            : def.id
                ? [document.getElementById(def.id)]
                : [];

        elements.forEach(el => {
            if (!el) return;
            el.addEventListener(def.type, createHandler(def));
        });
    });
}
function createHandler(def) {
    return async (e) => {
        if (def.wait !== false) {
            await waitMTblReady();
        }
        if (!def.module || !def.export) return;
        const mod = await import(addVer(def.module));
        const fn = mod[def.export];
        if (typeof fn === 'function') {
            await fn(e);
        }
    };
}
async function waitMTblReady() {
    while (!mTblReady) {
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}

// jsonのpath(バージョン抜き)を送って中を読み取って配列やオブジェクトを返す関数
async function readJson(path) {
    const url = `${path}?v=${window.updVer}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`load failed: ${url}`);
    return await res.json();
}

// 複数行（最大40行）をtplに入れて表に追加する関数
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
    const td = tr.querySelector(`[data-fld="${tplKey}"]`);
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