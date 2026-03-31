// ============================================================
//  Code.gs — The Chai Junction — Google Apps Script Backend
//  Deploy: Web App → Execute as "Me" → Access: "Anyone"
//
//  Sheets:
//    "menu"     → id, category, name, description, price, available, image_url
//    "prices"   → item_id, price   (real-time price override sheet)
//    "orders"   → order_id, timestamp, name, phone, items, total, type, table_no, status, prebooking, notes
//    "bookings" → booking_id, timestamp, name, phone, date, time, guests, status, prebooking_paid, notes
// ============================================================

const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE"; // 🔁 Apna Sheet ID daalo

// ⚠️ UPI ID YAHAN RAKHO — frontend me kabhi nahi jaayega
const UPI_ID       = "YOUR_UPI_ID@upi";       // 🔁 Apna UPI ID daalo
const UPI_NAME_ENC = "The+Chai+Junction";      // URL-encoded name

// ── GET Handler ──────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getMenu")       return sendJSON(getMenu());
    if (action === "getPrices")     return sendJSON(getPrices());
    if (action === "getOrders")     return sendJSON(getOrders());
    if (action === "getBookings")   return sendJSON(getBookings());
    if (action === "getStats")      return sendJSON(getStats());
    if (action === "getPayLink")    return sendJSON(getPayLink(e.parameter));
    return sendJSON({ error: "Unknown action" });
  } catch (err) {
    return sendJSON({ error: err.message });
  }
}

// ── POST Handler ─────────────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === "saveOrder")         return sendJSON(saveOrder(data));
    if (action === "saveBooking")       return sendJSON(saveBooking(data));
    if (action === "updateOrderStatus") return sendJSON(updateOrderStatus(data));
    if (action === "addMenuItem")       return sendJSON(addMenuItem(data));
    return sendJSON({ error: "Unknown action" });
  } catch (err) {
    return sendJSON({ error: err.message });
  }
}

// ── UPI Pay Link Generator (UPI ID hidden server-side) ───────
// Frontend sends amount; backend returns full UPI deep link
// UPI ID NEVER exposed to frontend
function getPayLink(params) {
  const amount    = parseFloat(params.amount || 0).toFixed(2);
  const orderId   = params.orderId || ("ORD" + Date.now());
  const note      = encodeURIComponent("Order " + orderId + " - The Chai Junction");

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return { success: false, error: "Invalid amount" };
  }

  // UPI deep link — works with GPay, PhonePe, Paytm, etc.
  const deepLink = `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME_ENC}&am=${amount}&cu=INR&tn=${note}`;

  // Intent URL for Android browser
  const intentUrl = `intent://pay?pa=${UPI_ID}&pn=${UPI_NAME_ENC}&am=${amount}&cu=INR&tn=${note}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;

  return {
    success:    true,
    deepLink:   deepLink,
    intentUrl:  intentUrl,
    amount:     amount,
    orderId:    orderId
  };
}

// ── Prices (real-time from "prices" sheet) ────────────────────
// Ye sheet sirf do columns hai: item_id | price
// Tum directly sheet me price change karo → instantly website pe update
function getPrices() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("prices");
  if (!sheet) return { success: false, error: "prices sheet not found" };

  const rows   = sheet.getDataRange().getValues();
  const prices = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) prices[rows[i][0]] = parseFloat(rows[i][1]) || 0;
  }
  return { success: true, data: prices, updatedAt: new Date().toISOString() };
}

// ── Menu ──────────────────────────────────────────────────────
function getMenu() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("menu");
  if (!sheet) return { success: false, error: "menu sheet not found" };

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const items   = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const item = {};
    headers.forEach((h, j) => item[h] = row[j]);
    if (item.available === true || item.available === "TRUE") items.push(item);
  }
  return { success: true, data: items };
}

function addMenuItem(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("menu");
  const id    = "ITEM_" + Date.now();
  sheet.appendRow([id, data.category, data.name, data.description, data.price, true, data.image_url || ""]);

  // Also add to prices sheet for real-time override
  const pSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("prices");
  if (pSheet) pSheet.appendRow([id, data.price]);

  return { success: true, id: id };
}

// ── Orders ────────────────────────────────────────────────────
function saveOrder(data) {
  const sheet     = SpreadsheetApp.openById(SHEET_ID).getSheetByName("orders");
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const orderId   = "ORD" + Date.now();

  sheet.appendRow([
    orderId,
    timestamp,
    data.name,
    data.phone,
    JSON.stringify(data.items),
    data.total,
    data.type,
    data.table_no   || "",
    "Pending",
    data.prebooking || 0,
    data.notes      || ""
  ]);

  return { success: true, orderId: orderId };
}

function getOrders() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("orders");
  if (!sheet) return { success: false, error: "orders sheet not found" };
  const rows    = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const headers = rows[0];
  return {
    success: true,
    data: rows.slice(1).map(r => {
      const o = {}; headers.forEach((h, i) => o[h] = r[i]); return o;
    }).filter(o => o.order_id).reverse()
  };
}

function updateOrderStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("orders");
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      sheet.getRange(i + 1, 9).setValue(data.status);
      return { success: true };
    }
  }
  return { success: false, error: "Order not found" };
}

// ── Bookings ──────────────────────────────────────────────────
function saveBooking(data) {
  const sheet     = SpreadsheetApp.openById(SHEET_ID).getSheetByName("bookings");
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const bookingId = "BKG" + Date.now();

  sheet.appendRow([
    bookingId,
    timestamp,
    data.name,
    data.phone,
    data.date,
    data.time,
    data.guests,
    "Confirmed",
    data.prebooking || 30,
    data.notes      || ""
  ]);

  return { success: true, bookingId: bookingId };
}

function getBookings() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("bookings");
  if (!sheet) return { success: false, error: "bookings sheet not found" };
  const rows    = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const headers = rows[0];
  return {
    success: true,
    data: rows.slice(1).map(r => {
      const b = {}; headers.forEach((h, i) => b[h] = r[i]); return b;
    }).filter(b => b.booking_id).reverse()
  };
}

// ── Stats ─────────────────────────────────────────────────────
function getStats() {
  const ss          = SpreadsheetApp.openById(SHEET_ID);
  const orderRows   = (ss.getSheetByName("orders")?.getDataRange().getValues() || []).slice(1);
  const bookingRows = (ss.getSheetByName("bookings")?.getDataRange().getValues() || []).slice(1);

  const totalRevenue  = orderRows.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0);
  const pendingOrders = orderRows.filter(r => r[8] === "Pending").length;
  const todayStr      = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const todayOrders   = orderRows.filter(r => String(r[1]).startsWith(todayStr)).length;

  return {
    success: true,
    data: {
      totalOrders:   orderRows.length,
      totalBookings: bookingRows.length,
      pendingOrders,
      todayOrders,
      totalRevenue:  totalRevenue.toFixed(2)
    }
  };
}

// ── Setup (run once) ──────────────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // menu sheet
  let menu = ss.getSheetByName("menu") || ss.insertSheet("menu");
  if (menu.getLastRow() === 0) {
    menu.appendRow(["id","category","name","description","price","available","image_url"]);
    menu.appendRow(["ITEM_1","Chai","Masala Chai","Adrak aur elaichi wali kadak chai",30,true,""]);
    menu.appendRow(["ITEM_2","Chai","Cutting Chai","Mumbai-style half cup strong chai",20,true,""]);
    menu.appendRow(["ITEM_3","Coffee","Filter Coffee","South Indian strong drip coffee",50,true,""]);
    menu.appendRow(["ITEM_4","Snacks","Samosa (2 pcs)","Crispy aloo stuffed samosa",30,true,""]);
    menu.appendRow(["ITEM_5","Snacks","Bread Pakoda","Bread pakoda with green chutney",40,true,""]);
    menu.appendRow(["ITEM_6","Snacks","Veg Sandwich","Grilled cheese veg sandwich",60,true,""]);
    menu.appendRow(["ITEM_7","Special","Irani Chai","Creamy Hyderabadi-style Irani chai",45,true,""]);
    menu.appendRow(["ITEM_8","Special","Paan Chai","Unique paan-flavoured tea",55,true,""]);
  }

  // prices sheet — real-time price overrides
  let prices = ss.getSheetByName("prices") || ss.insertSheet("prices");
  if (prices.getLastRow() === 0) {
    prices.appendRow(["item_id","price"]);
    prices.appendRow(["ITEM_1",30]);
    prices.appendRow(["ITEM_2",20]);
    prices.appendRow(["ITEM_3",50]);
    prices.appendRow(["ITEM_4",30]);
    prices.appendRow(["ITEM_5",40]);
    prices.appendRow(["ITEM_6",60]);
    prices.appendRow(["ITEM_7",45]);
    prices.appendRow(["ITEM_8",55]);
  }

  // orders sheet
  let orders = ss.getSheetByName("orders") || ss.insertSheet("orders");
  if (orders.getLastRow() === 0) {
    orders.appendRow(["order_id","timestamp","name","phone","items","total","type","table_no","status","prebooking","notes"]);
  }

  // bookings sheet
  let bookings = ss.getSheetByName("bookings") || ss.insertSheet("bookings");
  if (bookings.getLastRow() === 0) {
    bookings.appendRow(["booking_id","timestamp","name","phone","date","time","guests","status","prebooking_paid","notes"]);
  }

  Logger.log("✅ The Chai Junction — Sheets ready!");
}

// ── JSON helper ───────────────────────────────────────────────
function sendJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
