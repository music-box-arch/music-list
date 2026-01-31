// sl-new.js
// func-new.js
const { addVer } = window.MLAPP;
// addVer を使って main-new.js を import
const { state, mTbl, chkStates, readJson, mkRow, mlMapData } = await import(addVer('./main-new.js'));
const { startSync, applyView } = await import(addVer('./func-new.js'));
// ローカル短縮
const { cs, csBk } = chkStates;

const slConfig = {
    // 属性付与の定義（TR自身とチェックボックス）
    attr: {
        ':scope': { 
            'dataset.songId': 'mID',
            'dataset.setlistOrder': 'slOrder' 
        },
        '.chk': { 'dataset.id': 'mID' },
        '.sl-order': { 'textContent': 'slOrder' }
    },
    map: [
        ['ytNd', 'ytUrl', 'yt', '♪'],
        ['lvNd', 'lv', 'LV'],
        ['spfNd', 'spf', 'Spf'],
        ['aplNd', 'apl', 'Apl'],
        ['itnNd', 'itn', 'iTn'],
        ['lrcNd', 'lrc', '歌詞']
    ],
    fields: ['title', 'tmp', 'hlt']
};

export async function dispSl() {
    console.log('=== dispSlのはじまり ===');
    if (!state.isSyncing) { startSync(); };
    
    const mlMap = await mlMapData; // ここでMapの実体を取り出す
    const slJson = await readJson('data/sl-new.json');
    // 先にsummary達だけ作る
    mkSlSummary();
    // 中身は後から足す
    slJson.forEach(setlistData => {
        //flagが1以上ならtableを作成
        if (setlistObj.flag >= 1) {
            const slTblId = setlistObj.date;
            const slTrs = mkSlTrs(setlistObj.setlist);
            dispSlTbody(slTrs, slTblId);
        //flagが0ならつくらない※
        } else {
            //
        }
        
    });
    applyView();
}

function mkSlSummary() {
    //<template id="sl-details-tpl">をとる
    //複製
    //中身を書く
    //<div id="setlist-area">にappendChildしていく
}
/** @param {number[]} setlistArr */
function mkSlTrs(setlistArr) {
    //<template id="sl-tr-tpl">をとってくる
    //複製
    const fragment = document.createDocumentFragment();
    const addedFragment = addTrsToFrag(setlistArr, tpl, fragment);
    //trたちの入ったfragmentをreturn;
}

//addRowsは旧main.jsにもある関数名なので注意
function addTrsToFrag(setlistArr, tpl, fragment) {
    let slOrder = 0;

    setlistArr.forEach( slMId => {
        if (slMId !== 0) {
            slOrder++;
            const item = mlMap.get(slMId);
            // item自体に一時的にセトリ順を持たせる
            item.slOrder = slOrder;
            // テンプレート(tpl)はそのまま使い、configで差異を吸収する
            const tr = mkRow(item, tpl, slConfig);
            fragment.appendChild(tr);
            // 必要であれば使用後に削除する（または、使い捨てのコピーを渡す）
            delete item.slOrder;
        } else {
            // 別の操作
        }
    });
}

function dispSlTbody( tbody, tblId ) {
    // tblIdをidに持つ<details>を取ってくる
    //その中の<table>にappendChild;
}