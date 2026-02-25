/**
 * Widget Schedule Chauffage v1.0
 * Carte Lovelace pour modifier visuellement les plannings schedule_state
 */

const CHUNK_SIZE = 240;
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DEFAULT_CONFIGS = {
  sejour: {
    temp_defaut: 16, temp_confort: 19.5,
    plages: [
      { id: 1, label: 'Matin semaine', jours: ['mon','tue','thu','fri'], debut: '06:30', fin: '07:30', actif: true },
      { id: 2, label: 'Soir Lun/Mar/Jeu', jours: ['mon','tue','thu'], debut: '17:00', fin: '20:45', actif: true },
      { id: 3, label: 'Soir Vendredi', jours: ['fri'], debut: '16:15', fin: '20:45', actif: true },
      { id: 4, label: 'Après-midi Mercredi', jours: ['wed'], debut: '13:00', fin: '20:30', actif: true },
      { id: 5, label: 'Week-end', jours: ['sat','sun'], debut: '07:00', fin: '20:45', actif: true },
    ]
  },
  parents: {
    temp_defaut: 17, temp_confort: 20,
    plages: [
      { id: 1, label: 'Soir semaine', jours: ['mon','tue','wed','thu','fri'], debut: '19:45', fin: '21:15', actif: true },
      { id: 2, label: 'Matin week-end', jours: ['sat','sun'], debut: '07:00', fin: '09:00', actif: true },
      { id: 3, label: 'Soir week-end', jours: ['sat','sun'], debut: '19:45', fin: '21:30', actif: true },
    ]
  },
  aureline: {
    temp_defaut: 17, temp_confort: 19,
    plages: [
      { id: 1, label: 'Matin semaine', jours: ['mon','tue','wed','thu','fri'], debut: '05:00', fin: '06:00', actif: true },
      { id: 2, label: 'Soir semaine', jours: ['mon','tue','wed','thu','fri'], debut: '18:00', fin: '20:30', actif: true },
      { id: 3, label: 'Matin week-end', jours: ['sat','sun'], debut: '09:00', fin: '11:00', actif: true },
      { id: 4, label: 'Après-midi week-end', jours: ['sat','sun'], debut: '14:30', fin: '20:30', actif: true },
    ]
  },
  sdb: {
    temp_defaut: 16, temp_confort: 19,
    plages: [
      { id: 1, label: 'Matin semaine', jours: ['mon','tue','wed','thu','fri'], debut: '04:45', fin: '06:00', actif: true },
      { id: 2, label: 'Soir semaine', jours: ['mon','tue','wed','thu','fri'], debut: '19:00', fin: '20:00', actif: true },
      { id: 3, label: 'Matin week-end', jours: ['sat','sun'], debut: '09:00', fin: '11:00', actif: true },
      { id: 4, label: 'Week-end nuit', jours: ['sat','sun'], debut: '00:00', fin: '09:00', actif: true },
      { id: 5, label: 'Week-end soir', jours: ['sat','sun'], debut: '11:00', fin: '23:59', actif: true },
    ]
  }
};

const ZONES_META = {
  sejour:   { label: 'Séjour',    icon: '🛋️', entity_base: 'input_text.schedule_sejour',   sensor: 'sensor.schedule_sejour_consigne' },
  parents:  { label: 'Parents',   icon: '🛏️', entity_base: 'input_text.schedule_parents',  sensor: 'sensor.schedule_parents_consigne' },
  aureline: { label: 'Auréline',  icon: '🌸', entity_base: 'input_text.schedule_aureline', sensor: 'sensor.schedule_aureline_consigne' },
  sdb:      { label: 'SDB Étage', icon: '🚿', entity_base: 'input_text.schedule_sdb',      sensor: 'sensor.schedule_sdb_etage_consigne' },
};

// ============================================================
// STORAGE
// ============================================================
class ScheduleStorage {
  constructor(hass, entityBase) {
    this.hass = hass;
    this.entityBase = entityBase;
  }

  async save(config) {
    const json = JSON.stringify(config);
    const chunks = [];
    for (let i = 0; i < json.length; i += CHUNK_SIZE) chunks.push(json.substring(i, i + CHUNK_SIZE));
    try {
      for (let i = 0; i < chunks.length && i < 10; i++) {
        await this.hass.callService('input_text', 'set_value', {
          entity_id: `${this.entityBase}_${i}`,
          value: chunks[i]
        });
      }
      await this.hass.callService('input_text', 'set_value', {
        entity_id: `${this.entityBase}_meta`,
        value: `chunks:${chunks.length}`
      });
    } catch(e) {
      console.warn('Schedule: save failed', e);
      localStorage.setItem(this.entityBase, json);
    }
  }

  load() {
    try {
      const meta = this.hass.states[`${this.entityBase}_meta`];
      if (meta && meta.state.startsWith('chunks:')) {
        const nb = parseInt(meta.state.split(':')[1], 10);
        let json = '';
        for (let i = 0; i < nb; i++) {
          const e = this.hass.states[`${this.entityBase}_${i}`];
          if (e) json += e.state;
        }
        if (json) return JSON.parse(json);
      }
    } catch(e) {}
    const stored = localStorage.getItem(this.entityBase);
    if (stored) try { return JSON.parse(stored); } catch(e) {}
    return null;
  }
}

// ============================================================
// STYLES
// ============================================================
const CARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;600;700&family=Share+Tech+Mono&display=swap');

  :host { display: block; font-family: 'Rajdhani', sans-serif; }

  .card {
    color: #fff;
    padding: 8px 4px;
  }

  .topbar {
    height: 2px;
    background: linear-gradient(90deg, transparent, #4fc3f7, #1565c0, transparent);
    border-radius: 2px;
    margin-bottom: 18px;
  }

  /* HEADER */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-icon { font-size: 22px; }
  .header-title { font-size: 18px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .header-sub { font-size: 10px; color: #7d8590; font-family: 'Share Tech Mono', monospace; letter-spacing: 0.08em; }
  .header-right { display: flex; align-items: center; gap: 8px; }

  .temp-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 12px;
    border: 1px solid rgba(79,195,247,0.3);
    color: #4fc3f7;
    background: rgba(79,195,247,0.08);
  }

  .current-temp {
    font-family: 'Share Tech Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: #f97316;
    text-shadow: 0 0 10px rgba(249,115,22,0.3);
  }

  /* TIMELINE */
  .timeline-wrap {
    background: #1c2128;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }
  .timeline-title {
    font-size: 10px;
    color: #7d8590;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
    font-family: 'Share Tech Mono', monospace;
  }
  .timeline-days { display: flex; flex-direction: column; gap: 4px; }
  .timeline-row { display: flex; align-items: center; gap: 8px; }
  .timeline-day-label {
    font-size: 10px;
    color: #7d8590;
    font-family: 'Share Tech Mono', monospace;
    width: 28px;
    flex-shrink: 0;
  }
  .timeline-bar-bg {
    flex: 1;
    height: 10px;
    background: #30363d;
    border-radius: 5px;
    position: relative;
    overflow: hidden;
  }
  .timeline-segment {
    position: absolute;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, #f97316, #4fc3f7);
    border-radius: 5px;
    opacity: 0.85;
  }
  .timeline-segment.defaut { background: #30363d; opacity: 0; }

  /* PLAGES */
  .plages-title {
    font-size: 12px;
    color: #7d8590;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
    font-family: 'Share Tech Mono', monospace;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .add-btn {
    background: rgba(79,195,247,0.1);
    border: 1px solid rgba(79,195,247,0.3);
    color: #4fc3f7;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
    font-family: 'Share Tech Mono', monospace;
  }
  .add-btn:hover { background: rgba(79,195,247,0.2); }

  .plage-block {
    background: #1c2128;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
    transition: border-color 0.2s;
  }
  .plage-block:hover { border-color: rgba(79,195,247,0.3); }
  .plage-block.inactive { opacity: 0.5; }

  .plage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .plage-header-left { display: flex; align-items: center; gap: 8px; }

  .toggle {
    position: relative; width: 36px; height: 20px;
    background: #30363d; border-radius: 10px; cursor: pointer;
    transition: background 0.3s; flex-shrink: 0;
  }
  .toggle.on { background: #4fc3f7; }
  .toggle::after {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; background: white; border-radius: 50%;
    transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .toggle.on::after { transform: translateX(16px); }

  .plage-label-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid #30363d;
    color: #fff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 600;
    width: 140px;
    padding: 1px 2px;
    outline: none;
  }
  .plage-label-input:focus { border-bottom-color: #4fc3f7; }

  .delete-btn {
    background: transparent; border: none;
    color: #f85149; cursor: pointer; font-size: 14px;
    padding: 2px 4px; border-radius: 4px;
    opacity: 0.6; transition: opacity 0.2s;
  }
  .delete-btn:hover { opacity: 1; }

  .plage-times {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .time-label { font-size: 10px; color: #7d8590; font-family: 'Share Tech Mono', monospace; }
  .time-input {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #4fc3f7;
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    padding: 4px 8px;
    width: 70px;
    outline: none;
    text-align: center;
  }
  .time-input:focus { border-color: #4fc3f7; }
  .time-arrow { color: #7d8590; font-size: 12px; }

  .plage-jours { display: flex; gap: 4px; flex-wrap: wrap; }
  .jour-btn {
    font-size: 10px;
    padding: 3px 7px;
    border-radius: 12px;
    border: 1px solid #30363d;
    background: rgba(255,255,255,0.03);
    color: #7d8590;
    cursor: pointer;
    font-family: 'Share Tech Mono', monospace;
    transition: all 0.2s;
    user-select: none;
  }
  .jour-btn.active {
    border-color: #4fc3f7;
    background: rgba(79,195,247,0.12);
    color: #4fc3f7;
  }

  /* TEMPÉRATURES */
  .temps-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .temp-block {
    flex: 1;
    background: #1c2128;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 10px 12px;
    text-align: center;
  }
  .temp-block-label {
    font-size: 10px;
    color: #7d8590;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    font-family: 'Share Tech Mono', monospace;
  }
  .temp-control { display: flex; align-items: center; justify-content: center; gap: 6px; }
  .temp-btn {
    width: 24px; height: 24px;
    border: 1px solid #30363d;
    background: rgba(255,255,255,0.05);
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .temp-btn:hover { background: rgba(255,255,255,0.12); }
  .temp-value {
    font-family: 'Share Tech Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    min-width: 44px;
    text-align: center;
  }
  .temp-value.confort { color: #f97316; text-shadow: 0 0 8px rgba(249,115,22,0.3); }
  .temp-value.defaut { color: #4fc3f7; }
  .temp-unit { font-size: 11px; color: #7d8590; }

  /* ACTIONS */
  .actions-row {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .btn-save {
    flex: 1;
    padding: 10px;
    background: linear-gradient(135deg, #f97316, #fb923c);
    border: none;
    border-radius: 8px;
    color: white;
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: opacity 0.2s;
    text-transform: uppercase;
  }
  .btn-save:hover { opacity: 0.85; }
  .btn-reset {
    padding: 10px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #7d8590;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }
  .btn-reset:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* FOOTER */
  .footer {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-info {
    font-size: 10px;
    color: #7d8590;
    font-family: 'Share Tech Mono', monospace;
  }
  .save-status {
    font-size: 10px;
    font-family: 'Share Tech Mono', monospace;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .save-status.ok { color: #3fb950; border: 1px solid rgba(63,185,80,0.3); }
  .save-status.saving { color: #f97316; border: 1px solid rgba(249,115,22,0.3); }
  .save-status.error { color: #f85149; border: 1px solid rgba(248,81,73,0.3); }
`;

// ============================================================
// MAIN ELEMENT
// ============================================================
class WidgetScheduleChauffage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._zone = null;
    this._data = null;
    this._saveStatus = '';
    this._initialized = false;
    this._nextId = 10;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadData();
    }
  }

  setConfig(config) {
    this._config = config;
    this._zone = config.zone || 'sejour';
  }

  getCardSize() { return 6; }

  static getStubConfig() { return { zone: 'sejour' }; }

  _loadData() {
    const meta = ZONES_META[this._zone];
    if (!meta) return;
    const storage = new ScheduleStorage(this._hass, meta.entity_base);
    const loaded = storage.load();
    this._data = loaded || JSON.parse(JSON.stringify(DEFAULT_CONFIGS[this._zone]));
    this._render();
  }

  async _saveData() {
    this._saveStatus = 'saving';
    this._updateSaveStatus();
    const meta = ZONES_META[this._zone];
    const storage = new ScheduleStorage(this._hass, meta.entity_base);
    try {
      await storage.save(this._data);
      this._saveStatus = 'ok';
    } catch(e) {
      this._saveStatus = 'error';
    }
    this._updateSaveStatus();
    setTimeout(() => { this._saveStatus = ''; this._updateSaveStatus(); }, 3000);
  }

  _updateSaveStatus() {
    const el = this.shadowRoot.querySelector('.save-status');
    if (!el) return;
    el.className = 'save-status ' + this._saveStatus;
    if (this._saveStatus === 'saving') el.textContent = '⏳ Sauvegarde...';
    else if (this._saveStatus === 'ok') el.textContent = '✓ Sauvegardé';
    else if (this._saveStatus === 'error') el.textContent = '✗ Erreur';
    else el.textContent = '';
  }

  // ============================================================
  // RENDER
  // ============================================================
  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = CARD_STYLES;
    shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = this._buildHTML();
    shadow.appendChild(card);
    this._bindEvents(card);
  }

  _buildHTML() {
    const zone = ZONES_META[this._zone];
    const data = this._data;
    const sensorState = this._hass && this._hass.states[zone.sensor]
      ? parseFloat(this._hass.states[zone.sensor].state)
      : null;

    return `
      <div class="topbar"></div>

      <div class="header">
        <div class="header-left">
          <span class="header-icon">${zone.icon}</span>
          <div>
            <div class="header-title">${zone.label}</div>
            <div class="header-sub">PLANNING · CHAUFFAGE</div>
          </div>
        </div>
        <div class="header-right">
          <div class="temp-badge">
            Défaut ${data.temp_defaut}°C
          </div>
          ${sensorState !== null ? `<div class="current-temp">${sensorState}°</div>` : ''}
        </div>
      </div>

      <!-- TIMELINE -->
      <div class="timeline-wrap">
        <div class="timeline-title">Aperçu semaine</div>
        <div class="timeline-days">
          ${DAYS.map((d, i) => this._buildTimelineRow(d, DAY_KEYS[i])).join('')}
        </div>
      </div>

      <!-- TEMPÉRATURES -->
      <div class="temps-row">
        <div class="temp-block">
          <div class="temp-block-label">🌡️ Température défaut</div>
          <div class="temp-control">
            <button class="temp-btn" data-action="temp-dec" data-type="defaut">−</button>
            <span class="temp-value defaut">${data.temp_defaut}</span>
            <span class="temp-unit">°C</span>
            <button class="temp-btn" data-action="temp-inc" data-type="defaut">+</button>
          </div>
        </div>
        <div class="temp-block">
          <div class="temp-block-label">🔥 Température confort</div>
          <div class="temp-control">
            <button class="temp-btn" data-action="temp-dec" data-type="confort">−</button>
            <span class="temp-value confort">${data.temp_confort}</span>
            <span class="temp-unit">°C</span>
            <button class="temp-btn" data-action="temp-inc" data-type="confort">+</button>
          </div>
        </div>
      </div>

      <!-- PLAGES -->
      <div class="plages-title">
        <span>Plages horaires</span>
        <button class="add-btn" data-action="add-plage">+ Ajouter</button>
      </div>
      <div class="plages-list">
        ${data.plages.map(p => this._buildPlage(p)).join('')}
      </div>

      <!-- ACTIONS -->
      <div class="actions-row">
        <button class="btn-save" data-action="save">💾 Sauvegarder</button>
        <button class="btn-reset" data-action="reset">↺ Reset</button>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-info">🟢 ${zone.label.toUpperCase()} · ${data.plages.filter(p=>p.actif).length} plage(s) actives</div>
        <div class="save-status"></div>
      </div>
    `;
  }

  _buildTimelineRow(dayLabel, dayKey) {
    const plages = this._data.plages.filter(p => p.actif && p.jours.includes(dayKey));
    const segments = plages.map(p => {
      const debut = this._timeToMin(p.debut);
      const fin = this._timeToMin(p.fin);
      const left = (debut / 1440 * 100).toFixed(1);
      const width = ((fin - debut) / 1440 * 100).toFixed(1);
      return `<div class="timeline-segment" style="left:${left}%;width:${width}%"></div>`;
    }).join('');
    return `
      <div class="timeline-row">
        <span class="timeline-day-label">${dayLabel}</span>
        <div class="timeline-bar-bg">${segments}</div>
      </div>
    `;
  }

  _buildPlage(p) {
    const joursHTML = DAY_KEYS.map((k, i) => `
      <span class="jour-btn ${p.jours.includes(k) ? 'active' : ''}"
            data-action="toggle-jour" data-plage="${p.id}" data-jour="${k}">
        ${DAYS[i]}
      </span>
    `).join('');

    return `
      <div class="plage-block ${p.actif ? '' : 'inactive'}" data-plage-id="${p.id}">
        <div class="plage-header">
          <div class="plage-header-left">
            <div class="toggle ${p.actif ? 'on' : ''}" data-action="toggle-plage" data-plage="${p.id}"></div>
            <input class="plage-label-input" type="text" value="${p.label}"
                   data-action="edit-label" data-plage="${p.id}" />
          </div>
          <button class="delete-btn" data-action="delete-plage" data-plage="${p.id}">🗑</button>
        </div>
        <div class="plage-times">
          <span class="time-label">De</span>
          <input class="time-input" type="time" value="${p.debut}"
                 data-action="edit-debut" data-plage="${p.id}" />
          <span class="time-arrow">→</span>
          <span class="time-label">à</span>
          <input class="time-input" type="time" value="${p.fin}"
                 data-action="edit-fin" data-plage="${p.id}" />
        </div>
        <div class="plage-jours">${joursHTML}</div>
      </div>
    `;
  }

  // ============================================================
  // EVENTS
  // ============================================================
  _bindEvents(card) {
    card.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      const plageId = t.dataset.plage ? parseInt(t.dataset.plage) : null;

      switch(action) {
        case 'toggle-plage': {
          const p = this._data.plages.find(x => x.id === plageId);
          if (p) { p.actif = !p.actif; this._render(); }
          break;
        }
        case 'toggle-jour': {
          const p = this._data.plages.find(x => x.id === plageId);
          const jour = t.dataset.jour;
          if (p) {
            const idx = p.jours.indexOf(jour);
            if (idx >= 0) p.jours.splice(idx, 1);
            else p.jours.push(jour);
            this._render();
          }
          break;
        }
        case 'delete-plage': {
          this._data.plages = this._data.plages.filter(x => x.id !== plageId);
          this._render();
          break;
        }
        case 'add-plage': {
          this._data.plages.push({
            id: this._nextId++,
            label: 'Nouvelle plage',
            jours: ['mon'],
            debut: '08:00',
            fin: '10:00',
            actif: true
          });
          this._render();
          break;
        }
        case 'temp-inc':
        case 'temp-dec': {
          const type = t.dataset.type;
          const step = 0.5;
          const inc = action === 'temp-inc' ? step : -step;
          if (type === 'defaut') this._data.temp_defaut = Math.round((this._data.temp_defaut + inc) * 2) / 2;
          else this._data.temp_confort = Math.round((this._data.temp_confort + inc) * 2) / 2;
          this._render();
          break;
        }
        case 'save': this._saveData(); break;
        case 'reset': {
          this._data = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[this._zone]));
          this._render();
          break;
        }
      }
    });

    // Input events (change, not click)
    card.addEventListener('change', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const action = t.dataset.action;
      const plageId = t.dataset.plage ? parseInt(t.dataset.plage) : null;
      const p = this._data.plages.find(x => x.id === plageId);
      if (!p) return;

      if (action === 'edit-debut') { p.debut = t.value; this._refreshTimeline(); }
      else if (action === 'edit-fin') { p.fin = t.value; this._refreshTimeline(); }
      else if (action === 'edit-label') { p.label = t.value; }
    });
  }

  _refreshTimeline() {
    const timelineEl = this.shadowRoot.querySelector('.timeline-days');
    if (!timelineEl) return;
    timelineEl.innerHTML = DAYS.map((d, i) => this._buildTimelineRow(d, DAY_KEYS[i])).join('');
  }

  // ============================================================
  // UTILS
  // ============================================================
  _timeToMin(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
}

customElements.define('widget-schedule-chauffage', WidgetScheduleChauffage);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'widget-schedule-chauffage',
  name: 'Widget Schedule Chauffage',
  description: 'Modifier visuellement les plannings schedule_state par zone',
  preview: true,
});

console.info('%c WIDGET-SCHEDULE-CHAUFFAGE %c v1.0 ', 'color:white;background:#f97316;font-weight:bold;', 'color:#f97316;background:white;');
