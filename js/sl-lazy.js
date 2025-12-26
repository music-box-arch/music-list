// セットリスト機能の遅延読み込み処理
import { loadCss } from './main-lazy.js';

// セットリスト機能の初期化
export async function initSL() {
  try {
    loadCss(`css/sl.css?v=${window.updVer}`);
    const { buildSL, setupGlb } = await import('./sl.js?v=${window.updVer}');

    // セットリスト機能を初期化
    await buildSL();

    // グローバル関数を設定
    setupGlb();

  } catch (error) {
  }
}