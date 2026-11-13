/* Ohmpere surveys: residents' survey (survey.html) and HoA building questionnaire (building.html).
   Answers are posted to a Google Apps Script web app that writes them to a Google Sheet.
   The web app URL goes in assets/js/config.js as surveyEndpoint. */
(function () {
  "use strict";
  var CFG = window.OHMPERE_CONFIG || {};
  var ENDPOINT = CFG.surveyEndpoint || "";

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function params() { var o = {}; location.search.replace(/^\?/, "").split("&").forEach(function (p) { if (!p) return; var kv = p.split("="); o[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " ")); }); return o; }

  /* ---------- share kit (building page) ---------- */
  var kitName = $("#kit-name");
  if (kitName) {
    var kitLink = $("#kit-link"), kitMsg = $("#kit-msg"), kitWa = $("#kit-wa"), copyMsg = $(".copy-msg");
    var due = new Date(Date.now() + 14 * 864e5).toLocaleDateString("en-ZA", { day: "numeric", month: "long" });
    var renderKit = function () {
      var name = kitName.value.trim();
      var link = "https://ohmpere.com/survey.html" + (name ? "?b=" + encodeURIComponent(name).replace(/%20/g, "+") : "");
      var where = name || "our complex";
      var msg = "Hello neighbours,\n\n" +
        "The trustees are looking at adding electric vehicle charging bays at " + where + ". Ohmpere would pay for, install and run them, at no cost to the body corporate. Before we decide, we'd like to hear from every household, including those without an electric car.\n\n" +
        "The survey takes about five minutes and is anonymous:\n" + link + "\n\n" +
        "Please fill it in by " + due + ". Thank you.";
      kitLink.value = link;
      kitMsg.value = msg;
      kitWa.href = "https://wa.me/?text=" + encodeURIComponent(msg);
    };
    kitName.addEventListener("input", renderKit);
    renderKit();
    $all("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        var el = document.getElementById(b.getAttribute("data-copy"));
        var done = function () { copyMsg.textContent = (el.id === "kit-link" ? "Link" : "Message") + " copied."; };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(el.value).then(done, function () { el.select(); document.execCommand("copy"); done(); });
        } else { el.select(); document.execCommand("copy"); done(); }
      });
    });
  }

  /* ---------- forms ---------- */
  var form = $("form.survey");
  if (!form) return;
  var kind = form.getAttribute("data-form");
  var msgEl = $(".form-msg", form);

  if (kind === "residents") {
    var b = params().b;
    if (b) { var c = $("#complex"); c.value = b; }
  }

  // Conditional questions: data-show-if="field=value1|value2" or "field=*" (any answer)
  function valueOf(name) {
    var els = $all('[name="' + name + '"]', form);
    if (!els.length) return [];
    if (els[0].type === "radio" || els[0].type === "checkbox") return els.filter(function (e) { return e.checked; }).map(function (e) { return e.value; });
    return els[0].value.trim() ? [els[0].value.trim()] : [];
  }
  function applyConditions() {
    $all("[data-show-if]", form).forEach(function (el) {
      var rule = el.getAttribute("data-show-if").split("=");
      var vals = valueOf(rule[0]);
      var want = rule[1] === "*" ? null : rule[1].split("|");
      var show = want ? vals.some(function (v) { return want.indexOf(v) > -1; }) : vals.length > 0;
      el.hidden = !show;
      if (!show) $all("input, textarea, select", el).forEach(function (i) { if (i.type === "radio" || i.type === "checkbox") i.checked = false; else i.value = ""; });
    });
  }
  form.addEventListener("change", applyConditions);
  form.addEventListener("input", function (e) { if (e.target.type === "email") applyConditions(); });
  applyConditions();

  function visible(el) { return !el.closest("[hidden]"); }
  function setErr(holder, on) { var e = $(".q-err", holder); if (e) e.hidden = !on; holder.classList.toggle("has-err", on); }

  function validate() {
    var firstBad = null;
    var mark = function (holder, bad) { setErr(holder, bad); if (bad && !firstBad) firstBad = holder; };
    $all("input[required], textarea[required]", form).forEach(function (i) {
      if (!visible(i)) return;
      var holder = i.closest(".two-q > div") || i.closest(".q");
      var bad = !i.value.trim() || (i.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()));
      mark(holder, bad);
    });
    $all("fieldset[data-required]", form).forEach(function (f) {
      if (!visible(f)) return;
      mark(f, !$all("input", f).some(function (i) { return i.checked; }));
    });
    $all("fieldset[data-max]", form).forEach(function (f) {
      if (!visible(f)) return;
      var n = $all("input:checked", f).length;
      mark(f, n > +f.getAttribute("data-max"));
    });
    $all('input[type="email"]:not([required])', form).forEach(function (i) {
      var holder = i.closest(".q");
      mark(holder, !!i.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()));
    });
    var consentErr = $(".consent-err", form);
    if (consentErr) {
      var consent = $('input[name="consent"]', form);
      var needs = consent.hasAttribute("data-must") || (visible(consent) && !!(form.elements.email && form.elements.email.value.trim()));
      var bad = needs && !consent.checked;
      consentErr.hidden = !bad;
      if (bad && !firstBad) firstBad = consent.closest("label");
    }
    return firstBad;
  }

  // Clear a question's error as soon as it gets an answer
  function clearErr(e) {
    var holder = e.target.closest(".two-q > div") || e.target.closest(".q");
    if (holder && holder.classList.contains("has-err") && !holder.hasAttribute("data-max")) setErr(holder, false);
    if (e.target.name === "consent" || e.target.name === "email") { var ce = $(".consent-err", form); if (ce) ce.hidden = true; }
  }
  form.addEventListener("input", clearErr);
  form.addEventListener("change", clearErr);

  // Limit "choose up to three" live, with a gentle message
  $all("fieldset[data-max]", form).forEach(function (f) {
    f.addEventListener("change", function () { setErr(f, $all("input:checked", f).length > +f.getAttribute("data-max")); });
  });

  function collect() {
    var data = { form: kind, submitted_at: new Date().toISOString() };
    $all("input, textarea, select", form).forEach(function (i) {
      if (!i.name || i.name === "website" || !visible(i)) return;
      if (i.type === "radio") { if (i.checked) data[i.name] = i.value; return; }
      if (i.type === "checkbox") { if (i.checked) data[i.name] = data[i.name] ? data[i.name] + "; " + i.value : i.value; return; }
      if (i.value.trim()) data[i.name] = i.value.trim();
    });
    return data;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msgEl.textContent = "";
    var bad = validate();
    if (bad) {
      msgEl.textContent = "Some answers are missing. They're marked above.";
      bad.scrollIntoView({ behavior: "smooth", block: "center" });
      var f = $("input, textarea", bad); if (f) f.focus({ preventScroll: true });
      return;
    }
    var finish = function () {
      form.hidden = true;
      var done = $("#survey-done");
      done.hidden = false;
      done.focus();
      window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 120 });
    };
    if (form.elements.website && form.elements.website.value) { finish(); return; } // bot trap
    if (!ENDPOINT) {
      msgEl.textContent = "The survey isn't accepting answers yet. Please try again later, or email hello@ohmpere.com.";
      return;
    }
    var btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = "Sending…";
    var body = new URLSearchParams({ form: kind, payload: JSON.stringify(collect()) });
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: body })
      .then(finish)
      .catch(function () {
        btn.disabled = false; btn.textContent = kind === "building" ? "Send building details" : "Send my answers";
        msgEl.textContent = "Your answers didn't send. Check your connection and press the button again.";
      });
  });
})();
