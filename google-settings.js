/**
 * =============================================================================
 *  Google 連携・引き渡し用の設定ファイル（この1ファイルを主に編集してください） 
 * =============================================================================
 *
 * 【いまのあなた（動作確認）】
 * 1. 下の `GOOGLE_LP_CONFIG` の各 URL に、あなたの Google アカウントで取得した値を貼り付ける
 * 2. LP を保存してブラウザを再読み込み（カレンダー・地図の iframe に反映されます）
 *
 * 【知人に渡すとき】
 * 1. このファイルごと渡すか、中身だけコピーしてもらう
 * 2. 知人の Google カレンダー・マイマップ（または Google マップの埋め込み）・スプレッドシート用 Apps Script の URL に差し替える
 * 3. `google-settings.sample.js` は「空のひな形」として残してあるので、迷ったら sample を見比べる
 *
 * -----------------------------------------------------------------------------
 *  各項目の取得メモ（URL はすべて https:// で始まる形を貼る）
 * -----------------------------------------------------------------------------
 *
 * ■ calendarEmbedUrl … 下の GOOGLE_LP_CONFIG の calendarEmbedUrl に貼る（このコメント内ではなく）
 *   Googleカレンダー Web → 左のカレンダー名の「⋮」→「設定と共有」
 *   →「カレンダーの統合」あたりの「カスタムの埋め込み」から iframe の src をコピー
 *   → その src の URL 文字列だけをここに貼る（<iframe ...> 全体ではなく URL のみ）
 *
 * ■ mapEmbedUrl（Googleマップ）
 *   Googleマップで場所を開く →「共有」→「地図を埋め込む」→ HTML をコピー
 *   → iframe の src の URL だけをここに貼る
 *
 * ■ spreadsheetAppsScriptUrl（スプレッドシート連携・任意）
 *   スプレッドシートに予約行を追加したい場合: Google Apps Script で Web アプリとして公開し、その URL を貼る
 *   空のままなら、予約確定時にサーバーへ送信は行いません（LP だけで完結）
 *
 * ■ spreadsheetIdMemo / ownerGoogleAccountNote
 *   画面には出ません。運用メモ用（どのアカウントのどのシートか書いておくと後で楽です）
 *
 * =============================================================================
 */

// TODO: 本番・知人用に差し替えるのは主にこのオブジェクトの中身だけで足ります
window.GOOGLE_LP_CONFIG = {
  /** @type {string} 営業カレンダー iframe の src にそのまま使う URL */
  calendarEmbedUrl:
    "https://calendar.google.com/calendar/embed?src=nao.0504.g707%40gmail.com&ctz=Asia%2FTokyo",

  /** @type {string} Googleマップ埋め込み iframe の src にそのまま使う URL */
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13502.234292768955!2d130.74342012405396!3d32.21612333213886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x353f7174da299197%3A0x4fd91ab8c025d86f!2z5Lq65ZCJ6aeF!5e0!3m2!1sja!2sjp!4v1778250573448!5m2!1sja!2sjp",

  /**
   * @type {string}
   * 予約確定時に POST する先（Google Apps Script の Web アプリ URL など）
   * 空なら送信しません
   */
  spreadsheetAppsScriptUrl: "",

  /** 運用メモ（任意・画面非表示）どのスプレッドシートか */
  spreadsheetIdMemo: "",

  /** 運用メモ（任意・画面非表示）どの Google アカウントで管理しているか */
  ownerGoogleAccountNote: "",
};

/*
 * 補足: 確認画面に出る「本日の受け取り場所」テキストは、現状 script.js 内の pickupLocation です。
 * カレンダーと完全連動させる際は、Apps Script または google-settings.js から同期する形に整理するとよいです。
 */
