/**
 * 予約送信先など Google 連携の設定値は google-settings.js の GOOGLE_LP_CONFIG を参照します。
 * ここではベタ書きせず window 経由のみ読みます。
 */

const PRICE_INPUTS = document.querySelectorAll(".qty-input");
const totalAmountEl = document.getElementById("totalAmount");
const hourSelect = document.getElementById("hourSelect");
const minuteSelect = document.getElementById("minuteSelect");
const timePreview = document.getElementById("timePreview");
const slotStatus = document.getElementById("slotStatus");
const reservationForm = document.getElementById("reservationForm");

const reservationFormPanel = document.getElementById("reservationFormPanel");
const reservationConfirmPanel = document.getElementById("reservationConfirmPanel");
const reservationDonePanel = document.getElementById("reservationDonePanel");

const reservationSectionTitle = document.getElementById("reservationSectionTitle");
const reservationSectionLead = document.getElementById("reservationSectionLead");

const confirmOrderBody = document.getElementById("confirmOrderBody");
const confirmGrandTotal = document.getElementById("confirmGrandTotal");
const confirmName = document.getElementById("confirmName");
const confirmPhone = document.getElementById("confirmPhone");
const confirmEmail = document.getElementById("confirmEmail");
const confirmNote = document.getElementById("confirmNote");
const confirmTime = document.getElementById("confirmTime");
const confirmPickupName = document.getElementById("confirmPickupName");
const confirmPickupAddress = document.getElementById("confirmPickupAddress");
const confirmPickupNote = document.getElementById("confirmPickupNote");
const confirmStoreTelLink = document.getElementById("confirmStoreTelLink");
const confirmLineBtn = document.getElementById("confirmLineBtn");

const confirmBackBtn = document.getElementById("confirmBackBtn");
const confirmSubmitBtn = document.getElementById("confirmSubmitBtn");
const reservationSubmitMessage = document.getElementById("reservationSubmitMessage");
const doneNewOrderBtn = document.getElementById("doneNewOrderBtn");
const doneCustomerName = document.getElementById("doneCustomerName");
const doneReservationLine = document.getElementById("doneReservationLine");

const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const noteInput = document.getElementById("note");

/** 後で Google カレンダー・イベント出店と連動させるときは、このオブジェクトを更新してから applyPickupLocationToConfirm() を呼ぶ */
const pickupLocation = {
  name: "〇〇公園前 テント販売場所",
  address: "〇〇県〇〇市〇〇町〇-〇",
  note: "営業カレンダーの出店場所をご確認ください"
};

// TODO: 本番の店舗連絡先・LINE に差し替え
const STORE_PHONE_DISPLAY = "090-0000-0000";
const STORE_PHONE_TEL = "09000000000";
const STORE_LINE_URL = "https://line.me/R/ti/p/";

/** 確認画面への一時データ（確定まで枠カウントしない） */
let pendingReservationTime = "";

// 支払い: 現地支払い（現金）が方針。追加時は index.html の .confirm-pay-list と res-pay-policy を編集。動的生成する場合はこのファイルで組み立て也行可。

// 仮データ: 各時間枠の既存予約数（最大5組）
const bookingSlots = {
  "09:00": 1,
  "09:15": 2,
  "10:30": 4,
  "11:45": 5,
  "12:00": 3,
  "13:15": 5,
  "15:30": 2,
  "17:00": 4,
  "18:45": 5
};

function formatYen(value) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatLocalDateForPayload(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 完了画面用：確定時点の「本日」と受け取り時刻（日付入力がないため当日扱い） */
function formatDonePickupDateTime(timeKey) {
  const parts = String(timeKey || "").split(":");
  const hourStr = parts[0] || "00";
  const minuteStr = parts[1] || "00";

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const wd = weekdays[now.getDay()];
  const h = Number(hourStr);
  const m = Number(minuteStr);
  const minuteLabel = String(Number.isFinite(m) ? m : 0).padStart(2, "0");

  return `${month}月${day}日（${wd}）${h}時${minuteLabel}分〜`;
}

function buildDoneOrderSummary() {
  const parts = [];
  let total = 0;

  PRICE_INPUTS.forEach((input) => {
    const qty = Math.max(0, Number(input.value) || 0);
    if (qty === 0) return;
    const label = input.dataset.name || "商品";
    const price = Number(input.dataset.price) || 0;
    parts.push(`${label}×${qty}`);
    total += price * qty;
  });

  return { parts, total };
}

function populateDonePanel(timeKey) {
  const rawName = nameInput.value.trim();
  const displayName = rawName || "お客様";
  if (doneCustomerName) {
    doneCustomerName.textContent = `${displayName}さま`;
  }

  const dt = formatDonePickupDateTime(timeKey);
  const { parts, total } = buildDoneOrderSummary();
  const orderBit = parts.length ? `${parts.join("、")}（合計${formatYen(total)}）` : `ご注文（合計${formatYen(total)}）`;

  if (doneReservationLine) {
    doneReservationLine.textContent = `【${dt}】のお渡しで、${orderBit}のご予約を承りました。`;
  }
}

function initHourOptions() {
  for (let hour = 9; hour <= 19; hour += 1) {
    const hourText = String(hour).padStart(2, "0");
    const option = document.createElement("option");
    option.value = hourText;
    option.textContent = hourText;
    hourSelect.appendChild(option);
  }
}

function calculateTotal() {
  let total = 0;

  PRICE_INPUTS.forEach((input) => {
    const price = Number(input.dataset.price) || 0;
    const quantity = Math.max(0, Number(input.value) || 0);
    total += price * quantity;
  });

  totalAmountEl.textContent = formatYen(total);
  return total;
}

function getSelectedTime() {
  const hour = hourSelect.value;
  const minute = minuteSelect.value;

  if (!hour || !minute) {
    return "";
  }
  return `${hour}:${minute}`;
}

function updateTimePreviewAndSlot() {
  const selectedTime = getSelectedTime();

  if (!selectedTime) {
    timePreview.textContent = "受け取り時間: 未選択";
    slotStatus.textContent = "時間枠の予約状況を表示します";
    slotStatus.style.color = "#ffd2a3";
    return;
  }

  timePreview.textContent = `受け取り時間: ${selectedTime}`;

  const bookedCount = bookingSlots[selectedTime] || 0;
  const remain = 5 - bookedCount;

  if (remain <= 0) {
    slotStatus.textContent = `${selectedTime} は満枠です（5/5組）。別の時間を選択してください。`;
    slotStatus.style.color = "#ff8d8d";
    return;
  }

  slotStatus.textContent = `${selectedTime} の残り枠: ${remain}組（${bookedCount}/5組予約済み）`;
  slotStatus.style.color = "#ffd2a3";
}

function validateSlotAvailability() {
  const selectedTime = getSelectedTime();
  if (!selectedTime) {
    alert("受け取り時間を選択してください。");
    return false;
  }

  const bookedCount = bookingSlots[selectedTime] || 0;
  if (bookedCount >= 5) {
    alert("選択した時間枠は満枠です。別の時間をお選びください。");
    return false;
  }
  return true;
}

function validateOrderQuantity() {
  const total = calculateTotal();
  if (total <= 0) {
    alert("ご注文を1点以上お選びください。");
    return false;
  }
  return true;
}

function syncStoreContactToConfirm() {
  confirmStoreTelLink.textContent = STORE_PHONE_DISPLAY;
  confirmStoreTelLink.href = `tel:${STORE_PHONE_TEL}`;
  confirmLineBtn.href = STORE_LINE_URL;
}

function applyPickupLocationToConfirm() {
  confirmPickupName.textContent = pickupLocation.name;
  confirmPickupAddress.textContent = pickupLocation.address;
  confirmPickupNote.textContent = pickupLocation.note;
}

/**
 * Google カレンダー連動時の例:
 * pickupLocation.name = "...";
 * pickupLocation.address = "...";
 * applyPickupLocationToConfirm();
 */

function renderConfirmOrderLines() {
  confirmOrderBody.replaceChildren();

  PRICE_INPUTS.forEach((input) => {
    const qty = Math.max(0, Number(input.value) || 0);
    if (qty === 0) return;

    const price = Number(input.dataset.price) || 0;
    const label = input.dataset.name || "商品";
    const subtotal = price * qty;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(label)}</td>
      <td>${qty}</td>
      <td>${formatYen(subtotal)}</td>
    `;
    confirmOrderBody.appendChild(tr);
  });

  confirmGrandTotal.textContent = formatYen(calculateTotal());
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setReservationUIMode(mode) {
  const titleMap = {
    form: "予約フォーム",
    confirm: "予約内容の確認",
    done: "ご予約ありがとうございます"
  };
  reservationSectionTitle.textContent = titleMap[mode] || titleMap.form;
  reservationSectionLead.hidden = mode !== "form";

  reservationFormPanel.hidden = mode !== "form";
  reservationConfirmPanel.hidden = mode !== "confirm";
  reservationDonePanel.hidden = mode !== "done";

  document.getElementById("reservation").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openConfirmStep() {
  if (!validateOrderQuantity()) return;
  if (!validateSlotAvailability()) return;

  pendingReservationTime = getSelectedTime();
  setSubmitMessage("");

  renderConfirmOrderLines();
  confirmName.textContent = nameInput.value.trim() || "—";
  confirmPhone.textContent = phoneInput.value.trim() || "—";
  confirmEmail.textContent = emailInput.value.trim() || "—";
  confirmNote.textContent = noteInput.value.trim() || "—";
  confirmTime.textContent = pendingReservationTime;
  syncStoreContactToConfirm();
  applyPickupLocationToConfirm();

  setReservationUIMode("confirm");
}

/** デザイン確認用：仮の入力で確認画面を開く（枠はまだ消費しない） */
function fillSampleDataAndOpenConfirm() {
  nameInput.value = "山田 太郎";
  phoneInput.value = "09012345678";
  emailInput.value = "yakitori@example.com";
  noteInput.value = "焼き上がり時間に合わせて伺います。";

  PRICE_INPUTS.forEach((input) => {
    input.value = "0";
  });
  const first = document.querySelector('.qty-input[data-name="ねぎま"]');
  const second = document.querySelector('.qty-input[data-name="つくね"]');
  if (first) first.value = "2";
  if (second) second.value = "1";

  hourSelect.value = "09";
  minuteSelect.value = "30";

  calculateTotal();
  updateTimePreviewAndSlot();

  openConfirmStep();
}

function backToForm() {
  pendingReservationTime = "";
  setSubmitMessage("");
  setReservationUIMode("form");
}

function getGoogleLpConfig() {
  return typeof window !== "undefined" && window.GOOGLE_LP_CONFIG ? window.GOOGLE_LP_CONFIG : null;
}

/** 予約確定時に Apps Script へ送る項目（GAS側の列名と合わせる） */
function buildReservationPayload(reservedTimeKey) {
  const { parts, total } = buildDoneOrderSummary();

  return {
    receiveDate: formatLocalDateForPayload(),
    receiveTime: reservedTimeKey,
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    order: parts.join("、"),
    total,
    note: noteInput.value.trim()
  };
}

/**
 * Apps Script はCORS応答を返さない構成も多いため、Form POST相当の no-cors で送る。
 * GAS側では e.parameter.receiveDate など、buildReservationPayload() のキー名で受け取る。
 */
async function submitReservation(payload) {
  const cfg = getGoogleLpConfig();
  const url = cfg && cfg.spreadsheetAppsScriptUrl ? String(cfg.spreadsheetAppsScriptUrl).trim() : "";
  if (!url) {
    throw new Error("Apps Script URL is not configured.");
  }

  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value == null ? "" : String(value));
  });

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    body
  });
}

function setSubmitMessage(message) {
  if (reservationSubmitMessage) {
    reservationSubmitMessage.textContent = message;
  }
}

function setConfirmSubmitLoading(isLoading) {
  confirmSubmitBtn.disabled = isLoading;
  confirmBackBtn.disabled = isLoading;
  confirmSubmitBtn.textContent = isLoading ? "送信中..." : "予約を確定する";
}

async function finalizeReservation() {
  if (confirmSubmitBtn.disabled) return;

  const t = pendingReservationTime || getSelectedTime();
  if (!t || !validateSlotAvailability()) {
    pendingReservationTime = "";
    setReservationUIMode("form");
    return;
  }

  const payload = buildReservationPayload(t);

  setSubmitMessage("");
  setConfirmSubmitLoading(true);

  try {
    await submitReservation(payload);

    bookingSlots[t] = (bookingSlots[t] || 0) + 1;
    updateTimePreviewAndSlot();
    pendingReservationTime = "";

    populateDonePanel(t);
    setReservationUIMode("done");
  } catch (err) {
    console.warn("[予約送信] Apps Script への送信に失敗しました。URL・公開設定・doPost を確認してください。", err);
    setSubmitMessage("送信に失敗しました。時間をおいて再度お試しください。");
  } finally {
    setConfirmSubmitLoading(false);
  }
}

function scrollToPageTop() {
  const top = document.getElementById("top");
  if (top) {
    top.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function resetFormForNewOrder() {
  nameInput.value = "";
  phoneInput.value = "";
  emailInput.value = "";
  noteInput.value = "";
  setSubmitMessage("");

  PRICE_INPUTS.forEach((input) => {
    input.value = "0";
  });

  hourSelect.selectedIndex = 0;
  minuteSelect.selectedIndex = 0;

  calculateTotal();
  updateTimePreviewAndSlot();
  setReservationUIMode("form");
  scrollToPageTop();
}

function setupQtySteppers() {
  document.querySelectorAll(".qty-stepper").forEach((row) => {
    const input = row.querySelector(".qty-input");
    const minus = row.querySelector(".qty-stepper__btn--minus");
    const plus = row.querySelector(".qty-stepper__btn--plus");
    if (!input || !minus || !plus) return;

    const minVal = () => Math.max(0, Number(input.min) || 0);

    const applyValue = (next) => {
      const v = Math.max(minVal(), next);
      input.value = String(v);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    minus.addEventListener("click", () => {
      applyValue((Number(input.value) || 0) - 1);
    });

    plus.addEventListener("click", () => {
      applyValue((Number(input.value) || 0) + 1);
    });
  });
}

function setupEvents() {
  setupQtySteppers();

  PRICE_INPUTS.forEach((input) => {
    input.addEventListener("input", () => calculateTotal());
  });

  hourSelect.addEventListener("change", updateTimePreviewAndSlot);
  minuteSelect.addEventListener("change", updateTimePreviewAndSlot);

  reservationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    openConfirmStep();
  });

  confirmBackBtn.addEventListener("click", backToForm);
  confirmSubmitBtn.addEventListener("click", finalizeReservation);
  doneNewOrderBtn.addEventListener("click", resetFormForNewOrder);

  const previewBtn = document.getElementById("previewConfirmBtn");
  if (previewBtn) {
    previewBtn.addEventListener("click", fillSampleDataAndOpenConfirm);
  }
}

function describeLayoutBreakpoint(width) {
  if (width <= 480) {
    return "〜480px · 狭いスマホ補正（セクション余白など）";
  }
  if (width < 560) {
    return "481〜559px · ヒーローCTAは縦並びになりやすい";
  }
  if (width < 768) {
    return "560〜767px · ヒーローCTA横並び";
  }
  if (width < 1200) {
    return "768〜1199px · タブレット〜PC（3列グリッドなど）";
  }
  return "1200px〜 · 広い画面（メニュー4列など）";
}

/** 開発確認用（本番では付けない想定）：例 index.html?debug=viewport */
function installViewportDebugPanel() {
  const panel = document.createElement("aside");
  panel.id = "viewportDebugPanel";
  panel.setAttribute("aria-live", "polite");
  panel.style.cssText = [
    "position:fixed",
    "left:10px",
    "bottom:10px",
    "z-index:2147483646",
    "max-width:min(calc(100vw - 20px),18rem)",
    "padding:10px 12px",
    "border-radius:10px",
    "font-size:11px",
    "line-height:1.55",
    "font-family:inherit",
    "color:#eaeaea",
    "background:rgba(20,20,22,0.92)",
    "border:1px solid rgba(255,122,24,0.45)",
    "box-shadow:0 8px 24px rgba(0,0,0,0.45)",
    "pointer-events:none"
  ].join(";");

  const title = document.createElement("strong");
  title.textContent = "レイアウト確認";
  title.style.cssText = "display:block;margin-bottom:6px;color:#ffb37a;font-size:12px;";
  panel.appendChild(title);

  const lineVp = document.createElement("div");
  const lineTier = document.createElement("div");
  const lineLayoutMin = document.createElement("div");
  const lineBox = document.createElement("div");
  const hint = document.createElement("div");
  hint.style.cssText = "margin-top:8px;opacity:0.75;font-size:10px;line-height:1.45;";
  hint.textContent = "消すときは URL から ?debug=viewport を外してください";

  panel.appendChild(lineVp);
  panel.appendChild(lineTier);
  panel.appendChild(lineLayoutMin);
  panel.appendChild(lineBox);
  panel.appendChild(hint);

  function render() {
    const w = window.innerWidth;
    lineVp.textContent = `ビューポート幅: ${w}px`;
    lineTier.textContent = describeLayoutBreakpoint(w);
    const minVar =
      getComputedStyle(document.documentElement).getPropertyValue("--layout-min-width").trim() || "—";
    lineLayoutMin.textContent = `レイアウト最小幅: ${minVar}（ウィンドウがそれより狭いときは横スクロール）`;
    const container = document.querySelector(".container");
    const cw = container ? Math.round(container.getBoundingClientRect().width) : "—";
    lineBox.textContent = `.container 実幅: ${cw}px · CSS上限 1040px`;
  }

  document.body.appendChild(panel);
  render();
  window.addEventListener("resize", render);
}

function readLayoutMinWidthPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--layout-min-width").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 360;
}

/** デモ用：左端からのピクセル位置に縦ガイド（スマホ最小幅・タブレット768px） */
function installBreakpointDemoOverlay() {
  const minW = readLayoutMinWidthPx();
  const tabletPx = 768;

  const wrapper = document.createElement("div");
  wrapper.className = "breakpoint-demo-overlay";
  wrapper.setAttribute("aria-hidden", "true");

  function addRail(leftPx, label, variant) {
    const rail = document.createElement("div");
    rail.className = `breakpoint-demo-overlay__line breakpoint-demo-overlay__line--${variant}`;
    rail.style.left = `${leftPx}px`;
    const tag = document.createElement("span");
    tag.className = "breakpoint-demo-overlay__tag";
    tag.textContent = label;
    rail.appendChild(tag);
    wrapper.appendChild(rail);
  }

  addRail(minW, `${Math.round(minW)}px（LPの最小幅＝スマホで幅が止まる目安）`, "mobile");
  addRail(tabletPx, `${tabletPx}px（タブレット〜／この幅からメニュー3列などPC寄りレイアウト）`, "tablet");

  const note = document.createElement("p");
  note.className = "breakpoint-demo-overlay__note";
  note.textContent = "デモ用ガイド — 公開時は URL の ?demo=breakpoints を外してください";
  wrapper.appendChild(note);

  document.body.appendChild(wrapper);
}

function init() {
  initHourOptions();
  calculateTotal();
  updateTimePreviewAndSlot();
  syncStoreContactToConfirm();
  applyPickupLocationToConfirm();

  reservationFormPanel.hidden = false;
  reservationConfirmPanel.hidden = true;
  reservationDonePanel.hidden = true;

  setupEvents();

  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "confirm") {
    requestAnimationFrame(() => fillSampleDataAndOpenConfirm());
  }

  if (params.get("debug") === "viewport") {
    installViewportDebugPanel();
  }

  if (params.get("demo") === "breakpoints") {
    installBreakpointDemoOverlay();
  }
}

init();
