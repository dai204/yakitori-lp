/**
 * google-settings.js の GOOGLE_LP_CONFIG を読み、カレンダー・地図の iframe に反映します。
 * URL を書き換える場合は google-settings.js のみ編集してください。
 */
(function applyGoogleEmbeds() {
  function run() {
    const cfg = window.GOOGLE_LP_CONFIG;
    if (!cfg || typeof cfg !== "object") {
      return;
    }

    const calendarFrame = document.getElementById("calendarEmbedFrame");
    const mapFrame = document.getElementById("mapEmbedFrame");

    if (calendarFrame && cfg.calendarEmbedUrl && String(cfg.calendarEmbedUrl).trim()) {
      calendarFrame.src = String(cfg.calendarEmbedUrl).trim();
      calendarFrame.title = "営業日カレンダー";
    }

    if (mapFrame && cfg.mapEmbedUrl && String(cfg.mapEmbedUrl).trim()) {
      mapFrame.src = String(cfg.mapEmbedUrl).trim();
      mapFrame.title = "本日の販売場所";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
