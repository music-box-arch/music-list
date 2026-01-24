##　以下、旧情報
<!-- ## adjustTbl がやっていること（処理順）
### 準備フェーズ

1. 表示制限幅の取得  
   - `env.limitW` を取得

2. padding 値の取得  
   - CSS変数 `--th-padx` を取得

3. canvas / context 準備  
   - 文字幅計測用 canvas を生成  
   - `2d context` を取得

4. スタイル取得  
   - 列ヘッダ（th）のフォント情報  
   - 行ヘッダ（td.row-head）のフォント情報

5. 表示対象行データ作成  
   - 各曲行から  
     - mID  
     - title  
     - parts（partsMap から取得）  
   - をまとめた `displayRows` を作成


### フェーズ1：CD列の共通基準幅決定

6. 曲名最短幅の算出  
   - n=0（最短表記）での曲名最大幅を計測  
   - `minRowW` を算出

7. CD名用フォント設定  
   - canvas context に th のフォントを設定

8. n=0〜15 のループ  
   - 各 n について  
     - 全CDの最大幅 `maxW` を計測  
     - `minRowW + (maxW + padX) * 列数` を算出  
   - limitW を超えない最大 n を探す  
   - その時の `maxW` を `bestW` として保存

### フェーズ2：CD列の個別最適化
9. 合計幅初期化  
   - `currentTw = minRowW`

10. 各CD列について  
    - `findBestN()` で列ごとの最適 n を決定  
    - 実幅を計測  
    - `currentTw` に加算  
    - CD名表示をその n の省略形に更新


### フェーズ3：曲名側への余白還元
11. 曲名用フォントを canvas に再設定

12. n=1〜15 のループ  
    - 曲名最大幅を計測  
    -  `(CD列合計幅 + 曲名幅) <= limitW`  を満たすか判定  
    - 収まる限り n を拡張

13. 最終曲名幅決定  
    - `finalRowMaxW` を確定

14. 曲名セルに反映  
    - `.row-head` に max-width を設定

15. テーブル全体幅調整  
    - table に min-width を設定

16. 調整済み table を return





adjustTbl設計

書いてもらってる途中なんだけど、すでにけっこう大きく変えたいんだ。
ちなみに用語として「最小表示」というのは、mkNameByPartsでn=0としたときの値です。
行ヘッダ：曲名のところ
列ヘッダ：CD名のところ
↑時々間違えるから「あれ？」と思ったら確認してね

あと基本的にmdで改行しまくると見づらくなるので、改行とか区切り線とかは不要です。

## 変更したい点、相談したい点：
- フォント：フォントの種類はデフォルト、サンセリフ、みたいに簡単に設定してるし、厳密でなくてもいいので（wrapperでスクロールできるし）、いちいち取得するほどではないのではないか？ フォントサイズだけ取得すればいいのではないか？ （とも思うが、どうせひとつのオブジェクトとして取得して、その中に入ってるとかなら使うのもありなのか、、、？）
- findBestNameで求めた文字列はどこでtableに反映していくか？（都度か、まとめてか）

## ヘルパー関数の候補：
- 今までのmkNameByPartsを、mkNameByNに変更。
- 複数のidの束、map、nの値を渡して、渡されたすべてのidについて、mapのpartsとnの値からmkNameByNをして幅を測り、最大の値を返す関数。msrMaxNameW。
- 1つのparts(CD名partsや曲名parts)と限界幅を渡して、mkNameByNを回し、「限界幅にぎりぎり収まる文字列」を返す関数。findBestName

### 準備フェーズ←けっこうそのまま
ただし、
5. 表示対象行データ作成 で作成するmapは `titleMap` という名前にする。
6. また、CD名のほうも、colsからcd-group-idで引けるように同じ形のmapを作り、cdNameMapとする。

### フェーズ1：行ヘッダの最小表示での幅を求める
- csに入ってる各mIDについて、「曲名(行ヘッダになる)の最小表示」を求める。
- 上の値にpaddingを加えて、baseRowHWとする。
- （baseRowHWをログに出しておく）

### フェーズ2：列ヘッダ幅を決定
列ヘッダについて、
let bestCdNameW=0;

while(i=0から15まで回す){
（iの値をログに出す）
iの値をnとして、列ヘッダとなるCD名たちでmsrMaxNameWを求める。（この値maxCdNameWログに出力しておく）
この値にthのパディングを加え、列ヘッダの数をかけ、さらにbaseRowHWを加える。（この値curTblWをログに出力しておく）
curTblWとlimitWを比較する。（各値とcurTbl<=limitWのtrue/falseをログ出す）
falseなら、bestCdNameWの値をログに出してbreak
trueなら、bestCdNameW = maxCdNameW; としてi++;}

### 列ヘッダ表示の決定
各列ヘッダについて、findBestNameを使って表示する文字列を決定

### 行ヘッダ表示の決定

改めてbestCdNameWにthのパディングを足し、列ヘッダの数をかけ、colsWとする。
limitW - colsW - (.row-headのパディング) を求めてrowHWとする。

rowHWを限界幅として曲名でfindBestNameを回し、曲名に表示する文字列を決定

### Tableをreturn;

もしこれまでに段階的に文字列を列ヘッドや行ヘッドに適用していれば、そのままreturn;
もしまだ適用していなければ、まとめて適用してreturn;



 -->


# adjustTbl 疑似コード設計（2026-01版）
adjustTbl は以下の6フェーズで構成される。
フェーズ0（準備）
フェーズ1（行ヘッダ最小表示幅の算出）
フェーズ2（列ヘッダ幅の決定）
フェーズ3（列ヘッダ表示の決定）
フェーズ4（行ヘッダ表示の決定）
フェーズ5（DOM反映・return）

## 注意事項
各ステップで「0-1 limitW = XXX」みたいな数値がログに出るようにしてほしい。
ログは一行で収まるようにお願いします。

## ヘルパー関数
- mkNameByN(parts, n)：今までのmkNameByPartsを、mkNameByNに変更。

- msrMaxNameW(ids, partsMap, n, ctx)：複数のidの束、map、nの値を渡して、渡されたすべてのidについて、mapのpartsとnの値からmkNameByNをして幅を測り、最大の値を返す関数。

- findBestName(parts, limitW, ctx)：1つのparts(CD名partsや曲名parts)と限界幅を渡して、mkNameByNを回し、「限界幅にぎりぎり収まる文字列」を返す関数。
    疑似コード```
        // limitW に収まる最大の表示文字列を返す
        function findBestName(parts, limitW, ctx) {
            bestName = mkNameByN(parts, 0)

            for n from 1 to 15:
                name = mkNameByN(parts, n)
                w = ctx.measureText(name).width

                if w <= limitW:
                    bestName = name
                else:
                    break

            return bestName
        }```



## フェーズ0（準備フェーズ）

0-1. 表示制限幅の取得
- env.limitW を取得し、limitW とする

0-2. padding 値の取得
- table（#resultTbl）から CSS変数 --th-padx を取得
- 数値化して thPadX とする（左右合計）

0-3. canvas / context 準備
- document.createElement('canvas') で canvas を生成
- canvas.getContext('2d') で ctx を取得

0-4. スタイル取得（簡易）
- table または wrapper から getComputedStyle を1回だけ取得
- fontSize, fontFamily を取り出す
- ctx.font に `${fontSize}px ${fontFamily}` を設定

0-5. ~~行ヘッダ用 （曲名）titleMap~~
    第四引数としてtitleMapをもらうようにしたのですることはなくなった。titleMapは以下の形。
            item.mID,
            {
                full: item.title,
                part: item.hasOwnProperty('parts') ? item.parts : null
            }

0-6. 列ヘッダ用 map 作成（CD名）cdNameMap
- allDiscs から cd-group-id を key にした map を作成
  value:
    - cdName（フル文字列）
    - parts（cd-name-parts）
- この map を cdNameMap とする

## フェーズ1（行ヘッダ最小表示幅の算出）

1-1. baseTitleW を 0 で初期化

1-2. cs に含まれる各 mID についてループ
- titleMap から parts を取得
- mkNameByN(parts, 0) で最小表示文字列を生成
- ctx で文字幅を計測
- 最大値を baseTitleW に保持

1-3. baseTitleW に thPadX を加算
- baseRowHW = baseTitleW + thPadX;

1-4. baseRowHW をログ出力

## フェーズ2（列ヘッダ幅の決定）

2-1. bestCdNameW = 0 で初期化

2-2. n = 0 から 15 までループ
- n をログ出力
- cdNameMap 全体に対して msrMaxNameW を実行
  - n を指定して最大文字幅 maxCdNameW を取得
- maxCdNameW をログ出力
- curTblW = baseRowHW + (maxCdNameW + thPadX) * 列ヘッダ数
- curTblW, limitW, (curTblW <= limitW) をログ出力
- curTblW > limitW の場合
  - bestCdNameW をログ出力
  - break
- curTblW <= limitW の場合
  - bestCdNameW = maxCdNameW
  - 次の n へ

## フェーズ3（列ヘッダ表示の決定）

3-1. 空の map cdNameDispMap を作成

3-2. 各列ヘッダ（cd-group-id）について
- cd-group-idでcdNameMapをひく
- findBestName(obj, bestCdNameW, ctx) を実行
- 戻り値の文字列を cdNameDispMap(cd-group-idをkeyとして、文字列をひけるように) に保存

## フェーズ4（行ヘッダ表示の決定）

4-1. colsW を算出
- colsW = (bestCdNameW + thPadX) * 列ヘッダ数

4-2. 行ヘッダ用の限界幅 rowHW を算出
- rowHW = limitW - colsW - thPadX

4-3. 空の map titleDispMap を作成

4-4. cs に含まれる各 mID について
- mIDでtitleMapをひく
- findBestName(obj, rowHW, ctx) を実行
- 戻り値の文字列を titleDispMap(mIDをkeyとして、文字列をひけるように) に保存

## フェーズ5（DOM反映・return）

5-1. 列ヘッダ（th）に表示を反映
- 各 th(thがdata-cdidとしてcd-group-idを持ってるので) に対して cdNameDispMap の文字列を textContent に設定

5-2. 行ヘッダ（td.row-head）に表示を反映
- 各 td.row-head (thがdata-midとしてmIDを持ってるので) に対して titleDispMap の文字列を textContent に設定

5-3. 調整済み table を return


 <!-- result.css  -->

 ```
 #resultTbl {
    /* JSと連動する変数定義 */
    --th-padx: 8px;
    /* 左右パディングの合計 (4px + 4px) */
    --th-pady: 6px;
    /* 上下のパディング */

    width: auto;
    table-layout: fixed;
    font-size: 1rem;
}

#resultTbl th {
    /* 変数を使用してパディングを適用 */
    padding: var(--th-pady) calc(var(--th-padx) / 2);

    line-height: 1.2;
    text-align: center;
    vertical-align: top;
    white-space: nowrap;
}

#resultTbl th>div {
    display: block;
    line-height: 1.4;
}

/* 行ヘッダ（左上空セル or 曲名列） */
#resultTbl thead th.row-head {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

#resultTbl tbody td {
    padding: 4px 2px;
    font-size: 1rem;
    line-height: 1.3;
    text-align: center;
    vertical-align: middle;
}

/* 曲名（行ヘッダ列） */
#resultTbl tbody td.row-head {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
 ```

