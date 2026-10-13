/* South African public charger map.
   Data: Open Charge Map (https://openchargemap.org), CC BY 4.0 and the original data providers.
   Shows every public site, split into AC and DC fast charging. */
(function () {
  "use strict";
  var el = document.getElementById("charger-map");
  if (!el) return;
  var KEY = (window.OHMPERE_CONFIG && window.OHMPERE_CONFIG.ocmKey) || "";
  var statusEl = document.getElementById("map-status");
  var countEl = document.getElementById("map-count");

  if (!KEY || typeof L === "undefined") {
    el.classList.add("is-embed");
    el.innerHTML = '<iframe title="Open Charge Map: public EV chargers" src="https://map.openchargemap.io/?mode=embedded&latitude=-33.89&longitude=18.63" allow="geolocation" loading="lazy"></iframe>';
    if (statusEl) statusEl.textContent = "Showing Open Charge Map's own map.";
    document.querySelectorAll(".map-filters input").forEach(function (i) { i.disabled = true; });
    return;
  }

  var DC_TYPES = { 2: 1, 27: 1, 32: 1, 33: 1, 1039: 1, 1040: 1 }; // CHAdeMO, Tesla SC, CCS1, CCS2, GB/T DC
  function isDc(c) { return c.CurrentTypeID === 30 || DC_TYPES[c.ConnectionTypeID] || (c.PowerKW && c.PowerKW >= 40); }
  var STATUS = { 0: "Status unknown", 50: "Reported working", 75: "Partly working", 100: "Reported not working", 150: "Planned", 200: "Removed" };

  var map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([-29.0, 25.0], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Charger data <a href="https://openchargemap.org">Open Charge Map</a> (CC BY 4.0) and data providers'
  }).addTo(map);
  el.addEventListener("click", function () { map.scrollWheelZoom.enable(); }, { once: true });

  var layers = { ac: L.layerGroup().addTo(map), dc: L.layerGroup().addTo(map) };
  var all = [];

  function icon(kind, ok) {
    return L.divIcon({
      className: "pin pin-" + kind + (ok ? "" : " pin-off"),
      html: "<span></span>",
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function render() {
    var onlyOk = document.getElementById("f-ok").checked;
    var showAc = document.getElementById("f-ac").checked;
    var showDc = document.getElementById("f-dc").checked;
    layers.ac.clearLayers(); layers.dc.clearLayers();
    var n = 0, dcN = 0;
    all.forEach(function (s) {
      if (onlyOk && !s.ok) return;
      if (s.dc && showDc) { s.marker.addTo(layers.dc); n++; dcN++; }
      else if (!s.dc && showAc) { s.marker.addTo(layers.ac); n++; }
    });
    if (countEl) countEl.textContent = n + " sites shown, " + dcN + " with DC fast charging.";
  }

  var base = "https://api.openchargemap.io/v3/";
  Promise.all([
    fetch(base + "referencedata/?key=" + encodeURIComponent(KEY)).then(function (r) { return r.json(); }),
    fetch(base + "poi/?output=json&countrycode=ZA&maxresults=5000&compact=true&verbose=false&key=" + encodeURIComponent(KEY)).then(function (r) { return r.json(); })
  ]).then(function (res) {
    var ref = res[0], pois = res[1];
    var ops = {}, prov = {}, ctypes = {};
    (ref.ConnectionTypes || []).forEach(function (c) { ctypes[c.ID] = c.Title; });
    (ref.Operators || []).forEach(function (o) { ops[o.ID] = o.Title; });
    (ref.DataProviders || []).forEach(function (d) { prov[d.ID] = d.Title; });

    pois.forEach(function (p) {
      var a = p.AddressInfo || {};
      if (!a.Latitude || !a.Longitude) return;
      var conns = p.Connections || [];
      var dc = conns.some(isDc);
      var st = p.StatusTypeID == null ? 0 : p.StatusTypeID;
      if (st === 150 || st === 200) return;
      var ok = st === 50 || st === 75 || st === 0;
      var rows = conns.map(function (c) {
        var t = (ctypes[c.ConnectionTypeID] || "Connector") + (isDc(c) ? " (DC)" : " (AC)");
        return "<li>" + (c.Quantity ? c.Quantity + " × " : "") + t + (c.PowerKW ? ", " + Math.round(c.PowerKW) + " kW" : "") + "</li>";
      }).join("") || "<li>Connector details not listed</li>";
      var town = [a.AddressLine1, a.Town].filter(Boolean).join(", ");
      var html = "<strong>" + esc(a.Title) + "</strong>" +
        (town ? "<div>" + esc(town) + "</div>" : "") +
        (ops[p.OperatorID] ? "<div class=pop-op>" + esc(ops[p.OperatorID]) + "</div>" : "") +
        "<ul>" + rows + "</ul>" +
        "<div class='pop-st st-" + st + "'>" + STATUS[st] + (p.DateLastStatusUpdate ? " · updated " + esc(p.DateLastStatusUpdate.slice(0, 10)) : "") + "</div>" +
        "<a href='https://www.google.com/maps/dir/?api=1&destination=" + a.Latitude + "," + a.Longitude + "' target='_blank' rel='noopener'>Directions</a>" +
        (prov[p.DataProviderID] ? "<div class=pop-src>Source: " + esc(prov[p.DataProviderID]) + "</div>" : "");
      var m = L.marker([a.Latitude, a.Longitude], { icon: icon(dc ? "dc" : "ac", ok), title: a.Title }).bindPopup(html, { maxWidth: 260 });
      all.push({ marker: m, dc: dc, ok: ok });
    });
    if (statusEl) statusEl.textContent = "Live from Open Charge Map.";
    render();
  }).catch(function () {
    if (statusEl) statusEl.textContent = "The charger data couldn't load. Refresh the page to try again.";
  });

  document.querySelectorAll(".map-filters input").forEach(function (i) { i.addEventListener("change", render); });
})();
