// チェック状態管理専用モジュール
let csBk = null;
let cS = [];

// cS管理系関数
export async function initChkState() {
    // DOM状態を一括取得してcSに初期化
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    cS = checkedIds.sort((a, b) => a - b);
    window.cS = cS;

    // csBkも初期化（現在の状態をバックアップとして保持）
    csBk = [...cS];

}

// cSを指定コンテキストに反映する統一関数
function aplCsCxt(cxt) {
    const selector = cxt === 'ml' 
        ? '#musicTbl .chk'
        : `.chk[data-context="${cxt}"]`;
    
    // 対象の全チェックボックスを一度に取得
    const allCb = document.querySelectorAll(selector);
    
    // 各チェックボックスのIDをcSと照合してチェック状態を設定
    allCb.forEach(cb => {
        const id = Number(cb.dataset.id);
        cb.checked = cS.includes(id);
    });
    
    // フィルター再適用も一緒に実行
    chkOnly(cxt);
}


// 現在チェックされているIDを配列で取得
export function getCurrent() {
    const checkedIds = [];
    document.querySelectorAll('.chk:checked').forEach(chk => {
        checkedIds.push(Number(chk.dataset.id));
    });
    return checkedIds.sort((a, b) => a - b);
}

// cSを更新する関数（外部から呼び出し可能）
export function update(id, isChecked) {
    if (isChecked) {
        // チェックON: cSとcSBUp両方に追加
        if (!cS.includes(id)) {
            cS.push(id);
            cS.sort((a, b) => a - b);
            window.cS = cS;
        }
        if (!csBk) {
            csBk = [];
        }
        if (!csBk.includes(id)) {
            csBk.push(id);
            csBk.sort((a, b) => a - b);
        }
    } else {
        // チェックOFF: cSとcSBUp両方から削除
        cS = cS.filter(checkId => checkId !== id);
        window.cS = cS;
        if (csBk) {
            csBk = csBk.filter(checkId => checkId !== id);
        }
    }
    
    // cSとcsBkの値をコンソールに出力
    console.log('cS updated:', cS.length, 'items -', cS);
    console.log('csBk:', csBk ? csBk.length + ' items - ' + csBk : 'null');
}

// 統一されたチェック付きのみ表示関数
function chkOnly(context) {
    const configs = {
        'ml': {
            checkId: 'shChkOnly',
            filterFn: () => window.showChk && window.showChk(true)
        },
        'sl': {
            checkId: 'slShChk',
            filterFn: () => window.slChk && window.slChk(true)
        }
    };
    
    const config = configs[context];
    if (!config) return;
    
    const filterCheck = document.getElementById(config.checkId);
    if (filterCheck && filterCheck.checked) {
        config.filterFn();
    }
}

// cSをアクティブタブに反映する関数
function applyActv() {
    // アクティブタブを判定
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    const activeTabId = activeTab.id;
    const context = activeTabId === 'songlist-tab' ? 'ml' : 'sl';
    
    // コンテキストに応じてチェック状態を更新（フィルター再適用も含む）
    aplCsCxt(context);
}

// チェックボックスの統一同期処理
export function syncChk() {
    document.addEventListener('change', async function (e) {
        if (e.target.classList.contains('chk')) {
            const changedId = Number(e.target.dataset.id);
            const context = e.target.dataset.context;
            
            // 初回チェックボックス変更時に表を完成させる
            if (window.tblCmp) {
                await window.tblCmp();
            }
            
            update(changedId, e.target.checked);

            // セットリストの場合は同じmIDの他のセットリストチェックボックスも同期
            if (context === 'sl') {
                const sameIdChks = document.querySelectorAll(`.chk[data-context="sl"][data-id="${changedId}"]`);
                sameIdChks.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            }

            applyActv();
        }
    });
}


// クリア機能
export function clear() {
    cS = [];
    window.cS = cS;
    csBk = null;

    // サブスク無しチェックボックスも外す
    const subCB = document.getElementById('chkSb');
    if (subCB && subCB.checked) {
        subCB.checked = false;
    }

    aplCsCxt('ml');
    aplCsCxt('sl');
}

// サブスク無し機能での特別なcS操作
export function setSubNo(idsToAdd, backupIds) {
    // サブスク無し曲を追加
    idsToAdd.forEach(id => {
        if (!cS.includes(id)) {
            cS.push(id);
        }
    });
    cS.sort((a, b) => a - b);
    window.cS = cS;

    // バックアップを更新
    if (backupIds) {
        csBk = [...backupIds].sort((a, b) => a - b);
    }
}

export function restore() {
    if (csBk) {
        cS = [...csBk];
        window.cS = cS;
    } else {
        cS = [];
        window.cS = cS;
    }
}

// グローバル関数として公開
export function setGlobals() {
    window.clrCS = clear;
    window.aplCsCxt = aplCsCxt;
    window.applyActv = applyActv;
    window.updCS = update;
    window.getCS = getCurrent;
    window.setCSsub = setSubNo;
    window.rstCS = restore;
}