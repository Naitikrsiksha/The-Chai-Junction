// ============================================================
//  config.js — The Chai Junction — SIRF YAHAN CHANGES KARO
// ============================================================

const CAFE_CONFIG = {
  // ── Backend ─────────────────────────────────────────────────
  // 🔁 Apps Script deploy karne ke baad URL yahan daalo
  SCRIPT_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",

  // ── Cafe Info ────────────────────────────────────────────────
  CAFE_NAME:    "The Chai Junction",
  CAFE_TAGLINE: "Har Ghoont Mein Ghar Ka Ehsaas",
  CAFE_PHONE:   "YOUR_PHONE_NUMBER",
  CAFE_EMAIL:   "hello@chaijunction.in",
  CAFE_ADDRESS: "YOUR_ADDRESS",
  CAFE_HOURS:   "Mon–Sun: 7:00 AM – 10:00 PM",

  // ── Payment (UPI ID backend me chhupa hua hai — yahan nahi) ─
  // UPI ID Apps Script ke Code.gs me store hota hai
  // Yahan sirf display name hai
  UPI_NAME: "The Chai Junction",
  CURRENCY: "₹",

  // ── Pre-booking Charge ────────────────────────────────────────
  // Table booking pe lagega, food-only order pe nahi
  PREBOOKING_CHARGE: 30,
  PREBOOKING_LABEL:  "Pre-booking Confirmation",

  // ── Admin ────────────────────────────────────────────────────
  // 🔒 Yeh password zaroor change karo!
  ADMIN_PASSWORD: "chaiadmin2024",

  // ── Tables ───────────────────────────────────────────────────
  TOTAL_TABLES: 12,

  // ── Rate Limiting ─────────────────────────────────────────────
  // Ek submission ke baad kitne seconds wait karein
  RATE_LIMIT_SECONDS: 30,
};
