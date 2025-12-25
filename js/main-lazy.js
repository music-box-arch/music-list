// 各種機能ボタン用のlazy import処理
let subNoMap = null;
let smData = null;

// サブスク無しデータの読み込み
async function loadSubNo() {
    if (!subNoMap) {
        const { isValidResource } = await import('./tbl.js?v=${window.updVer}');
        const url = 'data/sub-no.json?v=${window.updVer}';

        if (!isValidResource(url)) {
            throw new Error('Invalid resource URL detected');
        }

        const response = await fetch(url);
        subNoMap = await response.json();
    }
    return subNoMap;
}

// style/mixデータの読み込み
async function loadSm() {
    if (!smData) {
        const { isValidResource } = await import('./tbl.js?v=${window.updVer}');
        const url = 'data/music-list-sm.json?v=${window.updVer}';

        if (!isValidResource(url)) {
            throw new Error('Invalid resource URL detected');
        }

        const response = await fetch(url);
        smData = await response.json();
    }
    return smData;
}

// サブスク無しフィルター処理（musiclist.jsから移植・統合）
export async function SubNoFn(isChecked) {
    if (isChecked) {
        // サブスク無し曲を追加
        await loadSubNo();

        const currentIds = window.getCS ? window.getCS() : [];
        const subNoData = await loadSubNo();
        const subNoIds = Object.keys(subNoData).map(id => Number(id));

        // cS操作用の関数を呼び出し
        if (window.setCSsub) {
            window.setCSsub(subNoIds, currentIds);
        }
    } else {
        // バックアップから復元
        if (window.rstCS) {
            window.rstCS();
        }
    }

    // 画面に反映とフィルター再適用
    if (window.applyActv) {
        window.applyActv();
    }

    // 検索中の場合は自動で検索をやり直し
    reapplySearch();
}

// 従来のhdlSubNoChkも保持（下位互換性のため）
async function hdlSubNoChk(showSubNoOnly) {
    return SubNoFn(showSubNoOnly);
}

// style/mix表示処理
async function toggleSm(showStyle, showMix) {
    const data = await loadSm();
    const tbody = document.querySelector('#musicTbl tbody');

    // 既存のstyle/mix行を削除
    tbody.querySelectorAll('.sm-row').forEach(row => row.remove());

    if (!showStyle && !showMix) {
        // style/mixを非表示にした場合も、cSを表示に反映
        if (window.aplCsCxt) {
            window.aplCsCxt('ml');
        }
        return;
    }

    // 追加する行をフィルター
    const toAdd = Object.values(data).filter(song => {
        if (showStyle && song.smType.includes('style')) return true;
        if (showMix && song.smType.includes('mix')) return true;
        return false;
    }).sort((a, b) => a.mID - b.mID);

    // 各行を適切な位置に挿入
    const { createTable } = await import('./tbl.js?v=${window.updVer}');
    const { table } = createTable({
        headers: [], // ヘッダー不要
        data: toAdd,
        context: 'ml',
        columns: ['title', 'yt', 'lv', 'spf', 'apl', 'itn', 'lrc', 'exsm', 'firstCd', 'order', 'cdDate'],
        textOnlyColumns: [0, 7, 8, 9, 10], // title, exsm, firstCd, order, cdDate
        cstmRow: (tr, song) => {
            if (song.mID === 93) tr.cells[1].classList.add('small');
            tr.classList.add('sm-row');
        }
    });

    // 作成された行を適切な位置に挿入
    Array.from(table.querySelector('tbody').children).forEach(newRow => {
        const songId = parseInt(newRow.querySelector('.chk').dataset.id);
        insertRow(tbody, newRow, songId);
    });

    // cSを表示に反映
    if (window.aplCsCxt) {
        window.aplCsCxt('ml');
    }

    // 検索中の場合は自動で検索をやり直し
    reapplySearch();
}



// 適切な位置に行を挿入
export function insertRow(tbody, newRow, place, compareBy = 'mID') {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    for (let i = 0; i < rows.length; i++) {
        let currentValue;
        if (compareBy === 'mID') {
            currentValue = parseInt(rows[i].querySelector('.chk').dataset.id);
        } else if (compareBy === 'setlistOrder') {
            currentValue = parseInt(rows[i].getAttribute('data-setlist-order'));
        }
        if (currentValue > place) {
            tbody.insertBefore(newRow, rows[i]);
            return;
        }
    }
    tbody.appendChild(newRow);
}

// チェック付き行のみ表示処理
async function hdlMlChkOnly(showCheckedOnly) {
    const tbody = document.querySelector('#musicTbl tbody');
    const allRows = tbody.querySelectorAll('tr');

    // 現在の検索語を取得
    const srchInp = document.getElementById('sngSrch');
    const searchTerm = srchInp ? srchInp.value.trim() : '';

    if (showCheckedOnly) {
        // チェック付き行のみ表示（検索フィルターも考慮）
        allRows.forEach(row => {
            const checkbox = row.querySelector('.chk');
            let shouldShow = checkbox && checkbox.checked;

            // 検索フィルターも適用
            if (shouldShow && searchTerm) {
                const titleCell = row.querySelector('td:nth-child(2)');
                if (titleCell) {
                    const titleText = titleCell.textContent.toLowerCase();
                    const srchLower = searchTerm.toLowerCase();
                    shouldShow = titleText.includes(srchLower);
                }
            }

            row.style.display = shouldShow ? '' : 'none';
        });
    } else {
        // 全行表示（検索フィルターは考慮）
        if (searchTerm) {
            reapplySearch();
        } else {
            allRows.forEach(row => {
                row.style.display = '';
            });
        }
    }
}

// 曲名検索機能
function enblSrch() {
    const srchInp = document.getElementById('sngSrch');
    if (!srchInp) return;

    // リアルタイム検索のイベントリスナー
    srchInp.addEventListener('input', function () {
        pfmSrch(this.value.trim());
    });

    // 検索機能有効化後、フォーカスを戻す
    srchInp.focus();
}

// 曲名検索実行
function pfmSrch(searchTerm) {
    const tbody = document.querySelector('#musicTbl tbody');
    const allRows = tbody.querySelectorAll('tr');

    if (!searchTerm) {
        // 検索語が空の場合、全行表示（ただし他のフィルターは考慮）
        allRows.forEach(row => {
            row.style.display = '';
        });

        // チェック付き行のみ表示が有効の場合は再適用
        const chkOnly = document.getElementById('shChkOnly');
        if (chkOnly && chkOnly.checked) {
            hdlMlChkOnly(true);
        }
        return;
    }

    // 大文字小文字を区別しない検索
    const srchLower = searchTerm.toLowerCase();

    allRows.forEach(row => {
        const titleCell = row.querySelector('td:nth-child(2)'); // 曲名は2番目のセル
        if (titleCell) {
            const titleText = titleCell.textContent.toLowerCase();
            const matchSrch = titleText.includes(srchLower);

            // 検索時は検索結果のみを表示（チェック状態は無視）
            row.style.display = matchSrch ? '' : 'none';
        }
    });

}

// 検索中の場合は自動で検索をやり直し
function reapplySearch() {
    const srchInp = document.getElementById('sngSrch');
    if (srchInp) {
        const curSearch = srchInp.value.trim();
        if (curSearch) {
            pfmSrch(curSearch);
        }
    }
}

// ハンドラー関数（main.jsから呼ばれる）
async function hdlStChk(isStyleChecked, isMixChecked) {
    await toggleSm(isStyleChecked, isMixChecked);
}

async function hdlMxChk(isStyleChecked, isMixChecked) {
    await toggleSm(isStyleChecked, isMixChecked);
}

// 表示フィルター系のチェックボックスを全てクリア（クリアボタン用）
export function clrDispFilt() {
    // 曲タブの「チェックをつけた行だけ表示」を外す
    const chkOnly = document.getElementById('shChkOnly');
    if (chkOnly && chkOnly.checked) {
        chkOnly.checked = false;
        hdlMlChkOnly(false);
    }

    // セトリタブの「チェックをつけた行だけ表示」を外す
    const slChkOnly = document.getElementById('slShChk');
    if (slChkOnly && slChkOnly.checked) {
        slChkOnly.checked = false;
        // セトリタブ用の処理を呼び出し（sl.jsのhandleCheckedOnly）
        if (window.slChk) {
            window.slChk(false);
        }
    }
}

// グローバル関数を公開
export function setupGlb() {
    // グローバルアクセス用
    window.subNo = SubNoFn;
    window.subChk = hdlSubNoChk;
    window.style = hdlStChk;
    window.mix = hdlMxChk;
    window.showChk = hdlMlChkOnly;
    window.enSrch = enblSrch;
    window.doSrch = pfmSrch;
    window.clrDispFilt = clrDispFilt;
}