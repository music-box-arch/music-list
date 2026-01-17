// グローバル管理用
const { addVer } = window.MLAPP;
const { state } = await import(addVer('./main-new.js'));
const { startSync } = await import(addVer('./func-new.js'));
// ローカル短縮
// const { cs, csBk } = chkStates;

// モードON直前の表のUIのチェック状態
let audModeBkup = null;

//　音源情報を表示させている曲のmID
let openAudioNumbers = [];

// ===== audio mode UI targets =====
const AUD_UI_IDS = [
    'chkSb',        // サブスク無しにチェック（冷凍）
    'shChkOnly',    // チェック付き行のみ表示（冷凍）
    'sngSrch'       // 曲名検索（value保持）
];

const AUD_UI_SELECTORS = [
    '.clearAllChecksBtn',                 // チェックをオールクリア
    '.showDiscsButton',                   // チェックした曲を含むCDを見る（上下）
    '.tab-btn[data-tab="setlist"]',       // セトリタブ
    '#musicTbl .chk',                     // 曲チェックボックス群
    '#shStChk',                           // style(再録音)
    '#shMxChk'                            // mix(リミックス)
];

// モードのON/OFF処理
export async function handleAudioMode(e) {
    console.log('handleAudioMode is called');
    if (e.target.checked) {
        if (!state.isSyncing) {
            startSync();
        }

        loadAudCss();   // cssをロード

        bkAudSt();    //UI状態をBkup
        forceDisp();  //状態を強制調整
        disUI();      //UI無効化
        btnAppear();  //btn描写, shift, listener

    } else {
        rstAudSt();     //状態を戻
        enaUI();        //UI戻
        closeInfos();   //情報閉じ
        btnDisappear(); //btn消し, shift戻
    }
}

function loadAudCss() {
    if (document.getElementById('aud-css')) {
        return;
    }

    const link = document.createElement('link');
    link.id = 'aud-css';
    link.rel = 'stylesheet';
    link.href = `css/aud.css?v=${window.updVer}`;

    document.head.appendChild(link);
}

// モードON直前のUIのchk状態を保存
function bkAudSt() {
    audModeBkup = {
        chkSb: document.getElementById('chkSb')?.checked ?? false,
        shStChk: document.getElementById('shStChk')?.checked ?? false,
        shMxChk: document.getElementById('shMxChk')?.checked ?? false,
        shChkOnly: document.getElementById('shChkOnly')?.checked ?? false,
    };
}

// 表示を強制調整（tab、s/m OFF）
function forceDisp() {
    // 曲一覧タブを強制表示
    const songTabBtn = document.querySelector(
        '.tab-btn[data-tab="songlist"]'
    );

    if (songTabBtn && !songTabBtn.classList.contains('active')) {
        songTabBtn.click();
    }

    // style(再録音) 表示 → OFF
    const shSt = document.getElementById('shStChk');
    if (shSt && shSt.checked) {
        shSt.checked = false;
        shSt.dispatchEvent(new Event('change'));
    }

    // mix(リミックス) 表示 → OFF
    const shMx = document.getElementById('shMxChk');
    if (shMx && shMx.checked) {
        shMx.checked = false;
        shMx.dispatchEvent(new Event('change'));
    }
}

// UI無効化
function disUI() {
    //aufグレーアウト
    document.querySelectorAll('.auf').forEach(el => {
        el.classList.add('dis');
    });

    //ID指定
    AUD_UI_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.disabled = true;
        el.classList.add('dis');
    });

    //セレクタ指定
    AUD_UI_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.disabled = true;
            el.classList.add('dis');
        });
    });

    //slタブ 見た目
    const setlistTab = document.querySelector('.tab-btn[data-tab="setlist"]');
    if (setlistTab) {
        setlistTab.classList.add('dis');
    }

}

// ▶btn追加、clickでimport(all-audio.js),audioInfoOpen(mID),result.js関係など操作off
function btnAppear() {
    const checkboxes = document.querySelectorAll('input.chk[data-id]');

    checkboxes.forEach((chk, idx) => {
        const mID = chk.dataset.id;
        const row = chk.closest('tr');
        const titleCell = chk.parentElement?.nextElementSibling;

        if (!row || !titleCell) {
            console.warn(`row or titleCell missing for idx=${idx}`);
            return;
        }

        //既存→skip
        if (titleCell.querySelector('.aud-tgl')) {
            return;
        }

        // ▶btn作成
        const a = document.createElement('a');
        a.className = 'aud-tgl';
        a.dataset.id = mID;
        a.textContent = '▶';
        a.href = '#';

        // insert btn(曲名左)
        titleCell.insertBefore(a, titleCell.firstChild);
        titleCell.classList.add('aud-shft'); // ← 左余白

        // click event
        a.addEventListener('click', async (e) => {
            e.preventDefault(); // href="#"の動作抑制

            const mIDNum = Number(mID);
            const { audioInfoOpen, audioInfoClose } = await import('./all-audio.js?v=${window.updVer}');

            const idx = openAudioNumbers.indexOf(mIDNum);

            if (idx === -1) {
                audioInfoOpen(mIDNum);
                openAudioNumbers.push(mIDNum);
                a.textContent = '▼';
                a.classList.add('is-open');
            } else {
                audioInfoClose(mIDNum);
                openAudioNumbers.splice(idx, 1);
                a.textContent = '▶';
                a.classList.remove('is-open');
            }
        });
    });
}

// remove ▼btn, close infos(audioInfoClose())
function rstAudSt() {
    // 状態を戻す
    if (!audModeBkup) return;

    const map = {
        chkSb: 'chkSb',
        shStChk: 'shStChk',
        shMxChk: 'shMxChk',
        shChkOnly: 'shChkOnly'
    };

    Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;

        const prev = el.checked;
        const next = !!audModeBkup[key];

        if (prev === next) return;     // 変化なし → 何もしない

        el.checked = next;
        el.dispatchEvent(new Event('change')); // ← toggleSmOn/Offが確実に呼ばれる
    });
}

function enaUI() {
    // aufのグレーアウト解除
    document.querySelectorAll('.auf').forEach(el => {
        el.classList.remove('dis');
    });

    // ID指定
    AUD_UI_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.disabled = false;
        el.classList.remove('dis');
    });

    // セレクタ指定
    AUD_UI_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.disabled = false;
            el.classList.remove('dis');
        });
    });

    // slタブの見た目
    const setlistTab = document.querySelector('.tab-btn[data-tab="setlist"]');
    if (setlistTab) {
        setlistTab.classList.remove('dis');
    }
}

async function closeInfos() {
    if (openAudioNumbers.length === 0) return;

    const { audioInfoClose } = await import('./all-audio.js?v=${window.updVer}');
    openAudioNumbers.forEach(mID => {
        audioInfoClose(mID);
    });

    openAudioNumbers = [];
}

function btnDisappear() {

    document.querySelectorAll('.aud-tgl').forEach(btn => {
        const cell = btn.parentElement;
        btn.remove();

        // 曲名の左ずらしを戻す
        if (cell) {
            cell.classList.remove('aud-shft');
        }
    });
}