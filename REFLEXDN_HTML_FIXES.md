# ReflexDN HTML Fixes – "Make Perfect" Checklist

Use this guide to correct the pasted ReflexDN patient-view and patient-list HTML/JS.

**Automated script:** Save your HTML as `reflexdn-patient-view.html` and/or `reflexdn-patient-list.html` in the project root, then run:
```bash
node scripts/apply-reflexdn-fixes.js
```
Output is written to `*.fixed.html`. The script applies typos, invalid `</input>` removal, modal close fix, tooth 45 value, and duplicate `btn-tp-1` in Treatment_edit. **Unique checkbox IDs** (e.g. `t-18`, `t-17`) still need a manual pass or a second script if you rely on IDs.

---

## 1. Typos (text and IDs)

| Find | Replace | Notes |
|------|---------|--------|
| Cheif | Chief | Labels: "C/C Cheif Complaint" |
| chife_Complaint | chief_Complaint | Modal IDs, class names, JS selectors |
| chife_complaint | chief_complaint | URL paths, form actions |
| Helpatics | Hepatitis | Label in Medical History / Update Patient modal |
| Bleeding discorder | Bleeding disorder | Label (modal) |
| Ohter | Other | Type dropdown option (patient list) |

Use case-sensitive replace so "Chief" in modal titles becomes "Chief" and IDs stay consistent (e.g. `#chief_Complaint` not `#chife_Complaint`).

---

## 2. Invalid HTML

- **Remove stray `</input>`:**  
  `<input type="radio" ... /><label>...</label></input>` → remove the closing `</input>`.  
  Correct pattern:  
  `<input type="radio" name="tooth-selector" id="radio1" value="Permanent Teeth" checked><label for="radio1">Permanent Teeth</label>`

- **Tooth selector block:**  
  In both "Permanent Teeth" and "Deciduous Teeth" blocks, delete any `</input>` that appears after the `<label>`.

---

## 3. Duplicate IDs (must be unique)

- **Tooth checkboxes:**  
  Every `<input type="checkbox" ... class="select t">` has `id="t"`.  
  Use unique IDs, e.g. `id="t-18"`, `id="t-17"`, … `id="t-11"`, and same for 21–28, 31–38, 41–48, and deciduous.  
  If you use only `name="t"` for form submission, you can remove `id` or set `id="t-{toothNumber}"` for each.

- **Treatment Edit modal:**  
  Two elements use `id="btn-tp-1"` (one in Treatment_tools modal, one in Treatment_edit).  
  In the **Treatment_edit** modal, change the checkbox/label pair to e.g. `id="btn-tp-edit-1"` and `for="btn-tp-edit-1"`.

---

## 4. Wrong checkbox value (tooth 45)

- **Lower Right – tooth 45:**  
  The checkbox has `value="46"` but the label is "45".  
  Change to:  
  `<input type="checkbox" id="t-45" name="t" value="45" ...>`

---

## 5. Modal close buttons (Bootstrap 5)

- **Chief Complaint list modal:**  
  Close button uses `data-bs-toggle="modal" data-bs-target="#exampleModal_1"`.  
  There is no `#exampleModal_1` in the page.  
  Use:  
  `data-bs-dismiss="modal" aria-label="Close"`  
  so the modal closes correctly.

- **Other modals** that use `data-bs-target="#exampleModal_1"` for close:  
  Use `data-bs-dismiss="modal"` instead so they close the current modal.

---

## 6. Delete Treatment Plan – AJAX method

- **Form:**  
  Uses `method="POST"` with `_method` value "delete" (method override).  
  **jQuery:**  
  Uses `type: 'DELETE'`.  
  Many backends expect POST with `_method=delete`; if yours does, change the AJAX to:  
  `type: 'POST'`  
  and keep the form as-is so `_method` is sent. If the backend expects DELETE, keep `type: 'DELETE'` and ensure the route accepts DELETE.

---

## 7. Optional improvements

- **Accessibility:**  
  Give inputs that have no visible label an `aria-label` (e.g. close button, icon-only buttons).

- **Consistency:**  
  Use either `data-bs-dismiss="modal"` or `data-bs-toggle="modal" data-bs-target="#…"` for closing; prefer `data-bs-dismiss="modal"` for the modal’s own close button.

- **Duplicate option values:**  
  In Investigation select, some options have `value="X-ray"` for different tests (e.g. OPG, CBCT). Use unique `value` per option (e.g. `value="OPG"`) so submitted data is correct.

---

## 8. Quick find/replace order

1. Replace all **Cheif** → **Chief** (and chife_ → chief_ for IDs/classes/URLs as needed).
2. **Helpatics** → **Hepatitis**, **Bleeding discorder** → **Bleeding disorder**, **Ohter** → **Other**.
3. Remove every `</input>` that follows a radio’s `<label>`.
4. Give each tooth checkbox a unique `id` (e.g. `t-18`, `t-17`, …).
5. Fix Lower Right tooth 45 checkbox `value` to `45`.
6. In Treatment_edit modal, change the duplicate `btn-tp-1` to `btn-tp-edit-1` (and matching `for`).
7. Replace Chief Complaint (and any other) modal close from `data-bs-toggle="modal" data-bs-target="#exampleModal_1"` to `data-bs-dismiss="modal"`.
8. Align Delete TP AJAX `type` with your backend (POST with `_method` or DELETE).

After these changes, the HTML and JS should be valid, consistent, and “perfect” for the ReflexDN patient-view and patient-list pages.
