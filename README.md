# ☕ AN Cafe Web App — Complete Setup Guide

## 📁 Folder Structure

```
cafe-app/
│
├── index.html          → Home / Landing page
├── menu.html           → Full menu with category filter & cart
├── order.html          → Online order form + table booking
├── admin.html          → Admin dashboard (password protected)
│
├── css/
│   └── style.css       → All styles (shared across all pages)
│
├── js/
│   ├── config.js       ⚙️  SETTINGS FILE — sirf yahan changes karo
│   ├── main.js         → Navbar, toast, API helpers (shared)
│   ├── menu.js         → Menu page logic (load items, cart)
│   ├── order.js        → Order & booking form submissions
│   └── admin.js        → Admin dashboard logic
│
└── apps-script/
    └── Code.gs         → Google Apps Script backend (deploy as Web App)
```

---

## 🚀 Setup Steps (10 minutes)

### Step 1 — Google Sheet banao

1. **Google Sheets** kholo → New spreadsheet banao
2. Name dete hain: `AN Cafe Data`
3. URL se **Sheet ID** copy karo:
   ```
   https://docs.google.com/spreadsheets/d/YAHAN_WALA_PART/edit
   ```

### Step 2 — Apps Script deploy karo

1. Sheet me: **Extensions → Apps Script** kholo
2. `Code.gs` ki saari content paste karo
3. Line 9 pe `YOUR_GOOGLE_SHEET_ID_HERE` apne ID se badlo
4. **Save** karo (Ctrl+S)
5. Pehle ek baar `setupSheets()` function run karo (3 sheets + sample data create hoga)
6. **Deploy → New Deployment** karo:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **Deploy** karo → URL copy karo (looks like: `https://script.google.com/macros/s/.../exec`)

### Step 3 — config.js update karo

`js/config.js` open karo aur apni details daalo:

```javascript
SCRIPT_URL: "https://script.google.com/macros/s/YOUR_ID/exec",  // Step 2 se
CAFE_NAME: "AN Cafe",
CAFE_PHONE: "+91 98765 43210",
UPI_ID: "ancafe@upi",
ADMIN_PASSWORD: "apna_password_yahan",  // Change this!
TOTAL_TABLES: 12,
```

### Step 4 — Done! 🎉

Files ko kisi bhi hosting pe upload karo:
- **GitHub Pages** (free) — most recommended
- **Netlify** (free)
- **Any web server**

---

## 📊 Google Sheet Structure (auto-created by setupSheets)

### Sheet: `menu`
| id | category | name | description | price | available | image_url |
|---|---|---|---|---|---|---|

### Sheet: `orders`
| order_id | timestamp | name | phone | email | items | total | type | table_no | status | notes |
|---|---|---|---|---|---|---|---|---|---|---|

### Sheet: `bookings`
| booking_id | timestamp | name | phone | email | date | time | guests | status | notes |
|---|---|---|---|---|---|---|---|---|---|

---

## 🔐 Admin Panel

- URL: `yoursite.com/admin.html`
- Default password: `ancafe2024` (config.js me badlo!)
- Features: Stats overview, Orders management, Bookings list, Status update

---

## 📱 Pages

| Page | URL | Kya karta hai |
|---|---|---|
| Home | `/index.html` | Landing, about, featured menu |
| Menu | `/menu.html` | Full menu, category filter, cart |
| Order | `/order.html` | Order form + table booking |
| Admin | `/admin.html` | Password protected dashboard |

---

## 💡 Tips

- Menu items add karne ke liye: Google Sheet ke `menu` tab me directly add karo
- `available` column `FALSE` karo toh item menu se hide ho jayega
- Order status admin panel se update karo (Pending → Preparing → Ready → Delivered)
- UPI ID config.js me set karo — order page pe automatically show hoga

---

Made with ☕ for AN Cafe, Buxar

