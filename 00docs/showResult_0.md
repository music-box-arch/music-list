# result-new.js 処理整理メモ

## showResult がやっていること（処理順）

1. ログ出力  
   - `showResult is called` を出力

2. データ読み込み  
   - `all-discs-new.json`（全CD情報）を読み込む  
   - `mlJsonData`（全曲データ）を取得

3. CSS 読み込み  
   - `result.css` を `loadCss` で読み込む

4. チェック状態同期の開始  
   - `state.isSyncing === false` の場合 `startSync()` を実行

5. チェック曲数の確認  
   - `cs.length === 0` の場合 alert を表示して終了

6. partsMap の構築  
   - `mlJsonData` から  
     `Map<mID, parts>` を生成

7. style / mix 曲の不足チェック  
   - `cs` 内に partsMap に存在しない mID があるか確認

8. smJson による補完  
   - 不足があれば `getSmJson()` を取得  
   - partsMap に存在しない mID の parts を追加

9. 表示環境の計測  
   - `measureEnv()` により  
     - ラッパー幅（limitW）  
     - フォントサイズ  
     を取得

10. CDタイプの取得  
    - ラジオボタンから cdType を取得

11. 結果用データ生成  
    - `mkResultData(cs, mTbl, allDiscs)` を実行  
    - cols（CD列情報）と rows（曲行情報）を作成

12. CDタイプによるフィルタ  
    - `applyCdType(resultData, cdType)`  
    - cols を絞り、rows.cells も同期

13. 最小構造テーブル生成  
    - `mkMinTbl(cdTypeData)`  
    - DOM 上に最小限の table を生成

14. テーブル幅調整  
    - `adjustTbl(resultMinTbl, cols, env, partsMap)` を実行

15. 描画  
    - `renderTbl(adjustedTbl)` で画面表示
