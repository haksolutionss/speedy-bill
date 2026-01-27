# Restaurant Billing PWA - Master Plan Using MockData only

## 🎯 App Overview and Objectives

### Purpose
A fast, keyboard-first, offline-capable Progressive Web App (PWA) for restaurant billing operations. The system enables quick order taking, kitchen communication via KOT (Kitchen Order Ticket), and bill generation with complete GST calculations.

### Core Problem Solved
Eliminates slow, mouse-dependent billing processes in a fast-paced restaurant environment. Staff can create bills, send orders to kitchen, and manage tables/parcels in 2-3 clicks using primarily keyboard navigation.

### Key Success Criteria
- Complete bill creation in under 30 seconds
- 100% keyboard navigation for billing workflow
- Works offline without internet dependency
- Thermal printer integration (80mm rolls)
- Real-time table status visibility

---

## 👥 Target Audience

### Primary Users
- Single-location establishment with one computer setup
- Staff comfortable with keyboard shortcuts and quick data entry

### User Technical Proficiency
- Basic computer literacy
- Familiarity with keyboard shortcuts (F-keys, Arrow keys, Enter)
- No advanced technical knowledge required

---

## 🎨 Platform & Deployment

### Platform
- **Progressive Web App (PWA)** - installable, works like native desktop app
- **Primary Device**: Desktop/Laptop computer
- **Browser**: Modern browsers (Chrome, Edge, Firefox)
- **Offline-First**: Must function without internet connection

### Why PWA?
- No installation complexity (just a URL)
- Automatic updates when online
- Works offline using service workers
- Can be "installed" for app-like experience
- Cross-platform compatibility

---

## ⚡ Core Features & Functionality

### Module 1: Billing Module (Full Screen)

#### Table/Parcel Selection
**Visual Elements:**
- Organized sections: MAIN HALL, GARDEN, ROOMS, etc.
- Table buttons with visual states:
  - **Available**: Green/neutral color
  - **Occupied**: Red/highlighted with bill amount indicator
- **Parcel Mode Toggle**: Prominent button at top to switch to parcel billing
- **Quick Table Search**: Input field - type table number (e.g., "101") + Enter to activate

**Keyboard Navigation:**
- Mouse click OR keyboard search to select table
- If table already occupied, show toast notification with option to open existing bill

#### Item Search & Addition
**Search Input:**
- Auto-focused on page load
- Searches both item names AND codes simultaneously
- Real-time suggestions (top 5 results)
- Matches anywhere in name (e.g., "tikka" finds "Paneer Tikka", "Chicken Tikka")

**Keyboard Flow:**
1. Type item code/name (e.g., "101" or "pan")
2. Suggestions appear in dropdown
3. ↑↓ Arrow keys to navigate
4. **Enter** to select item
5. Cursor auto-jumps to **Quantity Input** (default: 1)
6. Type new quantity or Enter to accept
7. Cursor returns to search input for next item
8. Repeat for all items

**Item Display:**
- Shows: Item Name, Portion Size (Full/Half), Qty, Price, Amount, GST%, GST Amount, Total
- Items can have notes (e.g., "extra spicy")

#### Cart Management
**Visual State:**
- **Highlighted items**: Already sent to kitchen via KOT (printed)
- **Normal items**: Not yet sent to kitchen

**Keyboard Actions in Cart:**
- Tab/Arrow keys to navigate cart items
- Edit quantity inline
- Delete item option
- Add notes to specific items

#### Bill Actions (Bottom Bar)
**Buttons with Keyboard Shortcuts:**
- **Transfer Table**: Move bill to another table
- **Merge Table**: Combine multiple table bills into one
- **Unsettled Bill**: Save bill without payment (keeps table occupied)
- **View Bill**: Preview before printing
- **Revert Old Bill**: Reopen a previously settled bill
- **Print KOT** → **F1**: Prints only NEW (unhighlighted) items to kitchen
- **Print Bill** → **F2**: Prints complete bill with all items

#### Billing Details Section
**Information Fields:**
- Table No / Token No (for parcels)
- Cover count (number of people)
- Customer Info button (optional)
- Loyalty button (optional)

**Calculation Display:**
- Sub Total
- Discount (percentage OR fixed amount) + Reason
- CGST Amount
- SGST Amount  
- Total Amount
- Final Amount (highlighted in green)

**Payment Section (on settlement):**
- Multiple payment methods: Cash, Card, UPI
- Split payment support (e.g., ₹2000 Cash + ₹1158 Card)
- Amount tendered & change calculation

#### Customer Module (Optional)
- Button: "Add Customer"
- Fields: Name, Phone Number, Email (optional)
- Loyalty tracking placeholder
- Not required to create bill - only if customer provides info

#### Parcel-Specific Features
- Token number auto-increment for each new parcel order
- No table association
- Token printed clearly on KOT and Bill

---

### Module 2: Product Management

#### Product List View
**Display:**
- Table/Grid view of all menu items
- Columns: Code, Name, Category, Portion Sizes, Base Price, GST%, Status (Active/Inactive)
- Search and filter options
- Sort by: Name, Code, Category, Price

#### Add/Edit Product Form
**Fields:**
- **Product Code**: Unique identifier (e.g., 101, 102)
- **Product Name**: Item name (e.g., "Paneer Tikka")
- **Category**: Dropdown (Starters, Main Course, Breads, Beverages, Desserts, etc.)
- **Portion Sizes**: 
  - Toggle for Full/Half/Quarter
  - Individual pricing for each portion
  - Example: Full - ₹180, Half - ₹100
- **Base Price**: Price per unit
- **GST Rate**: Dropdown (0%, 5%, 12%, 18%, 28%)
- **Description**: Optional
- **Active Status**: Toggle (hide from billing if inactive)

#### Bulk Actions
- Import products from Excel/CSV
- Export product list
- Bulk activate/deactivate
- Duplicate product (useful for creating variants)

---

### Module 3: Table/Location Management

#### Location Sections
**Structure:**
- Create sections: MAIN HALL, GARDEN, ROOMS, TERRACE, etc.
- Each section contains multiple tables
- Drag-and-drop organization (optional enhancement)

#### Table Configuration
**Per Table:**
- Table Number/ID (e.g., T1, T2, R-1)
- Section assignment
- Seating capacity (for cover count)
- Status: Active/Inactive/Maintenance

#### Visual Layout Settings
- Grid layout configuration
- Color coding preferences
- Display order within sections

#### Parcel Configuration
- Enable/Disable parcel mode
- Token number starting point
- Token prefix (e.g., "P-001", "T-001")

---

### Module 4: Bill History

#### List View
**Display Columns:**
- Bill Number (auto-generated)
- Date & Time
- Table/Token Number
- Bill Type (Table/Parcel)
- Items Count
- Total Amount
- Payment Method
- Status (Settled/Unsettled)

#### Filters & Search
- Date range picker
- Bill type: Table vs Parcel
- Status: Settled vs Unsettled
- Payment method filter
- Search by bill number, table number, customer name

#### Actions per Bill
- **View**: Open bill details in modal
- **Edit**: Reopen bill for modifications (minimum 1 item with qty 1 required)
- **Reprint**: Print KOT or Bill again
- **Delete**: Remove bill from history
- **Revert**: Change settled bill back to unsettled

#### Bulk Actions
- Export selected bills to Excel
- Print multiple bills
- Delete multiple bills

---

## 🔧 High-Level Technical Stack Recommendations

### State Management
**Recommendation: Zustand or React Context + Hooks**
- **Why**: Lightweight, perfect for offline-first apps
- Simple API, easy to persist to localStorage
- Zustand has built-in persistence middleware

**Alternative**: Redux Toolkit (if app grows significantly complex)

### Offline & Data Storage
**Recommendation: IndexedDB via Dexie.js**
- **Why**: 
  - Larger storage capacity than localStorage (50MB+ vs 5-10MB)
  - Structured queries for bill history filtering
  - Better performance for large datasets
  - Works seamlessly offline
- localStorage as fallback for settings

### PWA & Service Workers
**Recommendation: Workbox (by Google)**
- **Why**: Simplifies service worker creation
- Automatic caching strategies
- Background sync for eventual data backup
- Offline page support

### Print Integration
**Recommendation: Browser Print API + Custom Thermal Templates**
- **Why**: 
  - Uses native browser print dialog
  - CSS `@media print` for 80mm thermal styling
  - Direct LAN printer access via browser
  - Separate print windows for KOT vs Bill

**Technical Approach:**
- Create print-optimized HTML templates (80mm width)
- Use `window.print()` with targeted stylesheets
- KOT template: Minimal (Table/Token, Item, Qty)
- Bill template: Detailed (Full itemization, GST breakdown, totals)

### Keyboard Navigation
**Recommendation: Custom Hooks + Keyboard Event Listeners**
- React hooks for global keyboard shortcuts (F1, F2, etc.)
- Arrow key navigation in suggestion lists
- Tab/Shift+Tab for form field navigation
- Enter key for primary actions

### Backup & Export
**Recommendation: SheetJS (xlsx) + File System Access API**
- **Why**:
  - Export data to Excel format easily
  - JSON export for complete data backup
  - Import functionality for data restoration
  - Browser-native file download

---
## 🎓 Mock Data Structure for Phase 1

### Sample Tables (20 tables across 3 sections)
**MAIN HALL**: T1, T2, T3, T4, T5, T6
**GARDEN**: T7, T8, T9, T10, T11
**ROOMS**: R-1, R-2, R-3

### Sample Products (30 items across categories)

**Starters (5 items)**
- Paneer Tikka (Code: 101) - Full: ₹180, Half: ₹100
- Chicken Tikka (Code: 102) - Full: ₹220, Half: ₹120
- Veg Spring Roll (Code: 103) - ₹140
- Fish Tikka (Code: 104) - ₹250
- Mushroom Tikka (Code: 105) - Full: ₹160, Half: ₹90

**Main Course (8 items)**
- Paneer Butter Masala (Code: 201) - Full: ₹240, Half: ₹130
- Chicken Curry (Code: 202) - Full: ₹260, Half: ₹140
- Dal Makhani (Code: 203) - Full: ₹180, Half: ₹100
- Fish Curry (Code: 204) - ₹280
- Mutton Rogan Josh (Code: 205) - ₹320
- Veg Kolhapuri (Code: 206) - ₹200
- Egg Curry (Code: 207) - ₹160
- Mix Veg (Code: 208) - ₹180

**Breads (5 items)**
- Roti (Code: 301) - ₹15
- Butter Naan (Code: 302) - ₹40
- Garlic Naan (Code: 303) - ₹50
- Paratha (Code: 304) - ₹35
- Kulcha (Code: 305) - ₹45

**Rice (3 items)**
- Plain Rice (Code: 401) - ₹120
- Jeera Rice (Code: 402) - ₹140
- Veg Biryani (Code: 403) - ₹180

**Beverages (5 items)**
- Masala Chai (Code: 501) - ₹30
- Coffee (Code: 502) - ₹40
- Fresh Lime Soda (Code: 503) - ₹50
- Lassi (Code: 504) - ₹60
- Soft Drink (Code: 505) - ₹40

**Desserts (4 items)**
- Gulab Jamun (Code: 601) - ₹80
- Ice Cream (Code: 602) - ₹90
- Ras Malai (Code: 603) - ₹100
- Kheer (Code: 604) - ₹70

### Sample Bills (10 historical bills)
Mix of table and parcel bills, settled and unsettled, various items and payment methods.

### Sample Customers (5 customers)
Name, phone, email, loyalty points for testing customer association feature.



## 📝 Notes & Assumptions

- Phase 1 uses **mock data** - no real transactions
- Single computer setup - no multi-user concurrency
- No user authentication in Phase 1
- All GST rates configurable per product
- Parcel token starts at 1 and increments
- Bill numbers auto-increment (format: BILL-0001, BILL-0002)
- Minimum order: 1 item with quantity 1
- No time-based session management (bills stay open until settled/unsettled)
- Print relies on browser print dialog (native OS drivers)

---


## 🚀 Future Expansion Possibilities (Post Phase 1)

### Phase 2: Cloud & Multi-Device
- Cloud backup to Google Drive/Dropbox
- Multi-device sync (tablets for waiters)
- Real-time table status sync
- Mobile app version (React Native)

### Phase 3: Advanced Features
- Reports & Analytics dashboard
- Daily/Monthly sales reports
- Best-selling items analysis
- Payment method breakdown
- Staff performance tracking (with RBAC)

### Phase 4: Kitchen Display System
- Separate KDS screen for kitchen
- Order status tracking (Preparing → Ready → Served)
- Estimated preparation time per dish
- Color-coded urgency indicators

### Phase 5: Customer-Facing Features
- QR code menu ordering
- Customer feedback system
- Loyalty points redemption
- Digital receipt via email/SMS
- Online ordering integration

### Phase 6: Inventory Management
- Raw material stock tracking
- Recipe management (ingredient breakdown)
- Low stock alerts
- Vendor management
- Purchase order generation

### Phase 7: Advanced Integrations
- Accounting software integration (Tally, QuickBooks)
- Payment gateway integration (online payments)
- SMS notifications for parcel readiness
- WhatsApp order confirmations
- Delivery platform integration (Swiggy, Zomato)

----
