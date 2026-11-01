// Map with Leaflet + OpenStreetMap tiles (light use, attributed, same as info.seonukkim.com);
// falls back to a drawn SVG map when Leaflet is missing (offline venue Wi-Fi) or in preview shots.

const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// picked places get a numbered pin; the rest stay small dots so 20+ places don't bury the map
function markerIcon(L, p) {
  if (!p.state) return L.divIcon({ className: '', html: '<div class="pin-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
  return L.divIcon({ className: '', html: `<div class="pin ${p.state}"><span>${p.label}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 34] });
}

/**
 * opts: {
 *   origin: [lat, lon], full: [lat, lon] | null,
 *   pins: [{ id, at, label, state: '' | 'sel' | 'win' }],
 *   route: [[lat, lon], ...] | null,
 *   interactive, static, onPin(id)
 * }
 */
export function mountMap(el, opts) {
  if (!opts.static && window.L) return leafletMap(el, opts);
  return svgMap(el, opts);
}

function leafletMap(el, opts) {
  const L = window.L;
  const map = L.map(el, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
    dragging: !!opts.interactive,
    touchZoom: !!opts.interactive,
    doubleClickZoom: !!opts.interactive,
    boxZoom: false,
    keyboard: false,
  });
  map.attributionControl.setPrefix(false);
  L.tileLayer(TILE, { maxZoom: 19, attribution: ATTR }).addTo(map);

  const layer = L.layerGroup().addTo(map);
  function draw(o) {
    layer.clearLayers();
    const pts = [o.origin];
    if (o.route && o.route.length > 1) {
      L.polyline(o.route, { color: '#fff', weight: 9, opacity: 0.9 }).addTo(layer);
      L.polyline(o.route, { color: '#F2551D', weight: 5, opacity: 1, dashArray: '1 9', lineCap: 'round' }).addTo(layer);
      o.route.forEach((p) => pts.push(p));
    }
    for (const p of o.pins) {
      const m = L.marker(p.at, {
        icon: markerIcon(L, p),
        keyboard: false,
        zIndexOffset: p.state === 'win' ? 1000 : p.state === 'sel' ? 500 : 0,
      }).addTo(layer);
      if (o.onPin) m.on('click', () => o.onPin(p.id));
      if (!o.route) pts.push(p.at);
    }
    if (o.full) {
      L.marker(o.full, {
        icon: L.divIcon({ className: '', html: '<div class="pin full"><span>✕</span></div>', iconSize: [28, 28], iconAnchor: [14, 34] }),
        keyboard: false,
        interactive: false,
      }).addTo(layer);
    }
    L.marker(o.origin, {
      icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      keyboard: false,
      interactive: false,
      zIndexOffset: 2000,
    }).addTo(layer);
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }
  draw(opts);
  // the container may get its size after the first paint
  setTimeout(() => map.invalidateSize(), 60);
  return {
    update(o) { draw({ ...opts, ...o }); },
    destroy() { map.remove(); },
  };
}

function svgMap(el, opts) {
  function draw(o) {
    const w = el.clientWidth || 390;
    const h = el.clientHeight || 188;
    const pts = [o.origin, ...(o.route || []), ...o.pins.map((p) => p.at)];
    if (o.full) pts.push(o.full);
    const lats = pts.map((p) => p[0]);
    const lons = pts.map((p) => p[1]);
    const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const minX = Math.min(...lons) * kx, maxX = Math.max(...lons) * kx;
    const minY = -Math.max(...lats), maxY = -Math.min(...lats);
    const pad = 30;
    const s = Math.min((w - pad * 2) / Math.max(maxX - minX, 1e-6), (h - pad * 2) / Math.max(maxY - minY, 1e-6));
    const ox = (w - (maxX - minX) * s) / 2, oy = (h - (maxY - minY) * s) / 2;
    const P = (p) => [ox + (p[1] * kx - minX) * s, oy + (-p[0] - minY) * s];
    let svg = `<svg class="map-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="map">`;
    svg += `<rect width="${w}" height="${h}" fill="#EEF2F0"/>`;
    // soft street grid for context
    for (let i = 1; i < 7; i++) svg += `<line x1="0" y1="${(h / 7) * i}" x2="${w}" y2="${(h / 7) * i + 18}" stroke="#fff" stroke-width="${i % 3 ? 3 : 7}"/>`;
    for (let i = 1; i < 9; i++) svg += `<line x1="${(w / 9) * i}" y1="0" x2="${(w / 9) * i - 22}" y2="${h}" stroke="#fff" stroke-width="${i % 4 ? 3 : 7}"/>`;
    if (o.route && o.route.length > 1) {
      const d = o.route.map((p, i) => `${i ? 'L' : 'M'}${P(p)[0].toFixed(1)},${P(p)[1].toFixed(1)}`).join('');
      svg += `<path d="${d}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
      svg += `<path d="${d}" fill="none" stroke="#F2551D" stroke-width="5" stroke-dasharray="1 9" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    for (const p of [...o.pins].sort((a, b) => (a.state ? 1 : 0) - (b.state ? 1 : 0))) {
      const [x, y] = P(p.at);
      if (!p.state) {
        svg += `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#F2551D" stroke-width="2.5"/>`;
        continue;
      }
      const fill = p.state === 'win' ? '#0E9F6E' : '#F2551D';
      svg += `<g><circle cx="${x}" cy="${y}" r="11" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Pretendard Variable, sans-serif">${p.label}</text></g>`;
    }
    if (o.full) {
      const [x, y] = P(o.full);
      svg += `<g><circle cx="${x}" cy="${y}" r="11" fill="#C92A2D"/><path d="M${x - 4},${y - 4}L${x + 4},${y + 4}M${x + 4},${y - 4}L${x - 4},${y + 4}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`;
    }
    const [mx, my] = P(o.origin);
    svg += `<circle cx="${mx}" cy="${my}" r="14" fill="rgba(37,99,235,.18)"/><circle cx="${mx}" cy="${my}" r="7.5" fill="#2563EB" stroke="#fff" stroke-width="3"/>`;
    svg += `</svg>`;
    el.insertAdjacentHTML('afterbegin', svg);
    const old = el.querySelectorAll('.map-svg');
    if (old.length > 1) old[old.length - 1].remove();
  }
  draw(opts);
  return {
    update(o) { draw({ ...opts, ...o }); },
    destroy() { el.querySelectorAll('.map-svg').forEach((n) => n.remove()); },
  };
}
