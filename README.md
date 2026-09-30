# NyayChain — SIH 2026 Prototype

**Problem Statement #26190 — Secure Digital Document Management System for Legal and Investigation Documents**
**Theme — Blockchain & Cybersecurity**

A runnable demonstration prototype: single-window case lifecycle, **role-based menus for 5 roles**
(Citizen, Police, Lawyer, Judge, Admin), document hashing, a permissioned blockchain-style audit
ledger, immutable audit trail, dynamic watermarking, quorum approval, a security monitor, and a
user-management console.

## What was fixed in this build

- **Login was completely broken** — `passlib` + modern `bcrypt` throw `AttributeError: module
  'bcrypt' has no attribute '__about__'` on current bcrypt releases, so every password check
  silently failed. Password hashing was rewritten using pure-Python PBKDF2-SHA256 (stdlib
  `hashlib`), so there is no native/bcrypt build dependency at all.
- `jinja2` was used but missing from `requirements.txt`, so the server crashed on startup.
- The UI had a single flat menu for every role. It's now rebuilt with the **exact per-role menu
  structure** requested (see table below), with dedicated pages for each item.
- Added missing backend endpoints: role-scoped case/document listing, case decisions (Judgment /
  Closed with remarks), user management (list/create/delete), approve **and reject** on quorum
  requests.
- Hardened a few endpoints (missing case on upload, empty file upload, double status-update on a
  case that doesn't exist, self-deletion guard on user management).
- Full visual refresh: new navy/gold judicial theme, a custom NyayChain logo (scales of justice +
  chain-link motif), role pill in the sidebar, toasts instead of `alert()`s, nicer login screen
  with one-click demo account buttons.

## Role → Menu map (as implemented)

| Role | Menu |
|---|---|
| 👤 Citizen | Dashboard · My Cases · File Complaint · My Documents · Track Case |
| 👮 Police | Dashboard · Case Management · Evidence & Documents · Case Stage Update · Authorization Requests · Blockchain Ledger · Audit Trail · Security Monitor |
| ⚖️ Lawyer | Dashboard · My Assigned Cases · Case Documents · Request Authorization · Approval Status · Case Search |
| 👨‍⚖️ Judge | Dashboard · Assigned Cases · Evidence Review · Approval Requests · Case Decisions · Blockchain Ledger · Audit Trail |
| 🔐 Admin | Admin Dashboard · User Management · All Cases · All Documents · All Approvals · Blockchain Ledger · Audit Trail · Security Monitor |

## Run locally (Windows / macOS / Linux, VS Code or plain terminal)

**Requirements:** Python 3.10+ (3.11/3.12 also fine).

1. Unzip this project and open the folder in a terminal (or VS Code → *Open Folder*).
2. Create and activate a virtual environment:

   **Windows (PowerShell / VS Code terminal):**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

   **macOS / Linux:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
5. Open **http://127.0.0.1:8000** in your browser.

The SQLite database (`nyaychain.db`) and an `uploads/` folder are created automatically on first
run, pre-seeded with 5 demo cases and 5 demo accounts.

To reset all data, stop the server and delete `nyaychain.db` (and optionally clear `uploads/`),
then start the server again.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@demo.com` | `Citizen` |
| Police | `police@demo.com` | `Police123` |
| Lawyer | `lawyer@demo.com` | `Lawyer123` |
| Judge | `judge@demo.com` | `Judge123` |
| Admin | `admin@demo.com` | `Admin123` |

(The login screen also has one-click buttons that fill these in for you.)

## 5-minute SIH demo script

1. **Login as Citizen** → *File Complaint* → submit a new FIR → see it appear under *My Cases* →
   *Track Case* with the case ID/FIR number to show the live status timeline.
2. **Login as Police** → *Case Management* → open `NYC-2026-0001` → *Upload Document* (any
   file) → note the generated SHA-256 hash and blockchain block hash.
3. Open **Blockchain Ledger** → *Verify Blockchain* → chain shows `✓ CHAIN VALID`.
4. Open **Audit Trail** → show the `DOCUMENT_UPLOADED` entry.
5. Open the document from the case and show the dynamic watermark overlay.
6. Go to **Case Stage Update** → move the case to `Charge Sheet` → `Trial`.
7. **Login as Lawyer** → *Request Authorization* → submit a quorum request for the case.
8. **Login as Judge** → *Approval Requests* → approve it → *Case Decisions* → record a
   `Judgment` with remarks.
9. **Login as Admin** → *User Management* → add a new user → *All Cases* / *All Documents* /
   *Blockchain Ledger* to show the system-wide view.
10. Point out that every single action above created a new, hash-linked block in the ledger and a
    row in the immutable audit trail.

## Important prototype note

The blockchain is intentionally implemented as a **local permissioned blockchain-style hash
chain** (SHA-256, previous-hash linked) so the demo runs with one command and no external
services. It is **not** an actual Hyperledger Fabric deployment, and NCRB/CCTNS/NJDG are not
connected — any government-system integration shown is simulated. For a production architecture,
replace the ledger service with Hyperledger Fabric and add PostgreSQL, object storage, a SIEM,
real key management (HSM/KMS), MFA, and authorized government APIs.

## Hyperledger Fabric integration

This version includes an optional Hyperledger Fabric integration under `fabric-service/` and `chaincode/nyaychain/`. See `FABRIC_DEPLOYMENT.md` for deployment instructions. Set `FABRIC_ENABLED=true` only after the Fabric network and gateway service are running.
"# L1" 
