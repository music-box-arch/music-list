// main-new.js
window.MLAPP = {
    VER: '20251229',
    addVer(path) {
        if (!path) return path;
        const sep = path.includes('?') ? '&' : '?';
        return `${path}${sep}v=${window.MLAPP.VER}`;
    }
};
// main-new.js 内で使う短縮名
const { addVer } = window.MLAPP;

export const state = { isDrawing: false, isSyncing: false };
export const chkStates = { cs: [], csBk: [] };
// const { cs, csBk } = chkStates;

export const mTbl = {
    map: new Map(),
    tbody: document.querySelector('#musicTbl tbody')
};

let mTblReady = false;

export function logMapKeys(label, map, max = 10) {
    const keys = Array.from(map.keys());
    const head = keys.slice(0, max).join(',');
    const tail = keys.length > max ? ` ... (+${keys.length - max})` : '';
    console.log(`${label} size=${map.size} keys=[${head}${tail}]`);
}

export async function readJson(path) {
    const url = addVer(path);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`load failed: ${url}`);
    return await res.json();
}

const featEvents = [
    { selector: '.showDiscsBtn', module: './result-new.js', export: 'showDiscs' },
    { selector: '.clearAllBtn', module: './func-new.js', export: 'clearAll' }
];
const tabEvents = [
    { selector: '.tab-btn[data-tab="songlist"]', module: '', export: '' },
    { selector: '.tab-btn[data-tab="setlist"]', module: '', export: '', wait: false }
];
const searchEvents = [{ id: 'sngSrch', module: './func-new.js', export: 'pfmSrch' }];
const filterEvents = [
    { id: 'chkSb', module: './func-new.js', export: 'subNoFn' },
    { id: 'shStChk', module: './func-new.js', export: 'toggleSm', mode: 'style' },
    { id: 'shMxChk', module: './func-new.js', export: 'toggleSm', mode: 'mix' },
    { id: 'shChkOnly', module: './func-new.js', export: 'dispChkOnly' }
];
const audModeEvents = [{ id: 'audioInfoMode', module: './all-audio-btn-new.js', export: 'handleAudioMode' }];
const eventDefs = [...featEvents, ...tabEvents, ...searchEvents, ...filterEvents, ...audModeEvents];

document.addEventListener('DOMContentLoaded', async () => {
    logMapKeys('[mTbl.map] (DOMContentLoaded START)', mTbl.map);
    //イベントリスナー設置、ハンドラ登録
    initControls(eventDefs);

    const tpl = document.getElementById('tmp-main-row');
    const mlJson = await readJson('data/music-list-new.json');

    // 初期HTML分を mTbl.tbody に登録（1回だけ）
    mTbl.tbody.querySelectorAll('tr').forEach(tr => {
        const chk = tr.querySelector('.chk[data-id]');
        if (!chk) return;

        const id = Number(chk.dataset.id);
        mTbl.map.set(id, tr);
    });
    logMapKeys('[mTbl.map] (DOMContentLoaded START)', mTbl.map);
    // まず40行、必要なら続けて
    while (!mTblReady) {
        await addChunk(mTbl.tbody, tpl, mlJson, 40);
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    logMapKeys('[mTbl.map] (DOMContentLoaded START)', mTbl.map);
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
            await waitReady(() => mTblReady);    //イベント発火後に待つかどうか
        }
        if (!def.module || !def.export) return;
        const mod = await import(addVer(def.module));
        const fn = mod[def.export];
        if (typeof fn === 'function') {
            // mode があれば第2引数として渡す
            if ('mode' in def) {
                await fn(e, def.mode);
            } else {
                await fn(e);
            }
        }
    };
}

// 実行する時は await waitReady(() => mTblReady); の形
async function waitReady(flag, interval = 30) {
    while (!flag()) {
        await new Promise(r => setTimeout(r, interval));
    }
}

// 複数行（最大40行）をtplに入れて表に追加する関数
async function addChunk(tbody, tpl, mlJson, limit = 40) {
    const targets = mlJson
        .filter(item => !mTbl.map.has(item.mID))
        .slice(0, limit);
    if (targets.length === 0) {
        mTblReady = true;
        return;
    }

    const fragment = document.createDocumentFragment();
    targets.forEach(item => {
        const tr = mkRow(item, tpl);
        fragment.appendChild(tr);
        mTbl.map.set(item.mID, tr);
    });
    tbody.appendChild(fragment);
}
// 以下、addChunkで使う関数たち
export function mkRow(item, tpl) {
    const tr = tpl.content.firstElementChild.cloneNode(true);

    const chk = tr.querySelector('.chk');
    if (chk) chk.dataset.id = item.mID;

    [['ytNd', item.ytUrl, item.yt || '♪'],
    ['lvNd', item.lv, 'LV'],
    ['spfNd', item.spf, 'Spf'],
    ['aplNd', item.apl, 'Apl'],
    ['itnNd', item.itn, 'iTn'],
    ['lrcNd', item.lrc, '歌詞']
    ].forEach(([k, url, label]) => {
        item[k] = mkLink(url, label);
    });

    ['title', 'ytNd', 'lvNd', 'spfNd', 'aplNd', 'itnNd', 'lrcNd',
        'exsm', 'firstCd', 'order', 'cdDate'
    ].forEach(k => fill(tr, item, k));

    deleteProps(item, ['ytNd', 'lvNd', 'spfNd', 'aplNd', 'itnNd', 'lrcNd']);
    return tr;
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