/**
 * Widget Planning Chauffage v2.0
 * Vue globale + édition inline par zone
 */

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const CHUNK_SIZE = 240;

const ZONES_CONFIG = {
  sejour:   { label: 'Séjour',   icon: '🛋️', entity_base: 'input_text.schedule_sejour',   sensor: 'sensor.schedule_sejour_consigne' },
  parents:  { label: 'Parents',  icon: '🛏️', entity_base: 'input_text.schedule_parents',  sensor: 'sensor.schedule_parents_consigne' },
  aureline: { label: 'Auréline', icon: '🌸', entity_base: 'input_text.schedule_aureline', sensor: 'sensor.schedule_aureline_consigne' },
  sdb:      { label: 'SDB',      icon: '🚿', entity_base: 'input_text.schedule_sdb',      sensor: 'sensor.schedule_sdb_etage_consigne' },
};

const ZONE_COLORS = {
  sejour:   'linear-gradient(90deg,#f97316,#fb923c)',
  parents:  'linear-gradient(90deg,#4fc3f7,#38bdf8)',
  aureline: 'linear-gradient(90deg,#e879f9,#c084fc)',
  sdb:      'linear-gradient(90deg,#34d399,#6ee7b7)',
};

const DEFAULT_CONFIGS = {
  sejour:   { temp_defaut:16, temp_confort:19.5, plages:[
    {id:1,label:'Matin semaine',jours:['mon','tue','thu','fri'],debut:'06:30',fin:'07:30',actif:true},
    {id:2,label:'Soir Lun/Mar/Jeu',jours:['mon','tue','thu'],debut:'17:00',fin:'20:45',actif:true},
    {id:3,label:'Soir Vendredi',jours:['fri'],debut:'16:15',fin:'20:45',actif:true},
    {id:4,label:'Après-midi Mercredi',jours:['wed'],debut:'13:00',fin:'20:30',actif:true},
    {id:5,label:'Week-end',jours:['sat','sun'],debut:'07:00',fin:'20:45',actif:true},
  ]},
  parents:  { temp_defaut:17, temp_confort:20, plages:[
    {id:1,label:'Soir semaine',jours:['mon','tue','wed','thu','fri'],debut:'19:45',fin:'21:15',actif:true},
    {id:2,label:'Matin week-end',jours:['sat','sun'],debut:'07:00',fin:'09:00',actif:true},
    {id:3,label:'Soir week-end',jours:['sat','sun'],debut:'19:45',fin:'21:30',actif:true},
  ]},
  aureline: { temp_defaut:17, temp_confort:19, plages:[
    {id:1,label:'Matin semaine',jours:['mon','tue','wed','thu','fri'],debut:'05:00',fin:'06:00',actif:true},
    {id:2,label:'Soir semaine',jours:['mon','tue','wed','thu','fri'],debut:'18:00',fin:'20:30',actif:true},
    {id:3,label:'Matin week-end',jours:['sat','sun'],debut:'09:00',fin:'11:00',actif:true},
    {id:4,label:'Après-midi week-end',jours:['sat','sun'],debut:'14:30',fin:'20:30',actif:true},
  ]},
  sdb:      { temp_defaut:16, temp_confort:19, plages:[
    {id:1,label:'Matin semaine',jours:['mon','tue','wed','thu','fri'],debut:'04:45',fin:'06:00',actif:true},
    {id:2,label:'Soir semaine',jours:['mon','tue','wed','thu','fri'],debut:'19:00',fin:'20:00',actif:true},
    {id:3,label:'Matin WE',jours:['sat','sun'],debut:'09:00',fin:'11:00',actif:true},
    {id:4,label:'Nuit WE',jours:['sat','sun'],debut:'00:00',fin:'09:00',actif:true},
    {id:5,label:'Soir WE',jours:['sat','sun'],debut:'11:00',fin:'23:59',actif:true},
  ]},
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

// ============================================================
// STYLES
// ============================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;600;700&family=Share+Tech+Mono&display=swap');
  :host { display: block; font-family: 'Rajdhani', sans-serif; }
  * { box-sizing: border-box; }

  .card { color: #e6edf3; padding: 16px; }

  .topbar {
    height: 2px;
    background: linear-gradient(90deg, transparent, #4fc3f7, #1565c0, transparent);
    border-radius: 2px; margin-bottom: 16px;
  }

  .main-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .main-title { font-size:20px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#fff; }
  .main-subtitle { font-size:10px; color:#7d8590; font-family:'Share Tech Mono',monospace; letter-spacing:0.1em; }

  .day-selector { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
  .day-btn {
    padding:5px 12px; border-radius:20px; border:1px solid #30363d;
    background:rgba(255,255,255,0.04); color:#7d8590;
    font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.2s; user-select:none;
  }
  .day-btn:hover { border-color:#4fc3f7; color:#4fc3f7; }
  .day-btn.active { border-color:#f97316; background:rgba(249,115,22,0.15); color:#f97316; box-shadow:0 0 8px rgba(249,115,22,0.2); }

  .zones-list { display:flex; flex-direction:column; gap:10px; }

  .zone-block {
    background:#161b22; border:1px solid #30363d;
    border-radius:12px; overflow:hidden;
    transition:border-color 0.2s;
  }
  .zone-block:hover { border-color:rgba(79,195,247,0.25); }

  .zone-main { padding:12px 14px; }

  .zone-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .zone-header-left { display:flex; align-items:center; gap:8px; }
  .zone-icon { font-size:16px; }
  .zone-name { font-size:15px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#fff; }
  .zone-header-right { display:flex; align-items:center; gap:10px; }
  .zone-consigne { font-family:'Share Tech Mono',monospace; font-size:18px; font-weight:700; color:#f97316; }
  .zone-consigne.defaut { color:#4fc3f7; }
  .zone-consigne.unavailable { color:#484f58; font-size:12px; }

  .gear-btn {
    background:none; border:none; cursor:pointer;
    font-size:16px; color:#484f58; padding:2px 4px;
    border-radius:6px; transition:all 0.2s; line-height:1;
  }
  .gear-btn:hover { color:#4fc3f7; background:rgba(79,195,247,0.1); }
  .gear-btn.active { color:#f97316; transform:rotate(45deg); }

  .timeline-bar-bg {
    flex:1; height:12px; background:#0d1117;
    border-radius:6px; position:relative; overflow:hidden; border:1px solid #30363d;
  }
  .timeline-segment { position:absolute; top:0; height:100%; border-radius:6px; opacity:0.9; }
  .timeline-temps { display:flex; justify-content:space-between; margin-top:3px; padding:0 2px; }
  .timeline-time-label { font-family:'Share Tech Mono',monospace; font-size:9px; color:#484f58; }
  .zone-no-plage {
    background:#0d1117; border:1px solid #30363d; border-radius:8px;
    padding:10px; text-align:center; font-size:12px; color:#484f58;
    font-family:'Share Tech Mono',monospace;
  }
  .plage-labels { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .plage-label-tag {
    font-size:10px; font-family:'Share Tech Mono',monospace;
    padding:2px 7px; border-radius:10px;
    border:1px solid rgba(79,195,247,0.25); background:rgba(79,195,247,0.06); color:#4fc3f7;
  }

  /* ===== PANNEAU ÉDITION ===== */
  .edit-panel {
    border-top:1px solid #30363d;
    background:#0d1117;
    padding:14px;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown {
    from { opacity:0; transform:translateY(-8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .edit-section-title {
    font-size:10px; color:#7d8590; text-transform:uppercase;
    letter-spacing:0.1em; margin-bottom:8px; font-family:'Share Tech Mono',monospace;
  }

  /* Températures */
  .temps-row { display:flex; gap:8px; margin-bottom:14px; }
  .temp-block {
    flex:1; background:#161b22; border:1px solid #30363d;
    border-radius:10px; padding:10px 12px; text-align:center;
  }
  .temp-block-label { font-size:10px; color:#7d8590; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; font-family:'Share Tech Mono',monospace; }
  .temp-control { display:flex; align-items:center; justify-content:center; gap:6px; }
  .temp-btn {
    width:24px; height:24px; border:1px solid #30363d;
    background:rgba(255,255,255,0.05); color:#fff;
    border-radius:6px; cursor:pointer; font-size:14px; font-weight:700;
    display:flex; align-items:center; justify-content:center; transition:background 0.15s;
  }
  .temp-btn:hover { background:rgba(255,255,255,0.12); }
  .temp-value { font-family:'Share Tech Mono',monospace; font-size:20px; font-weight:700; min-width:44px; text-align:center; }
  .temp-value.confort { color:#f97316; }
  .temp-value.defaut { color:#4fc3f7; }
  .temp-unit { font-size:11px; color:#7d8590; }

  /* Plages */
  .plages-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .add-btn {
    background:rgba(79,195,247,0.1); border:1px solid rgba(79,195,247,0.3);
    color:#4fc3f7; border-radius:6px; padding:2px 8px;
    font-size:11px; cursor:pointer; font-family:'Share Tech Mono',monospace;
  }
  .add-btn:hover { background:rgba(79,195,247,0.2); }

  .plage-block {
    background:#161b22; border:1px solid #30363d;
    border-radius:10px; padding:10px 12px; margin-bottom:8px; transition:border-color 0.2s;
  }
  .plage-block:hover { border-color:rgba(79,195,247,0.3); }
  .plage-block.inactive { opacity:0.5; }

  .plage-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .plage-header-left { display:flex; align-items:center; gap:8px; }
  .toggle {
    position:relative; width:36px; height:20px;
    background:#30363d; border-radius:10px; cursor:pointer; transition:background 0.3s; flex-shrink:0;
  }
  .toggle.on { background:#4fc3f7; }
  .toggle::after {
    content:''; position:absolute; top:2px; left:2px;
    width:16px; height:16px; background:white; border-radius:50%;
    transition:transform 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.3);
  }
  .toggle.on::after { transform:translateX(16px); }
  .plage-label-input {
    background:transparent; border:none; border-bottom:1px solid #30363d;
    color:#fff; font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:600;
    width:140px; padding:1px 2px; outline:none;
  }
  .plage-label-input:focus { border-bottom-color:#4fc3f7; }
  .delete-btn { background:transparent; border:none; color:#f85149; cursor:pointer; font-size:14px; padding:2px 4px; border-radius:4px; opacity:0.6; transition:opacity 0.2s; }
  .delete-btn:hover { opacity:1; }

  .plage-times { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .time-label { font-size:10px; color:#7d8590; font-family:'Share Tech Mono',monospace; }
  .time-input {
    background:#0d1117; border:1px solid #30363d; border-radius:6px;
    color:#4fc3f7; font-family:'Share Tech Mono',monospace; font-size:14px; font-weight:600;
    padding:4px 8px; width:70px; outline:none; text-align:center;
  }
  .time-input:focus { border-color:#4fc3f7; }
  .time-arrow { color:#7d8590; font-size:12px; }

  .plage-jours { display:flex; gap:4px; flex-wrap:wrap; }
  .jour-btn {
    font-size:10px; padding:3px 7px; border-radius:12px;
    border:1px solid #30363d; background:rgba(255,255,255,0.03);
    color:#7d8590; cursor:pointer; font-family:'Share Tech Mono',monospace;
    transition:all 0.2s; user-select:none;
  }
  .jour-btn.active { border-color:#4fc3f7; background:rgba(79,195,247,0.12); color:#4fc3f7; }

  /* Actions édition */
  .edit-actions { display:flex; gap:8px; margin-top:4px; }
  .btn-save {
    flex:1; padding:10px;
    background:linear-gradient(135deg,#f97316,#fb923c);
    border:none; border-radius:8px; color:white;
    font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:700;
    letter-spacing:0.05em; cursor:pointer; transition:opacity 0.2s; text-transform:uppercase;
  }
  .btn-save:hover { opacity:0.85; }
  .btn-reset {
    padding:10px 14px; background:rgba(255,255,255,0.05);
    border:1px solid #30363d; border-radius:8px; color:#7d8590;
    font-family:'Rajdhani',sans-serif; font-size:13px; cursor:pointer; transition:all 0.2s; text-transform:uppercase;
  }
  .btn-reset:hover { background:rgba(255,255,255,0.1); color:#fff; }

  .save-status { font-size:10px; font-family:'Share Tech Mono',monospace; padding:2px 8px; border-radius:10px; margin-top:8px; display:inline-block; }
  .save-status.ok { color:#3fb950; border:1px solid rgba(63,185,80,0.3); }
  .save-status.saving { color:#f97316; border:1px solid rgba(249,115,22,0.3); }
  .save-status.error { color:#f85149; border:1px solid rgba(248,81,73,0.3); }

  /* FOOTER */
  .footer { margin-top:12px; padding-top:10px; border-top:1px solid #21262d; display:flex; justify-content:space-between; align-items:center; }
  .footer-info { font-size:10px; color:#484f58; font-family:'Share Tech Mono',monospace; letter-spacing:0.05em; }
  .footer-day { font-size:11px; color:#f97316; font-family:'Share Tech Mono',monospace; font-weight:600; }
`;

// ============================================================
// MAIN ELEMENT
// ============================================================
class WidgetPlanningChauffage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._selectedDay = (() => {
      const d = new Date().getDay();
      return d === 0 ? 6 : d - 1;
    })();
    this._openZone = null; // zone dont le panneau est ouvert
    this._editData = {}; // copies de travail des configs
    this._saveStatus = {};
    this._nextId = 100;
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._render();
    } else {
      this._updateConsignes();
    }
  }

  setConfig(config) { this._config = config; }
  getCardSize() { return 6; }
  static getStubConfig() { return {}; }

  _getEditData(zoneKey) {
    if (!this._editData[zoneKey]) {
      this._editData[zoneKey] = loadZoneConfig(this._hass, zoneKey);
    }
    return this._editData[zoneKey];
  }

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
      const plages = config.plages.filter(p => p.actif && p.jours.includes(dayKey));
      const sensorState = this._hass && this._hass.states[zone.sensor];
      const consigne = sensorState ? parseFloat(sensorState.state) : null;
      const isConfort = consigne !== null && !isNaN(consigne) && consigne > config.temp_defaut;
      const isOpen = this._openZone === key;

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
        const labels = plages.map(p => `<span class="plage-label-tag">${p.debut}→${p.fin}</span>`).join('');
        timelineHTML = `
          <div class="timeline-bar-bg">${segments}</div>
          <div class="timeline-temps">
            <span class="timeline-time-label">0h</span>
            <span class="timeline-time-label">6h</span>
            <span class="timeline-time-label">12h</span>
            <span class="timeline-time-label">18h</span>
            <span class="timeline-time-label">24h</span>
          </div>
          <div class="plage-labels">${labels}</div>
        `;
      }

      const editPanelHTML = isOpen ? this._buildEditPanel(key) : '';

      return `
        <div class="zone-block" data-zone="${key}">
          <div class="zone-main">
            <div class="zone-header">
              <div class="zone-header-left">
                <span class="zone-icon">${zone.icon}</span>
                <span class="zone-name">${zone.label}</span>
              </div>
              <div class="zone-header-right">
                ${consigneHTML}
                <button class="gear-btn ${isOpen ? 'active' : ''}" data-action="toggle-edit" data-zone="${key}" title="Paramétrer">⚙</button>
              </div>
            </div>
            ${timelineHTML}
          </div>
          ${editPanelHTML}
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
        <div class="footer-info">🔥 4 zones · schedule_state</div>
        <div class="footer-day">${DAYS_FR[this._selectedDay].toUpperCase()}</div>
      </div>
    `;
  }

  _buildEditPanel(zoneKey) {
    const data = this._getEditData(zoneKey);
    const status = this._saveStatus[zoneKey] || '';

    const plagesHTML = data.plages.map(p => {
      const joursHTML = DAY_KEYS.map((k, i) => `
        <span class="jour-btn ${p.jours.includes(k) ? 'active' : ''}"
              data-action="toggle-jour" data-plage="${p.id}" data-jour="${k}">${DAYS_FR[i].substring(0,3)}</span>
      `).join('');
      return `
        <div class="plage-block ${p.actif ? '' : 'inactive'}" data-plage-id="${p.id}">
          <div class="plage-header">
            <div class="plage-header-left">
              <div class="toggle ${p.actif ? 'on' : ''}" data-action="toggle-plage" data-plage="${p.id}"></div>
              <input class="plage-label-input" type="text" value="${p.label}" data-action="edit-label" data-plage="${p.id}" />
            </div>
            <button class="delete-btn" data-action="delete-plage" data-plage="${p.id}">🗑</button>
          </div>
          <div class="plage-times">
            <span class="time-label">De</span>
            <input class="time-input" type="time" value="${p.debut}" data-action="edit-debut" data-plage="${p.id}" />
            <span class="time-arrow">→</span>
            <span class="time-label">à</span>
            <input class="time-input" type="time" value="${p.fin}" data-action="edit-fin" data-plage="${p.id}" />
          </div>
          <div class="plage-jours">${joursHTML}</div>
        </div>
      `;
    }).join('');

    let statusHTML = '';
    if (status === 'saving') statusHTML = `<span class="save-status saving">⏳ Sauvegarde...</span>`;
    else if (status === 'ok') statusHTML = `<span class="save-status ok">✓ Sauvegardé</span>`;
    else if (status === 'error') statusHTML = `<span class="save-status error">✗ Erreur</span>`;

    return `
      <div class="edit-panel" data-edit-zone="${zoneKey}">
        <div class="edit-section-title">🌡️ Températures</div>
        <div class="temps-row">
          <div class="temp-block">
            <div class="temp-block-label">Défaut</div>
            <div class="temp-control">
              <button class="temp-btn" data-action="temp-dec" data-type="defaut">−</button>
              <span class="temp-value defaut" data-temp="defaut">${data.temp_defaut}</span>
              <span class="temp-unit">°C</span>
              <button class="temp-btn" data-action="temp-inc" data-type="defaut">+</button>
            </div>
          </div>
          <div class="temp-block">
            <div class="temp-block-label">Confort</div>
            <div class="temp-control">
              <button class="temp-btn" data-action="temp-dec" data-type="confort">−</button>
              <span class="temp-value confort" data-temp="confort">${data.temp_confort}</span>
              <span class="temp-unit">°C</span>
              <button class="temp-btn" data-action="temp-inc" data-type="confort">+</button>
            </div>
          </div>
        </div>
        <div class="plages-header">
          <div class="edit-section-title" style="margin:0">⏰ Plages horaires</div>
          <button class="add-btn" data-action="add-plage">+ Ajouter</button>
        </div>
        <div class="plages-list" style="margin-top:8px">${plagesHTML}</div>
        <div class="edit-actions">
          <button class="btn-save" data-action="save">💾 Sauvegarder</button>
          <button class="btn-reset" data-action="reset">↺ Reset</button>
        </div>
        ${statusHTML}
      </div>
    `;
  }

  _updateConsignes() {
    // Mise à jour légère sans re-render complet
    Object.entries(ZONES_CONFIG).forEach(([key, zone]) => {
      const el = this.shadowRoot.querySelector(`.zone-block[data-zone="${key}"] .zone-consigne`);
      if (!el) return;
      const sensorState = this._hass && this._hass.states[zone.sensor];
      const config = loadZoneConfig(this._hass, key);
      const consigne = sensorState ? parseFloat(sensorState.state) : null;
      if (consigne === null || isNaN(consigne)) {
        el.textContent = 'unavailable';
        el.className = 'zone-consigne unavailable';
      } else {
        el.textContent = `${consigne}°`;
        el.className = 'zone-consigne ' + (consigne > config.temp_defaut ? '' : 'defaut');
      }
    });
  }

  async _saveZone(zoneKey) {
    const data = this._getEditData(zoneKey);
    const zone = ZONES_CONFIG[zoneKey];
    this._saveStatus[zoneKey] = 'saving';
    this._refreshEditStatus(zoneKey);
    try {
      const json = JSON.stringify(data);
      const chunks = [];
      for (let i = 0; i < json.length; i += CHUNK_SIZE) chunks.push(json.substring(i, i + CHUNK_SIZE));
      for (let i = 0; i < chunks.length; i++) {
        await this._hass.callService('input_text', 'set_value', {
          entity_id: `${zone.entity_base}_${i}`, value: chunks[i]
        });
      }
      await this._hass.callService('input_text', 'set_value', {
        entity_id: `${zone.entity_base}_meta`, value: `chunks:${chunks.length}`
      });
      this._saveStatus[zoneKey] = 'ok';
    } catch(e) {
      this._saveStatus[zoneKey] = 'error';
    }
    this._refreshEditStatus(zoneKey);
    setTimeout(() => { this._saveStatus[zoneKey] = ''; this._refreshEditStatus(zoneKey); }, 3000);
  }

  _refreshEditStatus(zoneKey) {
    const panel = this.shadowRoot.querySelector(`[data-edit-zone="${zoneKey}"]`);
    if (!panel) return;
    let statusEl = panel.querySelector('.save-status');
    const status = this._saveStatus[zoneKey] || '';
    if (!statusEl) {
      statusEl = document.createElement('span');
      panel.appendChild(statusEl);
    }
    statusEl.className = 'save-status ' + status;
    if (status === 'saving') statusEl.textContent = '⏳ Sauvegarde...';
    else if (status === 'ok') statusEl.textContent = '✓ Sauvegardé';
    else if (status === 'error') statusEl.textContent = '✗ Erreur';
    else statusEl.textContent = '';
  }

  _bindEvents(card) {
    // Sélecteur de jour
    card.addEventListener('click', e => {
      const dayBtn = e.target.closest('.day-btn');
      if (dayBtn) {
        this._selectedDay = parseInt(dayBtn.dataset.day);
        this._render();
        return;
      }

      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;

      // Trouver la zone du panneau d'édition
      const zoneBlock = t.closest('[data-zone]');
      const editPanel = t.closest('[data-edit-zone]');
      const zoneKey = (zoneBlock && zoneBlock.dataset.zone) || (editPanel && editPanel.dataset.editZone);
      if (!zoneKey && action !== 'toggle-edit') return;

      const plageId = t.dataset.plage ? parseInt(t.dataset.plage) : null;
      const data = zoneKey ? this._getEditData(zoneKey) : null;
      const plage = data && plageId ? data.plages.find(x => x.id === plageId) : null;

      switch(action) {
        case 'toggle-edit':
          const tz = t.dataset.zone;
          if (this._openZone === tz) {
            this._openZone = null;
          } else {
            this._openZone = tz;
            this._editData[tz] = loadZoneConfig(this._hass, tz);
          }
          this._render();
          break;

        case 'toggle-plage':
          if (plage) { plage.actif = !plage.actif; this._rerenderEditPanel(zoneKey); }
          break;

        case 'toggle-jour':
          if (plage) {
            const jour = t.dataset.jour;
            const idx = plage.jours.indexOf(jour);
            if (idx >= 0) plage.jours.splice(idx, 1);
            else plage.jours.push(jour);
            this._rerenderEditPanel(zoneKey);
          }
          break;

        case 'delete-plage':
          if (data) { data.plages = data.plages.filter(x => x.id !== plageId); this._rerenderEditPanel(zoneKey); }
          break;

        case 'add-plage':
          if (data) {
            data.plages.push({ id: this._nextId++, label: 'Nouvelle plage', jours: ['mon'], debut: '08:00', fin: '10:00', actif: true });
            this._rerenderEditPanel(zoneKey);
          }
          break;

        case 'temp-inc':
        case 'temp-dec':
          if (data) {
            const type = t.dataset.type;
            const inc = action === 'temp-inc' ? 0.5 : -0.5;
            if (type === 'defaut') data.temp_defaut = Math.round((data.temp_defaut + inc) * 2) / 2;
            else data.temp_confort = Math.round((data.temp_confort + inc) * 2) / 2;
            const valEl = t.closest('.temp-control').querySelector('.temp-value');
            if (valEl) valEl.textContent = type === 'defaut' ? data.temp_defaut : data.temp_confort;
          }
          break;

        case 'save':
          if (zoneKey) this._saveZone(zoneKey);
          break;

        case 'reset':
          if (zoneKey) {
            this._editData[zoneKey] = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[zoneKey]));
            this._rerenderEditPanel(zoneKey);
          }
          break;
      }
    });

    // Inputs
    card.addEventListener('change', e => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      const editPanel = t.closest('[data-edit-zone]');
      if (!editPanel) return;
      const zoneKey = editPanel.dataset.editZone;
      const data = this._getEditData(zoneKey);
      const plageId = t.dataset.plage ? parseInt(t.dataset.plage) : null;
      const plage = data.plages.find(x => x.id === plageId);
      if (!plage) return;
      if (action === 'edit-debut') plage.debut = t.value;
      else if (action === 'edit-fin') plage.fin = t.value;
      else if (action === 'edit-label') plage.label = t.value;
    });
  }

  _rerenderEditPanel(zoneKey) {
    const panel = this.shadowRoot.querySelector(`[data-edit-zone="${zoneKey}"]`);
    if (!panel) return;
    panel.innerHTML = this._buildEditPanel(zoneKey).replace(/<div class="edit-panel"[^>]*>/, '').replace(/<\/div>\s*$/, '');
    // Plus simple : re-render le panel entier
    const zoneBlock = this.shadowRoot.querySelector(`.zone-block[data-zone="${zoneKey}"]`);
    if (!zoneBlock) return;
    const existingPanel = zoneBlock.querySelector('.edit-panel');
    if (existingPanel) {
      const tmp = document.createElement('div');
      tmp.innerHTML = this._buildEditPanel(zoneKey);
      const newPanel = tmp.firstElementChild;
      zoneBlock.replaceChild(newPanel, existingPanel);
      this._bindEditPanelEvents(newPanel, zoneKey);
    }
  }

  _bindEditPanelEvents(panel, zoneKey) {
    // Les events sont déjà capturés par le listener global sur card
    // Pas besoin de re-bind
  }
}

customElements.define('widget-planning-chauffage', WidgetPlanningChauffage);
window.customCards = window.customCards || [];
window.customCards.push({ type:'widget-planning-chauffage', name:'Widget Planning Chauffage', description:'Vue globale + édition inline', preview:true });
console.info('%c WIDGET-PLANNING-CHAUFFAGE %c v2.0 ', 'color:white;background:#4fc3f7;font-weight:bold;', 'color:#4fc3f7;background:white;');
