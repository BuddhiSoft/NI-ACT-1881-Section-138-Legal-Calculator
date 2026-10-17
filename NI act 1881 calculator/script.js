/* =========================================================
   NI ACT 1881
   SECTION 138 LIMITATION CALCULATOR
   ========================================================= */


   const $ = id => document.getElementById(id);


   /* =========================================================
      FIELDS (in the order the steps happen)
      ========================================================= */
   
   const FIELDS = [
       { id: "chequeDate",       label: "Date of Cheque" },
       { id: "presentationDate", label: "Date of Presentation" },
       { id: "dishonourDate",    label: "Date of Intimation of Dishonour" },
       { id: "noticeDate",       label: "Date of Notice Issued / Sent" },
       { id: "servedDate",       label: "Date of Notice Served" },
       { id: "filingDate",       label: "Date of Filing Complaint" }
   ];
   
   const fieldLabel = id => FIELDS.find(f => f.id === id).label;
   
   const servedDateRow = $("servedDateRow");
   const presumptionDateRow = $("presumptionDateRow");
   const presumptionDate = $("presumptionDate");
   
   const resultBox = $("resultBox");
   const resultTitle = $("resultTitle");
   const resultDetail = $("resultDetail");
   
   
   /* =========================================================
      DATE FUNCTIONS
      ========================================================= */
   
   /*
       Convert DD-MM-YYYY into a JavaScript Date.
       Returns null for anything that is not a real calendar date
       (for example 31-02-2025).
   */
   
   function parseDate(value) {
   
       if (!value) {
           return null;
       }
   
       const parts = value.trim().split("-");
   
       if (parts.length !== 3) {
           return null;
       }
   
       const day = Number(parts[0]);
       const month = Number(parts[1]);
       const year = Number(parts[2]);
   
       if (
           !Number.isInteger(day) ||
           !Number.isInteger(month) ||
           !Number.isInteger(year)
       ) {
           return null;
       }
   
       if (year < 1000 || year > 9999 || month < 1 || month > 12) {
           return null;
       }
   
       const date = new Date(year, month - 1, day);
   
       if (
           date.getFullYear() !== year ||
           date.getMonth() !== month - 1 ||
           date.getDate() !== day
       ) {
           return null;
       }
   
       date.setHours(0, 0, 0, 0);
   
       return date;
   }
   
   
   function formatDate(date) {
   
       if (!date || isNaN(date.getTime())) {
           return "";
       }
   
       const day = String(date.getDate()).padStart(2, "0");
       const month = String(date.getMonth() + 1).padStart(2, "0");
       const year = date.getFullYear();
   
       return `${day}-${month}-${year}`;
   }
   
   
   function addDays(date, days) {
   
       const result = new Date(date);
   
       result.setDate(result.getDate() + days);
   
       return result;
   }
   
   
   /*
       Calendar-month addition (31 Jan + 1 month = 28/29 Feb).
   */
   
   function addMonths(date, months) {
   
       const result = new Date(date);
   
       const originalDay = result.getDate();
   
       result.setDate(1);
   
       result.setMonth(result.getMonth() + months);
   
       const lastDay = new Date(
           result.getFullYear(),
           result.getMonth() + 1,
           0
       ).getDate();
   
       result.setDate(Math.min(originalDay, lastDay));
   
       return result;
   }
   
   
   /*
       -1 = first before second, 0 = same day, 1 = first after second
   */
   
   function compareDates(a, b) {
   
       const first = new Date(a);
       const second = new Date(b);
   
       first.setHours(0, 0, 0, 0);
       second.setHours(0, 0, 0, 0);
   
       if (first < second) return -1;
       if (first > second) return 1;
   
       return 0;
   }
   
   
   /* =========================================================
      SERVED / PRESUMPTION MODE
      ========================================================= */
   
   function getServiceType() {
   
       const selected = document.querySelector(
           'input[name="serviceType"]:checked'
       );
   
       return selected ? selected.value : "served";
   }
   
   
   function applyServiceType() {
   
       const served = getServiceType() === "served";
   
       servedDateRow.classList.toggle("hidden", !served);
       presumptionDateRow.classList.toggle("hidden", served);
   }
   
   
   /* =========================================================
      VALIDATION
      ========================================================= */
   
   /*
       1. A complete date (10 characters) must be a real date.
       2. Dates must follow the real order of events:
   
           Cheque -> Presentation -> Dishonour -> Notice sent
           -> Notice served
   
          A later step can never be earlier than the step before it,
          and the complaint can never be filed before the notice
          was issued.
   
       Back-dated entries are rejected with a message and are left
       out of the calculation until they are corrected.
   */
   
   const state = {
       dates: {},
       errors: {}
   };
   
   
   function validateDates() {
   
       const mode = getServiceType();
   
       const dates = {};
       const errors = {};
   
   
       FIELDS.forEach(field => {
   
           dates[field.id] = null;
   
           if (field.id === "servedDate" && mode !== "served") {
               return;
           }
   
           const value = $(field.id).value.trim();
   
           if (value.length === 10) {
   
               const parsed = parseDate(value);
   
               if (parsed) {
                   dates[field.id] = parsed;
               } else {
                   errors[field.id] =
                       "Invalid date. Please enter a real calendar date as DD-MM-YYYY.";
               }
           }
       });
   
   
       function checkOrder(id, earlierIds) {
   
           if (!dates[id] || errors[id]) {
               return;
           }
   
           /* nearest earlier step that has a valid date */
   
           for (let i = earlierIds.length - 1; i >= 0; i--) {
   
               const previousId = earlierIds[i];
   
               if (dates[previousId] && !errors[previousId]) {
   
                   if (compareDates(dates[id], dates[previousId]) < 0) {
   
                       const typed = $(id).value;
                       const previousTyped = $(previousId).value;
   
                       errors[id] =
                           "Not possible: " + fieldLabel(id) +
                           " (" + typed + ") cannot be earlier than " +
                           fieldLabel(previousId) +
                           " (" + previousTyped + "). Enter a date on or after " +
                           previousTyped + ".";
                   }
   
                   return;
               }
           }
       }
   
   
       const chain = [
           "chequeDate",
           "presentationDate",
           "dishonourDate",
           "noticeDate"
       ];
   
       if (mode === "served") {
           chain.push("servedDate");
       }
   
       chain.forEach((id, index) => {
           checkOrder(id, chain.slice(0, index));
       });
   
       checkOrder("filingDate", [
           "chequeDate",
           "presentationDate",
           "dishonourDate",
           "noticeDate"
       ]);
   
   
       /* rejected dates are not used in any calculation */
   
       Object.keys(errors).forEach(id => {
           dates[id] = null;
       });
   
       state.dates = dates;
       state.errors = errors;
   }
   
   
   function renderErrors() {
   
       FIELDS.forEach(field => {
   
           const input = $(field.id);
           const message = state.errors[field.id] || "";
   
           $(field.id + "Error").textContent = message;
   
           input.classList.toggle("input-error", !!message);
   
           input.setAttribute(
               "aria-invalid",
               message ? "true" : "false"
           );
       });
   }
   
   
   /* =========================================================
      CALCULATION
      ========================================================= */
   
   /*
       Cheque validity endpoint   = cheque date + 3 months
       Notice deadline            = dishonour intimation + 30 days
       Presumption date           = notice issued/sent + 30 days
       Service date               = notice served date, or presumption date
       15-day payment endpoint    = service date + 15 days
       Cause of action            = after the payment endpoint
       Complaint endpoint         = cause of action date + 1 month
   */
   
   function compute() {
   
       const d = state.dates;
   
       const result = {
           chequeEnd: null,
           noticeDeadline: null,
           presumption: null,
           service: null,
           paymentEnd: null,
           cause: null,
           complaintEnd: null
       };
   
       if (d.chequeDate) {
           result.chequeEnd = addMonths(d.chequeDate, 3);
       }
   
       if (d.dishonourDate) {
           result.noticeDeadline = addDays(d.dishonourDate, 30);
       }
   
       if (d.noticeDate) {
           result.presumption = addDays(d.noticeDate, 30);
       }
   
       result.service =
           getServiceType() === "served"
               ? d.servedDate
               : result.presumption;
   
       if (result.service) {
   
           result.paymentEnd = addDays(result.service, 15);
   
           result.cause = result.paymentEnd;
   
           result.complaintEnd = addMonths(result.cause, 1);
       }
   
       return result;
   }
   
   
   /*
       Every rule that has been broken.
   */
   
   function getBreaches(c) {
   
       const d = state.dates;
   
       const breaches = [];
   
       if (
           d.presentationDate &&
           c.chequeEnd &&
           compareDates(d.presentationDate, c.chequeEnd) > 0
       ) {
           breaches.push(
               "Cheque was presented after its three-month validity period (ended " +
               formatDate(c.chequeEnd) + ") — Section 138(a)."
           );
       }
   
       if (
           d.noticeDate &&
           c.noticeDeadline &&
           compareDates(d.noticeDate, c.noticeDeadline) > 0
       ) {
           breaches.push(
               "Notice was issued after the 30-day period from information of dishonour (deadline " +
               formatDate(c.noticeDeadline) + ") — Section 138(b)."
           );
       }
   
       if (
           d.filingDate &&
           c.paymentEnd &&
           compareDates(d.filingDate, c.paymentEnd) <= 0
       ) {
           breaches.push(
               "Complaint is premature: it was filed on or before the 15-day payment endpoint (" +
               formatDate(c.paymentEnd) +
               "), so the drawer still had time to pay — Section 138(c)."
           );
       }
   
       if (
           d.filingDate &&
           c.complaintEnd &&
           compareDates(d.filingDate, c.complaintEnd) > 0
       ) {
           breaches.push(
               "Complaint was filed after the one-month limitation (ended " +
               formatDate(c.complaintEnd) +
               ") — Section 142(1)(b). The delay can be condoned only if the Court finds sufficient cause."
           );
       }
   
       return breaches;
   }
   
   
   /* =========================================================
      RENDER: CHEQUE / PRESUMPTION
      ========================================================= */
   
   function renderDerivedFields(c) {
   
       $("chequeValidityDate").textContent =
           c.chequeEnd ? formatDate(c.chequeEnd) : "—";
   
       presumptionDate.value =
           c.presumption ? formatDate(c.presumption) : "";
   }
   
   
   /* =========================================================
      RENDER: RESULT
      ========================================================= */
   
   function setResult(kind, title, lines, keyDates) {
   
       resultBox.className = "result-box result-" + kind;
   
       resultTitle.textContent = title;
   
       resultDetail.textContent = "";
   
       (lines || []).forEach(text => {
   
           const line = document.createElement("div");
   
           line.className = "result-line";
   
           line.textContent = text;
   
           resultDetail.appendChild(line);
       });
   
       if (keyDates && keyDates.length) {
   
           const row = document.createElement("div");
   
           row.className = "result-dates";
   
           keyDates.forEach((item, index) => {
   
               if (index > 0) {
                   row.appendChild(document.createTextNode(" • "));
               }
   
               row.appendChild(
                   document.createTextNode(item.label + ": ")
               );
   
               const strong = document.createElement("strong");
   
               strong.textContent = formatDate(item.date);
   
               row.appendChild(strong);
           });
   
           row.appendChild(document.createTextNode("."));
   
           resultDetail.appendChild(row);
       }
   }
   
   
   function setIdleResult() {
   
       resultBox.className = "result-box result-idle";
   
       resultTitle.textContent = "";
   
       resultDetail.textContent = "";
   
       resultDetail.appendChild(
           document.createTextNode("Enter the dates and click ")
       );
   
       const strong = document.createElement("strong");
   
       strong.textContent = "Calculate Limitation";
   
       resultDetail.appendChild(strong);
   
       resultDetail.appendChild(document.createTextNode("."));
   }
   
   
   function renderResult(c, forced) {
   
       const filing = state.dates.filingDate;
   
       /* back-dated or invalid entries */
   
       if (Object.keys(state.errors).length > 0) {
   
           setResult(
               "warning",
               "Please correct the highlighted dates.",
               [
                   "A later step cannot come before an earlier step. The calculation continues once the dates are in order."
               ]
           );
   
           return;
       }
   
       /* not enough information yet */
   
       if (!c.service || !filing) {
   
           if (forced) {
   
               setResult(
                   "warning",
                   "Please complete the required dates.",
                   [
                       "Enter the notice served date (or the notice issued / sent date for presumption) and the date of filing complaint."
                   ]
               );
   
           } else {
   
               setIdleResult();
           }
   
           return;
       }
   
   
       const keyDates = [];
   
       if (c.noticeDeadline) {
           keyDates.push({ label: "Notice deadline", date: c.noticeDeadline });
       }
   
       keyDates.push(
           { label: "15-day payment endpoint", date: c.paymentEnd },
           { label: "Cause of action", date: c.cause },
           { label: "One-month complaint endpoint", date: c.complaintEnd }
       );
   
   
       const breaches = getBreaches(c);
   
       if (breaches.length === 0) {
   
           setResult(
               "green",
               "✓ Complaint is within limitation.",
               [],
               keyDates
           );
   
       } else {
   
           setResult(
               "red",
               "✕ Complaint does not meet the Section 138 / 142 requirements.",
               breaches,
               keyDates
           );
       }
   }
   
   
   /* =========================================================
      RENDER: TIMELINE
      ========================================================= */
   
   function setStepStatus(span, status) {
   
       const step = span.parentElement;
   
       step.classList.remove("step-ok", "step-bad");
   
       if (status === "ok") {
           step.classList.add("step-ok");
       } else if (status === "bad") {
           step.classList.add("step-bad");
       }
   }
   
   
   function renderTimeline(c) {
   
       const d = state.dates;
       const e = state.errors;
   
       const spans = {
           cheque: $("timelineCheque"),
           presentation: $("timelinePresentation"),
           dishonour: $("timelineDishonour"),
           notice: $("timelineNotice"),
           service: $("timelineService"),
           complaint: $("timelineComplaint")
       };
   
       const served = getServiceType() === "served";
   
   
       spans.cheque.textContent = $("chequeDate").value || "—";
       spans.presentation.textContent = $("presentationDate").value || "—";
       spans.dishonour.textContent = $("dishonourDate").value || "—";
       spans.notice.textContent = $("noticeDate").value || "—";
       spans.complaint.textContent = $("filingDate").value || "—";
   
       spans.service.textContent = served
           ? ($("servedDate").value || "—")
           : (presumptionDate.value || "—");
   
   
       /* 1. CHEQUE */
   
       setStepStatus(
           spans.cheque,
           e.chequeDate ? "bad" : (d.chequeDate ? "ok" : null)
       );
   
   
       /* 2. PRESENTATION - within cheque validity */
   
       if (e.presentationDate) {
   
           setStepStatus(spans.presentation, "bad");
   
       } else if (d.presentationDate && c.chequeEnd) {
   
           setStepStatus(
               spans.presentation,
               compareDates(d.presentationDate, c.chequeEnd) <= 0 ? "ok" : "bad"
           );
   
       } else {
   
           setStepStatus(spans.presentation, null);
       }
   
   
       /* 3. DISHONOUR */
   
       setStepStatus(
           spans.dishonour,
           e.dishonourDate ? "bad" : (d.dishonourDate ? "ok" : null)
       );
   
   
       /* 4. NOTICE - within 30 days of dishonour */
   
       if (e.noticeDate) {
   
           setStepStatus(spans.notice, "bad");
   
       } else if (d.noticeDate && c.noticeDeadline) {
   
           setStepStatus(
               spans.notice,
               compareDates(d.noticeDate, c.noticeDeadline) <= 0 ? "ok" : "bad"
           );
   
       } else {
   
           setStepStatus(spans.notice, null);
       }
   
   
       /* 5. SERVICE */
   
       if (served && e.servedDate) {
   
           setStepStatus(spans.service, "bad");
   
       } else {
   
           setStepStatus(spans.service, c.service ? "ok" : null);
       }
   
   
       /* 6. COMPLAINT - after payment endpoint, within one month */
   
       if (e.filingDate) {
   
           setStepStatus(spans.complaint, "bad");
   
       } else if (d.filingDate && c.paymentEnd) {
   
           setStepStatus(
               spans.complaint,
               (
                   compareDates(d.filingDate, c.paymentEnd) > 0 &&
                   compareDates(d.filingDate, c.complaintEnd) <= 0
               ) ? "ok" : "bad"
           );
   
       } else {
   
           setStepStatus(spans.complaint, null);
       }
   }
   
   
   /* =========================================================
      MAIN UPDATE
      ========================================================= */
   
   function update(forced) {
   
       validateDates();
   
       renderErrors();
   
       const c = compute();
   
       renderDerivedFields(c);
   
       renderResult(c, forced === true);
   
       renderTimeline(c);
   }
   
   
   /* =========================================================
      DATE INPUT FORMATTING
      ========================================================= */
   
   /*
       Typing 21062025 becomes 21-06-2025
   */
   
   function formatDateInput(event) {
   
       let value = event.target.value.replace(/\D/g, "");
   
       if (value.length > 8) {
           value = value.substring(0, 8);
       }
   
       if (value.length >= 5) {
   
           value =
               value.substring(0, 2) + "-" +
               value.substring(2, 4) + "-" +
               value.substring(4);
   
       } else if (value.length >= 3) {
   
           value =
               value.substring(0, 2) + "-" +
               value.substring(2);
       }
   
       event.target.value = value;
   
       update();
   }
   
   
   document
       .querySelectorAll(".date-input:not([readonly])")
       .forEach(input => {
   
           input.addEventListener("input", formatDateInput);
       });
   
   
   document
       .querySelectorAll('input[name="serviceType"]')
       .forEach(radio => {
   
           radio.addEventListener("change", function () {
   
               applyServiceType();
   
               update();
           });
       });
   
   
   /* =========================================================
      ACTION BUTTONS
      ========================================================= */
   
   $("calculateBtn").addEventListener("click", function () {
   
       update(true);
   });
   
   
   $("resetBtn").addEventListener("click", function () {
   
       document
           .querySelectorAll(".date-input:not([readonly])")
           .forEach(input => {
               input.value = "";
           });
   
       document.querySelector(
           'input[name="serviceType"][value="served"]'
       ).checked = true;
   
       applyServiceType();
   
       update();
   });
   
   
   $("exampleBtn").addEventListener("click", function () {
   
       $("chequeDate").value = "01-10-2025";
       $("presentationDate").value = "24-10-2025";
       $("dishonourDate").value = "25-10-2025";
       $("noticeDate").value = "26-10-2025";
       $("servedDate").value = "29-10-2025";
       $("filingDate").value = "11-12-2025";
   
       document.querySelector(
           'input[name="serviceType"][value="presumption"]'
       ).checked = true;
   
       applyServiceType();
   
       update(true);
   });
   
   
   $("printBtn").addEventListener("click", function () {
   
       window.print();
   });
   
   
   /* =========================================================
      FONT SIZE CONTROLS
      ========================================================= */
   
   let fontScale = 1;
   
   function applyFontScale() {
   
       document.documentElement.style.fontSize = `${fontScale}em`;
   }
   
   $("fontPlus").addEventListener("click", function () {
   
       fontScale = Math.min(fontScale + 0.08, 1.25);
   
       applyFontScale();
   });
   
   $("fontNormal").addEventListener("click", function () {
   
       fontScale = 1;
   
       applyFontScale();
   });
   
   $("fontMinus").addEventListener("click", function () {
   
       fontScale = Math.max(fontScale - 0.08, 0.85);
   
       applyFontScale();
   });
   
   
   /* =========================================================
      MOBILE MENU
      ========================================================= */
   
   const menuToggle = $("menuToggle");
   const mobileMenu = $("mobileMenu");
   
   function setMenu(open) {
   
       mobileMenu.classList.toggle("open", open);
   
       menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
   
       menuToggle.setAttribute(
           "aria-label",
           open ? "Close menu" : "Open menu"
       );
   }
   
   menuToggle.addEventListener("click", function (event) {
   
       event.stopPropagation();
   
       setMenu(!mobileMenu.classList.contains("open"));
   });
   
   mobileMenu.querySelectorAll("a").forEach(link => {
   
       link.addEventListener("click", function () {
           setMenu(false);
       });
   });
   
   document.addEventListener("click", function (event) {
   
       if (!mobileMenu.contains(event.target)) {
           setMenu(false);
       }
   });
   
   document.addEventListener("keydown", function (event) {
   
       if (event.key === "Escape") {
           setMenu(false);
       }
   });
   
   
   /* =========================================================
      INITIAL STATE
      ========================================================= */
   
   document.addEventListener("DOMContentLoaded", function () {
   
       applyServiceType();
   
       update();
   });