// func-new.js
const { addVer } = window.MLAPP;
// addVer を使って main-new.js を import
const { state, mTbl, chkStates, readJson, mkRow, logMapKeys } = await import(addVer('./main-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

export function startSync() {
    if (state.isSyncing) return;

    getCs();
    setEventListener();

    state.isSyncing = true;
    console.log('sync started');
}
// 以下、startSync のヘルパー
function updCs(id, isChecked) {
    if (isChecked) {
        if (!cs.includes(id)) cs.push(id);
        if (!csBk.includes(id)) csBk.push(id);
    } else {
        const i1 = cs.indexOf(id);
        if (i1 !== -1) cs.splice(i1, 1);

        const i2 = csBk.indexOf(id);
        if (i2 !== -1) csBk.splice(i2, 1);
    }
    // ソートは必要か？
    // cs.sort(numAsc);
    // csBk.sort(numAsc);
}
function getCs() {
    // 念のため初期化（参照は保つ）
    cs.length = 0;
    csBk.length = 0;

    const checks = document.querySelectorAll('#musicTbl tbody input.chk:checked');
    checks.forEach(chk => {
        const id = Number(chk.dataset.id);
        if (Number.isNaN(id)) return;

        cs.push(id);
        csBk.push(id);
    });
    console.log(`getCs : ${cs}`);
}
function setEventListener() {
    document.addEventListener('change', e => {
        const el = e.target;
        if (!el.classList.contains('chk')) return;

        const id = Number(el.dataset.id);
        if (Number.isNaN(id)) return;

        updCs(id, el.checked);
        console.log(`cs updated : ${cs} `);
    });
}

async function applyView() {
    console.log('applyViewのはじまり');
    if (!state.isSyncing) {
        startSync();
    }

    // 2. style / mix のチェック状態を読む
    await applyChk('shStChk', applySm, 'style');
    await applyChk('shMxChk', applySm, 'mix');
    await applyChk('chkSb', applySubNo);
    // （この後にsearch / chkOnly を続けていく想定）
    console.log('applyViewの終わり');
}
async function applyChk(chkId, fn, mode) {
    const checked = !!document.getElementById(chkId)?.checked;
    await fn(checked, mode);
}

// style/mix 表示関係
export async function toggleSm(e, mode) {
    console.log('toggleSmが押された！');
    // sync がまだ始まっていなければ起動
    if (!state.isSyncing) {
        startSync();
    }
    applyView();
}
async function applySm(isChecked, mode) {
    if (isChecked) {
        await addSm(mode);
    } else {
        removeSm(mode);
    }
}
async function addSm(mode) {
    console.log('addSm');

    const mlSmJson = await readJson('data/music-list-sm-new.json');
    const tpl = document.getElementById('tmp-main-row');

    mlSmJson.forEach(item => {
        if (item.smType !== mode) return;
        if (mTbl.map.has(item.mID)) return; // ← 二重追加防止（重要）

        const newTr = mkRow(item, tpl);
        newTr.dataset.smType = item.smType; // style/mix行だということをtrに追加

        const nextId = findNextId(mTbl.map, item.mID);

        addOneRow(mTbl.tbody, newTr, mTbl.map, nextId);
        mTbl.map.set(item.mID, newTr);
    });
    logMapKeys('[mTbl.map] after ON', mTbl.map);
}
function removeSm(mode) {
    console.log('removeSm');

    for (const [id, tr] of mTbl.map) {
        const chk = tr.querySelector('.chk[data-id]');
        if (!chk) continue;

        // ここは item.smType を tr 側に持たせておくと楽
        if (tr.dataset.smType === mode) {
            tr.remove();
            mTbl.map.delete(id);
        }
    }
    logMapKeys('[mTbl.map] after OFF', mTbl.map);
}
// toggleSmヘルパー
function findNextId(map, newId) {
    let next = null;

    for (const id of map.keys()) {
        if (id > newId && (next === null || id < next)) {
            next = id;
        }
    }
    return next; // 無ければ null（末尾へ）
}
/**
 * 任意の場所に1行挿入する汎用関数
 * 
 * @param {HTMLElement} tbody - 対象テーブルのtbody要素
 * @param {HTMLElement} newTr - 挿入する<tr>
 * @param {Map<number, HTMLElement>} map - mIDなどをキーとした行Map
 * @param {number|null} nextId - 指定した行の前に挿入。nullなら末尾に追加
 */
export function addOneRow(tbody, newTr, map, nextId) {
    const nextRow = nextId !== null ? map.get(nextId) : null;

    if (nextRow && nextRow.parentElement === tbody) {
        nextRow.before(newTr);
    } else {
        tbody.appendChild(newTr);
    }
}
export async function subNoFn(e) {
    if (!state.isSyncing) { startSync(); }

    console.log(`subNoFn is called: csLen=${cs.length}, cs=[${cs}], csBk=[${csBk}]`);
    applyView();
}
async function applySubNo(isChecked) {
    console.log(`applySubNo is called: csLen=${cs.length}, cs=[${cs}], csBk=[${csBk}]`);

    // sub-no-new.json 読み込み（mID 配列）
    const subNoArray = await readJson(addVer('./data/sub-no-new.json'));

    if (isChecked) {
        // subNoArray の値を cs に追加
        subNoArray.forEach(id => {
            if (!cs.includes(id)) {
                cs.push(id);
            }
        });
        // cs の全要素について、map に存在すればチェックを付ける
        cs.forEach(id => {
            const tr = mTbl.map.get(id);
            if (!tr) return;

            const chk = tr.querySelector('.chk');
            if (chk && !chk.checked) {
                chk.checked = true;
            }
        });

    } else {
        // OFF 時：cs にあって csBk にないものだけ戻す
        const toRemove = cs.filter(id => !csBk.includes(id));

        toRemove.forEach(id => {
            const i = cs.indexOf(id);
            if (i !== -1) cs.splice(i, 1);

            const chk = document.querySelector(`.chk[data-id="${id}"]`);
            if (chk) chk.checked = false;
        });
    }
    console.log(`applySubNo is finished: csLen=${cs.length}, cs=[${cs}], csBk=[${csBk}]`);
}