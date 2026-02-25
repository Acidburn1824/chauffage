/**
 * Widget Planning Chauffage v1.0
 * Carte Lovelace - Vue globale toutes zones avec sélecteur de jour
 * Style: dark tech / home automation
 */

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const CHUNK_SIZE = 240;

const ZONES_CONFIG = {
  sejour:   { label: 'Séjour',    icon: '🛋️', entity_base: 'input_text.schedule_sejour',   sensor: 'sensor.schedule_sejour_consigne',        temp_sensor: 'sensor.tdeg_salon_temperature' },
  parents:  { label: 'Parents',   icon: '🛏️', entity_base: 'input_text.schedule_parents',  sensor: 'sensor.schedule_parents_consigne',       temp_sensor: 'sensor.tdeg_chambre_parents_temperature' },
  aureline: { label: 'Auréline',  icon: '🌸', entity_base: 'input_text.schedule_aureline', sensor: 'sensor.schedule_aureline_consigne',      temp_sensor: 'sensor.tdeg_aureline_temperature' },
  sdb:      { label: 'SDB',       icon: '🚿', entity_base: 'input_text.schedule_sdb',      sensor: 'sensor.schedule_sdb_etage_consigne',     temp_sensor: null },
};

const DEFAULT_CONFIGS = {
  sejour: {
    temp_defaut: 16, temp_confort: 19.5,
    plages: [
      { id:1, label:'Matin semaine',       jours:['mon','tue','thu','fri'], debut:'06:30', fin:'07:30', actif:true },
      { id:2, label:'Soir Lun/Mar/Jeu',    jours:['mon','tue','thu'],       debut:'17:00', fin:'20:45', actif:true },
      { id:3, label:'Soir Vendredi',       jours:['fri'],                   debut:'16:15', fin:'20:45', actif:true },
      { id:4, label:'Après-midi Mercredi', jours:['wed'],                   debut:'13:00', fin:'20:30', actif:true },
      { id:5, label:'Week-end',            jours:['sat','sun'],             debut:'07:00', fin:'20:45', actif:true },
    ]
  },
  parents: {
    temp_defaut: 17, temp_confort: 20,
    plages: [
      { id:1, label:'Soir semaine',   jours:['mon','tue','wed','thu','fri'], debut:'19:45', fin:'21:15', actif:true },
      { id:2, label:'Matin week-end', jours:['sat','sun'],                   debut:'07:00', fin:'09:00', actif:true },
      { id:3, label:'Soir week-end',  jours:['sat','sun'],                   debut:'19:45', fin:'21:30', actif:true },
    ]
  },
  aureline: {
    temp_defaut: 17, temp_confort: 19,
    plages: [
      { id:1, label:'Matin semaine',       jours:['mon','tue','wed','thu','fri'], debut:'05:00', fin:'06:00', actif:true },
      { id:2, label:'Soir semaine',        jours:['mon','tue','wed','thu','fri'], debut:'18:00', fin:'20:30', actif:true },
      { id:3, label:'Matin week-end',      jours:['sat','sun'],                   debut:'09:00', fin:'11:00', actif:true },
      { id:4, label:'Après-midi week-end', jours:['sat','sun'],                   debut:'14:30', fin:'20:30', actif:true },
    ]
  },
  sdb: {
    temp_defaut: 16, temp_confort: 19,
    plages: [
      { id:1, label:'Matin semaine', jours:['mon','tue','wed','thu','fri'], debut:'04:45', fin:'06:00', actif:true },
      { id:2, label:'Soir semaine',  jours:['mon','tue','wed','thu','fri'], debut:'19:00', fin:'20:00', actif:true },
      { id:3, label:'Matin WE',      jours:['sat','sun'],                   debut:'09:00', fin:'11:00', actif:true },
      { id:4, label:'Nuit WE',       jours:['sat','sun'],                   debut:'00:00', fin:'09:00', actif:true },
      { id:5, label:'Soir WE',       jours:['sat','sun'],                   debut:'11:00', fin:'23:59', actif:true },
    ]
  }
};

function loadZoneConfig(hass, zoneKey) {
  const zone = ZONES_CONFIG[zoneKey];
  try {
    const meta = hass.states[`${zone.entity_base}_meta`];
    if (meta && meta.state.startsWith('chunks:')) {
      const nb = parseInt(meta.state.split(':')[1], 10);
      let json = '';
      for (let i = 0; i < nb; i++) {
        const e = hass.states[`${zone.entity_base}_${i}`];
        if (e && e.state !== 'unknown') json += e.state;
      }
      if (json) return JSON.parse(json);
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_CONFIGS[zoneKey]));
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getPlagesForDay(config, dayKey) {
  return (config.plages || []).filter(p => p.actif && p.jours.includes(dayKey));
}

// ============================================================
// STYLES
// ============================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;600;700&family=Share+Tech+Mono&display=swap');

  :host { display: block; font-family: 'Rajdhani', sans-serif; }

  * { box-sizing: border-box; }

  .card {
    color: #e6edf3;
    padding: 16px;
  }

  .topbar {
    height: 2px;
    background: linear-gradient(90deg, transparent, #4fc3f7, #1565c0, transparent);
    border-radius: 2px;
    margin-bottom: 16px;
  }

  /* HEADER */
  .main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .main-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #fff;
  }
  .main-subtitle {
    font-size: 10px;
    color: #7d8590;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: 0.1em;
  }

  /* SÉLECTEUR JOURS */
  .day-selector {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .day-btn {
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid #30363d;
    background: rgba(255,255,255,0.04);
    color: #7d8590;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
    letter-spacing: 0.03em;
  }
  .day-btn:hover { border-color: #4fc3f7; color: #4fc3f7; }
  .day-btn.active {
    border-color: #f97316;
    background: rgba(249,115,22,0.15);
    color: #f97316;
    box-shadow: 0 0 8px rgba(249,115,22,0.2);
  }

  /* ZONES */
  .zones-list { display: flex; flex-direction: column; gap: 10px; }

  .zone-block {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 12px 14px;
    transition: border-color 0.2s;
  }
  .zone-block:hover { border-color: rgba(79,195,247,0.25); }

  .zone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .zone-header-left { display: flex; align-items: center; gap: 8px; }
  .zone-icon { font-size: 16px; }
  .zone-name {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fff;
  }
  .zone-consigne {
    font-family: 'Share Tech Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: #f97316;
  }
  .zone-consigne.defaut { color: #4fc3f7; }
  .zone-consigne.unavailable { color: #30363d; font-size: 12px; }

  /* TIMELINE ZONE */
  .zone-timeline {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .timeline-bar-bg {
    flex: 1;
    height: 12px;
    background: #0d1117;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
    border: 1px solid #30363d;
  }
  .timeline-segment {
    position: absolute;
    top: 0;
    height: 100%;
    border-radius: 6px;
    opacity: 0.9;
  }

  .timeline-temps {
    display: flex;
    justify-content: space-between;
    margin-top: 3px;
    padding: 0 2px;
  }
  .timeline-time-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    color: #484f58;
  }

  .zone-no-plage {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    font-size: 12px;
    color: #484f58;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: 0.05em;
  }

  .plage-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }
  .plage-label-tag {
    font-size: 10px;
    font-family: 'Share Tech Mono', monospace;
    padding: 2px 7px;
    border-radius: 10px;
    border: 1px solid rgba(79,195,247,0.25);
    background: rgba(79,195,247,0.06);
    color: #4fc3f7;
  }

  /* FOOTER */
  .footer {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #21262d;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-info {
    font-size: 10px;
    color: #484f58;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: 0.05em;
  }
  .footer-day {
    font-size: 11px;
    color: #f97316;
    font-family: 'Share Tech Mono', monospace;
    font-weight: 600;
  }
`;

// Couleurs par zone
const ZONE_COLORS = {
  sejour:   'linear-gradient(90deg, #f97316, #fb923c)',
  parents:  'linear-gradient(90deg, #4fc3f7, #38bdf8)',
  aureline: 'linear-gradient(90deg, #e879f9, #c084fc)',
  sdb:      'linear-gradient(90deg, #34d399, #6ee7b7)',
};

// ============================================================
// MAIN ELEMENT
// ============================================================
class WidgetPlanningChauffage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._selectedDay = new Date().getDay(); // 0=dim, 1=lun...
    // Convertir en index DAY_KEYS (0=lun)
    this._selectedDay = this._selectedDay === 0 ? 6 : this._selectedDay - 1;
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render();
    } else {
      // Mise à jour des consignes sans re-render complet
      this._updateConsignes();
    }
  }

  setConfig(config) { this._config = config; }
  getCardSize() { return 5; }
  static getStubConfig() { return {}; }

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = this._buildHTML();
    shadow.appendChild(card);
    this._bindEvents(card);
  }

  _buildHTML() {
    const dayKey = DAY_KEYS[this._selectedDay];

    const daySelectorHTML = DAYS_FR.map((d, i) => `
      <button class="day-btn ${i === this._selectedDay ? 'active' : ''}" data-day="${i}">${d}</button>
    `).join('');

    const zonesHTML = Object.entries(ZONES_CONFIG).map(([key, zone]) => {
      const config = loadZoneConfig(this._hass, key);
      const plages = getPlagesForDay(config, dayKey);
      const sensorState = this._hass && this._hass.states[zone.sensor];
      const consigne = sensorState ? parseFloat(sensorState.state) : null;
      const isConfort = consigne !== null && consigne > config.temp_defaut;

      let consigneHTML;
      if (consigne === null || isNaN(consigne)) {
        consigneHTML = `<span class="zone-consigne unavailable">unavailable</span>`;
      } else {
        consigneHTML = `<span class="zone-consigne ${isConfort ? '' : 'defaut'}">${consigne}°</span>`;
      }

      let timelineHTML;
      if (plages.length === 0) {
        timelineHTML = `<div class="zone-no-plage">Pas de planning</div>`;
      } else {
        const segments = plages.map(p => {
          const debut = timeToMin(p.debut);
          const fin = timeToMin(p.fin);
          const left = (debut / 1440 * 100).toFixed(1);
          const width = ((fin - debut) / 1440 * 100).toFixed(1);
          return `<div class="timeline-segment" style="left:${left}%;width:${width}%;background:${ZONE_COLORS[key]}"></div>`;
        }).join('');

        const labelsHTML = plages.map(p =>
          `<span class="plage-label-tag">${p.debut}→${p.fin}</span>`
        ).join('');

        timelineHTML = `
          <div class="zone-timeline">
            <div style="flex:1">
              <div class="timeline-bar-bg">${segments}</div>
              <div class="timeline-temps">
                <span class="timeline-time-label">0h</span>
                <span class="timeline-time-label">6h</span>
                <span class="timeline-time-label">12h</span>
                <span class="timeline-time-label">18h</span>
                <span class="timeline-time-label">24h</span>
              </div>
            </div>
          </div>
          <div class="plage-labels">${labelsHTML}</div>
        `;
      }

      return `
        <div class="zone-block">
          <div class="zone-header">
            <div class="zone-header-left">
              <span class="zone-icon">${zone.icon}</span>
              <span class="zone-name">${zone.label}</span>
            </div>
            ${consigneHTML}
          </div>
          ${timelineHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="topbar"></div>
      <div class="main-header">
        <div>
          <div class="main-title">Planning Chauffage</div>
          <div class="main-subtitle">VUE GLOBALE · TOUTES ZONES</div>
        </div>
      </div>
      <div class="day-selector">${daySelectorHTML}</div>
      <div class="zones-list">${zonesHTML}</div>
      <div class="footer">
        <div class="footer-info">🔥 ${Object.keys(ZONES_CONFIG).length} zones · schedule_state</div>
        <div class="footer-day">${DAYS_FR[this._selectedDay].toUpperCase()}</div>
      </div>
    `;
  }

  _updateConsignes() {
    // Mise à jour légère des valeurs de consigne sans tout re-render
    Object.entries(ZONES_CONFIG).forEach(([key, zone]) => {
      const sensorState = this._hass && this._hass.states[zone.sensor];
      // Re-render si unavailable → disponible
    });
  }

  _bindEvents(card) {
    card.addEventListener('click', e => {
      const btn = e.target.closest('.day-btn');
      if (btn) {
        this._selectedDay = parseInt(btn.dataset.day);
        this._render();
      }
    });
  }
}

customElements.define('widget-planning-chauffage', WidgetPlanningChauffage);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'widget-planning-chauffage',
  name: 'Widget Planning Chauffage',
  description: 'Vue globale toutes zones avec sélecteur de jour',
  preview: true,
});

console.info('%c WIDGET-PLANNING-CHAUFFAGE %c v1.0 ', 'color:white;background:#4fc3f7;font-weight:bold;', 'color:#4fc3f7;background:white;');
