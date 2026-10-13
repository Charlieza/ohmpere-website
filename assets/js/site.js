/* Ohmpere site behaviour: menu, charge estimator, contact form. */
(function () {
  "use strict";

  /* ---------- mobile menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      var p = toggle.querySelector("path");
      if (p) p.setAttribute("d", open ? "M4 4L22 22M22 4L4 22" : "M2 7H24M2 13H24M2 19H24");
    };
    toggle.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); toggle.focus(); } });
  }

  /* ---------- charge estimator ---------- */
  var form = document.getElementById("calc-form");
  if (form) {
    var KWH_PER_KM = 0.17;      // 17 kWh per 100 km
    var AC_EFF = 0.9;           // AC charging losses
    var AC_BAY = 22;            // kW at the bay
    var DC_AVG_TO_80 = 75;      // average kW from low charge to 80%
    var DC_AVG_ABOVE_80 = 25;   // average kW above 80%

    var $ = function (id) { return document.getElementById(id); };
    var mins = $("mins"), minsOut = $("mins-out"), soc = $("soc"), socOut = $("soc-out");
    var battery = $("battery"), onboard = $("onboard");

    var fmtMins = function (m) {
      if (m < 60) return m + " min";
      var h = Math.floor(m / 60), r = m % 60;
      return r ? h + " h " + r + " min" : h + (h === 1 ? " hour" : " hours");
    };

    var energyAdded = function (type, minutes, B, s0, acLimit) {
      var t = minutes / 60;
      var room = B * (1 - s0);
      if (type === "ac") {
        var p = Math.min(AC_BAY, acLimit) * AC_EFF;
        return { kwh: Math.min(p * t, room), minsToFull: room / p * 60 };
      }
      var to80 = Math.max(0, 0.8 * B - s0 * B);
      var t80 = to80 / DC_AVG_TO_80;
      var kwh;
      if (t <= t80) kwh = DC_AVG_TO_80 * t;
      else kwh = to80 + Math.min(DC_AVG_ABOVE_80 * (t - t80), room - to80);
      var full = (t80 + (room - to80) / DC_AVG_ABOVE_80) * 60;
      return { kwh: Math.min(kwh, room), minsToFull: full };
    };

    var update = function () {
      var m = +mins.value;
      var s0 = +soc.value / 100;
      var B = +battery.value;
      var L = +onboard.value;
      var type = form.querySelector('input[name="charger"]:checked').value;
      minsOut.textContent = fmtMins(m);
      socOut.textContent = Math.round(s0 * 100) + "%";

      var r = energyAdded(type, m, B, s0, L);
      var km = Math.round(r.kwh / KWH_PER_KM / 5) * 5;
      var s1 = Math.min(1, s0 + r.kwh / B);
      $("r-km").textContent = km;

      var sub;
      if (s1 >= 0.995) {
        sub = "Full before you're back: about " + fmtMins(Math.max(5, Math.round(r.minsToFull / 5) * 5)) + " to 100%.";
      } else {
        sub = Math.round(r.kwh) + " kWh in " + fmtMins(m) + ". Your battery goes from " + Math.round(s0 * 100) + "% to " + Math.round(s1 * 100) + "%.";
      }
      $("r-sub").textContent = sub;

      var other = energyAdded(type === "ac" ? "dc" : "ac", m, B, s0, L);
      var okm = Math.round(other.kwh / KWH_PER_KM / 5) * 5;
      $("r-compare").innerHTML = type === "ac"
        ? "On a DC fast charger the same stop adds about <strong>" + okm + " km</strong>. AC suits longer stops and costs less to install, which is why most hub bays are AC."
        : "On a 22 kW AC bay the same stop adds about <strong>" + okm + " km</strong>. DC is for short stops; above 80% it slows down to protect the battery.";

      var inner = "(100% - 8px)";
      $("b-start").style.width = "calc(" + inner + " * " + s0.toFixed(3) + ")";
      $("b-add").style.left = "calc(4px + " + inner + " * " + s0.toFixed(3) + ")";
      $("b-add").style.width = "calc(" + inner + " * " + (s1 - s0).toFixed(3) + ")";
    };

    form.addEventListener("change", function (e) {
      if (e.target.name === "stop") mins.value = e.target.value;
      update();
    });
    mins.addEventListener("input", function () {
      var match = form.querySelector('input[name="stop"][value="' + mins.value + '"]');
      form.querySelectorAll('input[name="stop"]').forEach(function (r) { r.checked = r === match; });
      update();
    });
    soc.addEventListener("input", update);
    update();
  }

  /* ---------- contact form: compose an email ---------- */
  var cf = document.getElementById("contact-form");
  if (cf) {
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = document.getElementById("form-error");
      var name = cf.elements.name.value.trim();
      var email = cf.elements.email.value.trim();
      var site = cf.elements.site.value.trim();
      var msg = cf.elements.message.value.trim();
      var who = cf.querySelector('input[name="who"]:checked').value;
      var missing = [];
      if (!name) missing.push("your name");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push("a valid email address");
      if (!msg) missing.push("a message");
      if (missing.length) {
        err.textContent = "Add " + missing.join(", ").replace(/, ([^,]*)$/, " and $1") + " so we can reply.";
        var first = !name ? cf.elements.name : (!email || missing.indexOf("a valid email address") > -1) ? cf.elements.email : cf.elements.message;
        first.focus();
        return;
      }
      err.textContent = "";
      var to = cf.getAttribute("data-to");
      var subject = "Website enquiry: " + who + (site ? " (" + site + ")" : "");
      var body = msg + "\n\n" + name + "\n" + email + (site ? "\n" + site : "") + "\n\nSent from ohmpere.com";
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
