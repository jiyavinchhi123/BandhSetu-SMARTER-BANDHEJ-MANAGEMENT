# BandhSetu — Artisan & Business Operations User Guide

Welcome to **BandhSetu**, the management application designed for Bandhej (Bandhani) manufacturing clusters in Gujarat (Jamnagar, Bhuj, Mandvi, Anjar, and surrounding artisan villages).

---

## 1. User Roles & Accounts

There are only **two** administrative roles:

### 1.1 Owner / Administrator
- **Access**: 24/7 anytime from any device.
- **Key Responsibilities**:
  - Full business visibility across all artisans, consignments, quality reports, and financial ledgers.
  - Adding and updating Catalogue Item prices.
  - Creating Manager accounts.
  - Controlling Manager operating hours (e.g. 09:00 AM to 08:00 PM IST).
  - Manually locking or unlocking Manager accounts during emergencies.
  - Auditing security logs and financial reversals.

### 1.2 Workshop Manager / Authorized Operator
- **Access**: Restricted to business hours (**09:00 AM – 08:00 PM IST** by default).
- **Key Responsibilities**:
  - Daily registration of artisan women.
  - Giving fabric work (issuing consignments).
  - Inspecting and receiving returned tying work.
  - Recording cash advances and wage payouts.
  - Generating daily delivery and collection summaries.
- **Restrictions**:
  - Automatically logged out and blocked at 08:00 PM IST.
  - Cannot promote accounts to Admin or modify operating hours.
  - Cannot unlock own account if locked by Owner.

> **Note**: Women artisans doing Bandhej knotting **do not log in**. Their master ledger is managed by the business.

---

## 2. Daily Operational Workflows

### 2.1 Registering a New Artisan Worker
1. Tap **Add Worker** on the Dashboard or navigate to **Artisan Workers** $\to$ **Register Artisan**.
2. Enter the artisan's **Full Name**, **Mobile Number**, **City / Town** (e.g. *Bhuj* or *Mandvi*), and **Village** (e.g. *Dhamadka*, *Khavda*, *Varsamedi*).
3. The system automatically issues a permanent sequential identifier: `WRK-0001`, `WRK-0002`, etc.
4. Serial numbers are strictly unique and **never reused**, even if an artisan becomes inactive.

### 2.2 Finding an Artisan (Fast Search)
1. Use the search bar at the top or in the **Artisan Workers** directory.
2. Search supports dynamic partial typing:
   - Typing `R` instantly filters to *Rekhaben*, *Ranjanben*, *Rupalben*.
   - Typing a village name (e.g. `Khavda`) displays all artisans in that village.
   - Typing phone digits (e.g. `98250`) locates the artisan's contact.
3. Tap on any artisan's card to open her **7-Tab Profile**:
   - *Personal Details*
   - *Material Ledger*
   - *Work Distribution*
   - *Work Returns*
   - *Earnings & Money Ledger*
   - *Advances & Payments*
   - *Complete Transaction History*

---

### 2.3 Giving Work (Material Consignment)
1. Tap **Give Work** on the Dashboard or go to **Work Batches** $\to$ **Give Work**.
2. Select the **Date** (defaults to today in IST).
3. Select the **Artisan** (search by name or serial number).
4. Select the **Fabric Item** from the searchable dropdown:
   - Typing `R` reveals matching sarees/dupattas.
   - The tying rate per piece is automatically fetched from the catalogue (e.g., $\text{₹220.00}$).
5. Enter the **Number of Pieces Given** (e.g., $10$ sarees).
6. Select the **Knot Style** (*Ekdali*, *Bharti*, *Shikari*, *Jaal*, *Kodi*).
7. Select the **Estimated Due Date** (defaults to 14 days).
8. Click **Issue Consignment**:
   - The system generates a unique batch code: `DIST-YYYYMMDD-XXXX`.
   - **Historical Price Protection**: The unit rate is permanently saved on the consignment. If the Owner updates the catalogue price later, this consignment's rate will never change.
   - **Material Ledger**: A **DEBIT** entry for $10$ pieces is posted to the artisan's material account.
   - **Wage Balance**: Remains $\text{₹0.00}$. Giving fabric does **not** create wages.

---

### 2.4 Receiving Completed Work & Quality QC
When the artisan brings back tied pieces:
1. Tap **Receive Work** on the Dashboard or go to **Work Batches** $\to$ **Receive Work**.
2. Search and select the artisan. The screen displays all her open consignments with pending pieces.
3. Select the original distribution batch.
4. Enter the inspection count:
   - **Accepted Pieces**: Completed pieces passing quality inspection.
   - **Rejected Pieces**: Defective pieces with broken knots, torn fabric, dye bleed, or loose knotting.
   - Select the **Rejection Reason** and optional notes.
5. Click **Record Work Return**:
   - Unique return ID is generated: `RET-YYYYMMDD-XXXX`.
   - **Partial Returns**: If $10$ pieces were given and the artisan returns $5$, the remaining $5$ pieces stay open on the batch.
   - **Wage Calculation**:
     $$\text{Earned Wages} = \text{Accepted Pieces} \times \text{Snapshot Rate}$$
     Rejected pieces generate $\text{₹0.00}$ wage.
   - **Double-Entry Posting**:
     - *Material Credit*: Accepted + Rejected pieces credited back to the material ledger.
     - *Money Credit*: Earned wage amount credited to the artisan's Money Ledger.

---

### 2.5 Giving an Advance (Cash / UPI)
Artisans frequently request advances for festivals, school fees, or emergencies:
1. Tap **Record Advance** on the Dashboard or go to **Wages & Payouts** $\to$ **Record Advance**.
2. Select the artisan. Her current payable balance is displayed immediately.
3. Enter the **Amount** (e.g., $\text{₹500.00}$).
4. Select the **Payment Mode** (*Cash*, *UPI*, *Bank Transfer*).
5. Enter reference number or notes (e.g. *Diwali advance*).
6. Click **Save Advance**:
   - The advance is posted as a **DEBIT** in the Money Ledger.
   - Her payable balance is reduced accordingly.

---

### 2.6 Making a Wage Payout / Settlement
When paying wages:
1. Tap **Make Payment** on the Dashboard or go to **Wages & Payouts** $\to$ **Make Payment**.
2. Select the artisan to view her net balance:
   $$\text{Payable Balance} = \text{Total Earned Wages} - \text{Advances Taken} - \text{Previous Payouts}$$
3. Choose **Partial Payment** (enter specific amount) or check **Full Settlement** (auto-fills exact remaining balance).
4. Enter payment mode and transaction reference (e.g. Bank UTR / Cheque number).
5. The system guards against duplicate payments:
   - Rejects previously recorded reference numbers.
   - Blocks accidental double-clicks within 30 seconds.
6. Click **Disburse Payment**:
   - Posts a **DEBIT** entry to the Money Ledger.
   - Updates the artisan's outstanding balance.

---

## 3. Reports & Analytics

Access all 10 specialized reports from the **Reports & Analytics** menu:

1. **Worker-Wise Report**: Comprehensive matrix of pieces given, returned, wages, advances, and outstanding balance for every artisan.
2. **Item Design Performance**: Completion volume and tying expenditure grouped by fabric item.
3. **Daily Work Distribution**: Material dispatches grouped by day.
4. **Daily Returns & Quality QC**: Daily accepted vs. rejected pieces and defect ratios.
5. **Pending Work Report**: List of all fabric currently in artisan custody, highlighting overdue batches.
6. **Daily Wages**: Wage accruals created from accepted piece returns.
7. **Advances Register**: Complete log of all cash and UPI advances.
8. **Payments Register**: Wage disbursement history.
9. **Outstanding Balances**: Priority roster of artisans with pending wage balances.
10. **Monthly Business Summary**: Executive monthly rollup of fabric flow and wage disbursement.

### Filtering & Exporting
- **Period Presets**: Click *Today*, *Yesterday*, *This Week*, *This Month*, *All Time*, or pick a *Custom Range*.
- **Download Excel / CSV**: Click **Export Excel / CSV** for instant spreadsheet download.
- **Print / PDF View**: Click **Print / PDF View** to generate clean printable invoices and collection sheets without UI buttons.

---

## 4. Manager Access Control (Admin Only)

The Owner can manage Manager operating hours:
1. Go to **Manager Access** in the sidebar.
2. **Emergency Lock**: Click **Lock Immediately** to instantly revoke all active manager sessions.
3. **Unlock**: Click **Unlock** to restore regular scheduled access.
4. **Change Working Hours**: Adjust access times (e.g. from 09:00–20:00 to 08:00–21:00 IST).
5. **Grant Extension**: Add 30, 60, or 120 minutes of overtime for urgent batch dispatches.
6. **Security Audit Trail**: Inspect all login events, blocked attempts, and manager actions with exact IST timestamps.
