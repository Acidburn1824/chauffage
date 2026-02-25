# 🔥 Widget Schedule Chauffage

**Carte Lovelace pour Home Assistant**  
Modifier visuellement les plannings `schedule_state` par zone de chauffage, directement depuis le dashboard.

---

## ✨ Fonctionnalités

| | Fonctionnalité |
|---|---|
| 🕐 | Modifier les heures début/fin de chaque plage |
| 📅 | Choisir les jours actifs par plage |
| 🌡️ | Ajuster les températures défaut et confort (pas 0.5°C) |
| 🔘 | Activer/désactiver une plage sans la supprimer |
| ➕ | Ajouter / supprimer des plages |
| 📊 | Timeline visuelle de la semaine |
| 💾 | Sauvegarde dans des `input_text` HA (multi-appareils) |

---

## 📦 Installation

### HACS (recommandé)

1. **HACS** → **Frontend** → ⋮ → **Dépôts personnalisés**
2. URL : `https://github.com/Acidburn1824/widget-schedule-chauffage` — Catégorie : **Lovelace**
3. Cliquer **Installer** → **Vider le cache** (`Ctrl+F5`)

### Installation manuelle

1. Télécharger `widget-schedule-chauffage.js`
2. Copier dans `/config/www/`
3. **Paramètres → Tableaux de bord → Ressources** → Ajouter :
```
URL: /local/widget-schedule-chauffage.js
Type: Module JavaScript
```

---

## 🔧 Prérequis

### 1. Intégration schedule_state

Installer via HACS : [aneeshd/schedule_state](https://github.com/aneeshd/schedule_state)

### 2. Helpers input_text

Ajouter dans `configuration.yaml` (ou dans un fichier inclus) :

```yaml
input_text:
  schedule_sejour_0:
    name: Schedule Séjour 0
    max: 255
  schedule_sejour_1:
    name: Schedule Séjour 1
    max: 255
  schedule_sejour_meta:
    name: Schedule Séjour Meta
    max: 255

  schedule_parents_0:
    name: Schedule Parents 0
    max: 255
  schedule_parents_1:
    name: Schedule Parents 1
    max: 255
  schedule_parents_meta:
    name: Schedule Parents Meta
    max: 255

  schedule_aureline_0:
    name: Schedule Auréline 0
    max: 255
  schedule_aureline_1:
    name: Schedule Auréline 1
    max: 255
  schedule_aureline_meta:
    name: Schedule Auréline Meta
    max: 255

  schedule_sdb_0:
    name: Schedule SDB 0
    max: 255
  schedule_sdb_1:
    name: Schedule SDB 1
    max: 255
  schedule_sdb_meta:
    name: Schedule SDB Meta
    max: 255
```

### 3. Sensors schedule_state

Les sensors doivent lire leurs valeurs depuis les `input_text`. Exemple pour le séjour dans `sensors.yaml` :

```yaml
- platform: schedule_state
  name: "Schedule Sejour Consigne"
  default_state: "{{ states('input_text.schedule_sejour_temp_defaut') | default('16') }}"
  events:
    # Les plages sont gérées dynamiquement par la carte
```

> 💡 La carte sauvegarde la configuration dans les `input_text`. Les sensors `schedule_state` doivent être configurés pour lire ces valeurs via templates.

---

## 🃏 Configuration de la carte

```yaml
type: custom:widget-schedule-chauffage
zone: sejour
```

### Zones disponibles

| Zone | Valeur `zone` |
|------|--------------|
| Séjour | `sejour` |
| Parents | `parents` |
| Auréline | `aureline` |
| SDB Étage | `sdb` |

### Exemple dashboard complet

```yaml
type: vertical-stack
cards:
  - type: custom:widget-schedule-chauffage
    zone: sejour
  - type: custom:widget-schedule-chauffage
    zone: parents
  - type: custom:widget-schedule-chauffage
    zone: aureline
  - type: custom:widget-schedule-chauffage
    zone: sdb
```

---

## 🎨 Style

Même style visuel que les cartes Proxmox et Speedtest :
- Fond sombre avec dégradé
- Accent cyan `#4fc3f7` et orange `#f97316`
- Fonts Rajdhani + Share Tech Mono
- Timeline visuelle par jour de la semaine

---

## 📄 Licence

MIT © [Acidburn1824](https://github.com/Acidburn1824)
