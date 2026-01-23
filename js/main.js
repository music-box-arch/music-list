// バージョン定義
window.updVer = '20260120';

// 1. グローバル変数（最小限）
let lazy = false; // lazyload済フラグ
let slLazy = false; // sl.js読込済フラグ
let tblProg = false; // tbl作成中フラグ
let remains = []; // 残りの曲データ

// 初回btn押時のlazyload
async function initLazy() {
  if (lazy) return;

  // 各モジュールから必要な機能をimport
  const { setupGlb } = await import('./main-lazy.js?v=${window.updVer}');
  const { initChkState, setGlobals, syncChk } = await import('./checkstate.js?v=${window.updVer}');

  // チェック状態管理を初期化
  await initChkState();

  // グローバル関数を設定
  setupGlb();

  // チェックボックス同期を設定（リアルタイム同期開始）
  syncChk();

  // グローバル関数を設定
  setGlobals();

  lazy = true;
}

// slのlazyload処理
async function initSlLazy() {
  if (slLazy) return;

  const { initSL } = await import('./sl.js?v=${window.updVer}');

  // セットリスト機能を初期化
  await initSL();

  slLazy = true;
}

function shwShare() {
  if (window.scrollY > 200) {
    document.querySelector('.shareWrap')?.classList.remove('hidden');
    window.removeEventListener('scroll', shwShare); // 一度やったら削除
  }
}

// 2. DOMContentLoaded後
document.addEventListener('DOMContentLoaded', function () {
  // 2-1. 曲リスト表生成
  // リソース完全性検証
  import('./tbl.js?v=${window.updVer}').then(({ canFetch }) => {
    const musicUrl = 'data/music-list.json?v=${window.updVer}';

    if (!canFetch(musicUrl)) {
      throw new Error('Invalid resource URL detected');
    }

    return fetch(musicUrl);
  })
    .then(response => response.json())
    .then(async musicData => {
      // mIDでソートしてから表示
      const sorted = Object.entries(musicData).sort((a, b) => a[1].mID - b[1].mID);
      const songData = sorted.map(([id, song]) => song);

      // 最初の40行だけ作成
      const initBch = songData.slice(0, 40);
      remains = songData.slice(40);

      // tbl.jsの汎用関数を使用してテーブル作成
      const { createTable } = await import('./tbl.js?v=${window.updVer}');

      const tableConfig = {
        headers: ['✔︎', '曲名', 'YT', 'LV', 'Spf', 'Apl', 'iTn', '歌詞', 's/m', '初収録', '順', '発売日'],
        data: initBch,
        context: 'ml',
        columns: ['title', 'yt', 'lv', 'spf', 'apl', 'itn', 'lrc', 'exsm', 'firstCd', 'order', 'cdDate'],
        textOnlyColumns: [0, 7, 8, 9, 10] // title, exsm, firstCd, order, cdDate
      };

      const { table } = createTable(tableConfig);

      // 既存のテーブル要素を更新
      const existingTable = document.querySelector('#musicTbl');

      if (existingTable) {
        const existingThead = existingTable.querySelector('thead');
        const existingTbody = existingTable.querySelector('tbody');

        // ヘッダーとボディを置き換え
        if (existingThead && existingTbody) {
          existingThead.replaceWith(table.querySelector('thead'));
          existingTbody.replaceWith(table.querySelector('tbody'));
        }
      }

      // ボタンを即座に有効化
      enblMinimalBtns();
      enblCdBtns();
      enblAudioBtn();
      initTabFunc();

      // 初期表示後の行数をログ出力
      const tbody = document.querySelector('#musicTbl tbody');

      // 表作成完了フラグ
      tblProg = true;

      // 残り行を非同期で即座に追加
      setTimeout(() => {
        tblCmp();
      }, 0);
    })
    .catch(error => {
      console.error('JSON読み込みエラー:', error);
    });


  // 指定行数追加
  async function addRows(count = 0) {
    if (remains.length === 0) return;

    const tbody = document.querySelector('#musicTbl tbody');
    const { createTable } = await import('./tbl.js?v=${window.updVer}');

    const batch = count > 0 ? remains.splice(0, count) : remains.splice(0);

    const config = {
      headers: [],
      data: batch,
      context: 'ml',
      columns: ['title', 'yt', 'lv', 'spf', 'apl', 'itn', 'lrc', 'exsm', 'firstCd', 'order', 'cdDate'],
      textOnlyColumns: [0, 7, 8, 9, 10] // title, exsm, firstCd, order, cdDate
    };

    const { table } = createTable(config);
    const newRows = Array.from(table.querySelector('tbody').children);
    newRows.forEach(row => tbody.appendChild(row));
  }

  // 表完成の確保
  async function tblCmp() {
    if (remains.length > 0) {
      tblProg = false;
      await addRows(); // 全行追加
    }
  }

  // slタブ用の40行追加
  async function add40Rows() {
    await addRows(40);
  }

  // tblCmpをグローバルに公開
  window.tblCmp = tblCmp;

  // 表完成とinit lazy
  async function initBoth() {
    await tblCmp();
    if (!lazy) await initLazy();
  }

  // 2-2. 最小限のbtn有効化
  function enblMinimalBtns() {
    // 4つの重要ボタンに初回lazyload検出を設定
    const filterCB = document.getElementById('chkSb');
    const stCB = document.getElementById('shStChk');
    const mxCB = document.getElementById('shMxChk');
    const chkOnly = document.getElementById('shChkOnly');

    if (filterCB) {
      filterCB.addEventListener('change', async function () {
        await initBoth();
        // lazyload後、実際の処理を実行
        if (window.subNo) {
          window.subNo(this.checked);
        }
      });
    }

    if (stCB) {
      stCB.addEventListener('change', async function () {
        await initBoth();
        // lazyload後、実際の処理を実行
        if (window.style) {
          const mxCB = document.getElementById('shMxChk');
          window.style(this.checked, mxCB ? mxCB.checked : false);
        }
      });
    }

    if (mxCB) {
      mxCB.addEventListener('change', async function () {
        await initBoth();
        // lazyload後、実際の処理を実行
        if (window.mix) {
          const stCB = document.getElementById('shStChk');
          window.mix(stCB ? stCB.checked : false, this.checked);
        }
      });
    }

    if (chkOnly) {
      chkOnly.addEventListener('change', async function () {
        await initBoth();
        // lazyload後、実際の処理を実行
        if (window.showChk) {
          window.showChk(this.checked);
        }
      });
    }

    // 曲名検索のフォーカス時lazyload検出
    const songSrch = document.getElementById('sngSrch');
    if (songSrch) {
      songSrch.addEventListener('focus', async function () {
        // 表を先に完成させる
        await tblCmp();
        await initBoth();
        // 検索機能を有効化（重複防止は関数内で処理）
        if (window.enSrch) {
          window.enSrch();
        }
      });
    }

    // CDを見るボタンはinitLazy()で設定済み

    // クリアボタンは最小限の機能のみ
    document.querySelectorAll('.clearAllChecksBtn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.chk:checked').forEach(chk => {
          chk.checked = false;
        });

        // サブスク無しチェックボックスも外す
        const subCB = document.getElementById('chkSb');
        if (subCB && subCB.checked) {
          subCB.checked = false;
        }

        // lazy済みの場合、表示フィルター系のチェックボックスもクリア
        if (lazy && window.clrDispFilt) {
          window.clrDispFilt();
        }

        // cSのクリアはlazyload後に担当
        if (lazy && window.clrCS) {
          window.clrCS();
        }
      });
    });
  }

  // 2-3. CD btnの有効化（event lstnrのみ設置）
  function enblCdBtns() {
    document.querySelectorAll('.showDiscsButton').forEach(btn => {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        // 1. cS記録にmain-lazy, checkstate.js読込
        if (!lazy) {
          await initLazy();
        }

        // 2. result.jsを動的読込しCD処理実行
        const { initCdFeats } = await import('./result.js?v=${window.updVer}');
        initCdFeats();

        if (window.cdBtn) {
          window.cdBtn();
        }
      });
    });
  }

  // 2-4. enable audMd btn
  function enblAudioBtn() {
    const audioCheckbox = document.getElementById("audioInfoMode");
    if (!audioCheckbox) return;

    audioCheckbox.addEventListener("change", async (e) => {
      const { handleAudioMode } = await import('./all-audio-btn.js?v=${window.updVer}');
      handleAudioMode(e.target.checked);
    });
  }

  // 2-5. init タブ機能
  function initTabFunc() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const targetTab = this.dataset.tab;

        // main-lazyが未読込→chk状態を初期化
        if (!lazy) {
          await initLazy();
        }

        // slタブの初回click
        if (targetTab === 'setlist' && !slLazy) {
          // まず+40行を強制追加
          if (remains.length > 0) {
            await add40Rows();
          }

          tblProg = false; // 残りの表作成を中断
          await initSlLazy();
        }

        // タブ切替時のchk状態同期
        if (targetTab === 'setlist') {
          // セットリストタブに切り替える時、cSを反映
          if (window.aplCsCxt) {
            window.aplCsCxt('sl');
          }
        } else if (targetTab === 'songlist') {
          // 曲一覧タブに切り替える時、表を完成させてからcSを反映
          await tblCmp();
          if (window.aplCsCxt) {
            window.aplCsCxt('ml');
          }
        }

        // タブ切替処理
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(targetTab + '-tab').classList.add('active');
      });
    });
  }

  // 2-6. TOPに戻る
  const backToTop = document.createElement('a');
  backToTop.href = '#tp';
  backToTop.id = 'back-to-top';
  backToTop.textContent = '▲ TOP';
  document.body.appendChild(backToTop);

  // scroll event
  window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });

  // シェアbtn可視化
  window.addEventListener('scroll', shwShare);

});

// all-audio-btnに公開
window.initLazy = initLazy;