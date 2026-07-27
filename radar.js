(() => {
  const AEP = { lat: -34.5592, lon: -58.4156 };
  const API = `https://opendata.adsb.fi/api/v3/lat/${AEP.lat}/lon/${AEP.lon}/dist/100`;
  const status = document.getElementById('radarStatus');
  const count = document.getElementById('radarCount');
  const updated = document.getElementById('radarUpdated');
  const search = document.getElementById('radarSearch');
  const refreshBtn = document.getElementById('radarRefresh');
  const mapEl = document.getElementById('radarMap');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map('radarMap', { zoomControl: true }).setView([AEP.lat, AEP.lon], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  L.circleMarker([AEP.lat, AEP.lon], { radius: 7, weight: 2, fillOpacity: .9 })
    .addTo(map).bindPopup('<strong>Aeroparque Jorge Newbery (AEP)</strong>');

  const layer = L.layerGroup().addTo(map);
  let aircraft = [];
  let loading = false;

  const feet = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value)).toLocaleString('es-AR')} ft` : 'Sin dato';
  const knots = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value))} kt` : 'Sin dato';
  const safe = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function draw() {
    const query = (search?.value || '').trim().toUpperCase();
    layer.clearLayers();
    const visible = aircraft.filter(a => {
      const key = `${a.flight || ''} ${a.r || ''} ${a.hex || ''}`.toUpperCase();
      return !query || key.includes(query);
    });

    visible.forEach(a => {
      const lat = Number(a.lat), lon = Number(a.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const heading = Number(a.track) || 0;
      const icon = L.divIcon({
        className: 'plane-marker',
        html: `<div style="transform:rotate(${heading}deg)">✈</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const callsign = (a.flight || '').trim() || a.r || a.hex || 'Aeronave';
      const popup = `<strong>${safe(callsign)}</strong><br>${safe(a.r || 'Matrícula sin dato')}<br>Altitud: ${feet(a.alt_baro)}<br>Velocidad: ${knots(a.gs)}<br>Rumbo: ${Math.round(heading)}°`;
      L.marker([lat, lon], { icon }).addTo(layer).bindPopup(popup);
    });
    count.textContent = `${visible.length} aeronaves visibles`;
  }

  async function loadRadar() {
    if (loading) return;
    loading = true;
    status.textContent = 'Actualizando radar…';
    refreshBtn.disabled = true;
    try {
      const response = await fetch(API, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      aircraft = Array.isArray(data.ac) ? data.ac : Array.isArray(data.aircraft) ? data.aircraft : [];
      draw();
      const now = new Date();
      status.textContent = 'Radar activo';
      updated.textContent = `Actualizado ${now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`;
    } catch (error) {
      status.textContent = 'No se pudo cargar el radar';
      count.textContent = 'Probá nuevamente en unos segundos';
      console.error(error);
    } finally {
      refreshBtn.disabled = false;
      loading = false;
    }
  }

  search?.addEventListener('input', draw);
  refreshBtn?.addEventListener('click', loadRadar);
  loadRadar();
  setInterval(loadRadar, 30000);
})();