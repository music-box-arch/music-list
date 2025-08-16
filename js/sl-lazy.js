// セットリスト機能の遅延読み込み処理

// セットリスト機能の初期化
export async function initSL() {
  try {
    const { initSL, setupGlb } = await import('./sl.js');

    // セットリスト機能を初期化
    await initSL();

    // グローバル関数を設定
    setupGlb();

  } catch (error) {
  }
}