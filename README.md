# Strickapp

Eine Web-App für iPad und iPhone, die Strickanleitungen einliest und Schritt für
Schritt durch das Projekt führt.

> **Status:** M3, Strickansicht mit Wiederholungen. Import folgt.

## Ziel

- Strickanleitung einlesen und daraus ein Projekt erstellen
- Projekt Schritt für Schritt durchgehen
- Mehrere Projekte, jedes mit eigenem gespeicherten Stand

Plan: [docs/PLAN.md](docs/PLAN.md), Technik:
[docs/decisions/0002-web-app.md](docs/decisions/0002-web-app.md)

## Daten

Projekte liegen nur im Browser des Geräts. Safari und die App auf dem
Home-Bildschirm haben getrennte Daten. Regelmäßig „Sichern“ nutzen.

## Projektstruktur

```text
src/core/         Fachlogik
src/data/         Speicherung (IndexedDB)
src/components/   Oberfläche
e2e/              Browser-Tests
public/           Icons
docs/, todos/     Plan, Entscheidungen, Aufgaben
CLAUDE.md         Arbeitsanweisungen für Claude
```

## Entwicklung

Mit Docker, ohne lokales Node:

```sh
docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.65.1-noble \
  sh -c 'npm ci && npm test && npm run build && npm run e2e'
```

GitHub Actions prüft jeden Push und veröffentlicht `main` auf GitHub Pages.
