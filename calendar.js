// Simple rental calendar with consecutive days + delivery calculator
const occupied = {
  '2026-10-22': true,
  '2026-10-23': true,
  '2026-10-28': true,
  '2026-11-05': true,
  '2026-11-06': true,
  '2026-11-12': true
};

const LUEBECK = { lat: 53.8655, lon: 10.6866 };

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function initCalendar(containerId, pricePerDay, priceFrom5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let current = new Date();
  current.setDate(1);
  let selected = [];

  function isConsecutive(arr) {
    if (arr.length <= 1) return true;
    const sorted = arr.map(d => new Date(d)).sort((a,b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const diff = (sorted[i] - sorted[i-1]) / (1000*60*60*24);
      if (diff !== 1) return false;
    }
    return true;
  }

  function render() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;

    let html = `
      <div class="cal-header">
        <button type="button" onclick="changeMonth(-1)">‹</button>
        <strong>${current.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" onclick="changeMonth(1)">›</button>
      </div>
      <div class="cal-grid">
        ${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
    `;

    for (let i = 0; i < startOffset; i++) html += '<div></div>';

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = date.toISOString().slice(0,10);
      let cls = 'cal-day';
      if (date < today) cls += ' past';
      else if (occupied[iso]) cls += ' occupied';
      else if (selected.includes(iso)) cls += ' selected';

      html += `<div class="${cls}" data-date="${iso}" onclick="toggleDate('${iso}')">${d}</div>`;
    }
    html += '</div>';

    const days = selected.length;
    let total = 0;
    if (days > 0) {
      const rate = days >= 5 ? priceFrom5 : pricePerDay;
      total = days * rate;
    }

    html += `
      <div class="price-box">
        Ausgewählte Tage: <strong>${days}</strong> ${days > 0 ? '(zusammenhängend)' : ''}<br>
        ${days >= 5 ? 'Langzeitpreis (ab 5 Tagen)' : 'Tagespreis'}: ${days >= 5 ? priceFrom5 : pricePerDay} €<br>
        <strong>Maschinenmiete: ${total} € inkl. MwSt.</strong><br>
        <small>Kaution: 500 € (wird bei Rückgabe zurückerstattet)</small>
      </div>
      <input type="hidden" id="selected-dates" value="${selected.join(',')}">
    `;

    container.innerHTML = html;
  }

  window.changeMonth = (delta) => {
    current.setMonth(current.getMonth() + delta);
    render();
  };

  window.toggleDate = (iso) => {
    if (occupied[iso]) return;
    const date = new Date(iso);
    if (date < new Date().setHours(0,0,0,0)) return;

    const idx = selected.indexOf(iso);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(iso);
      if (!isConsecutive(selected)) {
        selected = [iso]; // start new range
      }
    }
    // Always keep only a consecutive block
    if (selected.length > 1 && !isConsecutive(selected)) {
      selected = [iso];
    }
    selected.sort();
    render();
  };

  render();
}

function initDelivery() {
  const box = document.getElementById('delivery-box');
  if (!box) return;

  box.innerHTML = `
    <h3 style="margin-bottom:12px;">Lieferung & Abholung</h3>
    <label><input type="checkbox" id="want-delivery"> Lieferung und Abholung wünschen</label>
    <div id="delivery-calc" style="margin-top:16px; display:none;">
      <p style="margin-bottom:8px;">Adresse für Lieferung / Abholung eingeben:</p>
      <input type="text" id="customer-address" placeholder="Straße, PLZ Ort" style="width:100%; margin-bottom:10px;">
      <button type="button" class="btn" onclick="geocodeAddress()">Entfernung berechnen</button>
      <div id="delivery-result" style="margin-top:12px; font-weight:500;"></div>
    </div>
  `;

  document.getElementById('want-delivery').addEventListener('change', function() {
    document.getElementById('delivery-calc').style.display = this.checked ? 'block' : 'none';
  });
}

window.geocodeAddress = async () => {
  const address = document.getElementById('customer-address').value.trim();
  if (!address) {
    alert('Bitte eine Adresse eingeben.');
    return;
  }
  const resultDiv = document.getElementById('delivery-result');
  resultDiv.innerHTML = 'Berechne Entfernung…';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Deutschland')}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Maschinenzwerg-Rental' } });
    const data = await res.json();
    if (!data || !data.length) {
      resultDiv.innerHTML = 'Adresse nicht gefunden. Bitte genauer eingeben (Straße, PLZ, Ort).';
      return;
    }
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    const km = haversine(lat, lon, LUEBECK.lat, LUEBECK.lon);
    let price = km <= 10 ? 35 : 35 + Math.ceil(km - 10) * 2;
    resultDiv.innerHTML = `
      Gefundene Adresse: ${data[0].display_name}<br>
      Entfernung zum Lübecker Zentrum: ca. ${km.toFixed(1)} km<br>
      <strong>Lieferung + Abholung: ${price} € inkl. MwSt.</strong>
    `;
  } catch (e) {
    resultDiv.innerHTML = 'Fehler bei der Berechnung. Bitte Internetverbindung prüfen oder Adresse genauer eingeben.';
  }
};
