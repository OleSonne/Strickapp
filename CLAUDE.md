# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Strickapp ist eine Web-App (PWA) zum Stricken für iPad und iPhone. Mit dem Nutzer auf Deutsch sprechen.

## Aktuelle Phase: M4, Nachbesserung

M4 ist veröffentlicht. Tipps am Schritt und Strickschriften (T-022 bis T-024) sind
gebaut, dazu automatische Gittersuche und neue Reihenansicht (T-026). Veröffentlichung
und iPad-Test stehen aus. Danach folgt M5.
Diesen Abschnitt bei jedem Meilenstein aktualisieren.

## Arbeitsablauf

1. Vor der Arbeit `todos/in-progress.md` und `docs/PLAN.md` lesen.
2. Aufgabe von `todos/backlog.md` nach `todos/in-progress.md` verschieben.
   Höchstens eine Aufgabe gleichzeitig.
3. In kleinen, einzeln prüfbaren Schritten umsetzen, inklusive Tests.
4. Fertige Aufgaben mit Datum nach `todos/done.md` verschieben. Regeln für
   „fertig“: siehe unten.
5. README aktualisieren, wenn sich Struktur, Setup oder Umfang ändern.

- Nichts bauen, was nicht im Plan steht. Ideen kommen ins Backlog.
- Bei unklaren Produktfragen nachfragen, technische Details selbst entscheiden.
- Wichtige Technikentscheidungen als `docs/decisions/NNNN-titel.md` festhalten.

## Umgebung

- Kein Node auf dem Rechner: alle Befehle im Docker-Container, siehe README.

```sh
# Voranstellen; danach z. B. `strick npm test`
strick() { docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.65.1-noble "$@"; }

strick npm ci
strick npm test                                          # Vitest, src/**/*.test.ts
strick npx vitest run src/core/core.test.ts -t "Name"    # einzelner Unit-Test
strick npm run build                                     # Typprüfung (tsc) und Vite
strick npm run e2e                                       # testet dist/, vorher bauen
strick npx playwright test e2e/import.spec.ts --project=ipad -g "Name"
```

- Die Shell-Funktion gilt nur im selben Aufruf. Einen Linter gibt es nicht.
- E2E-Projekte: `ipad` und `iphone` (WebKit), nur `offline.spec.ts` läuft in Chromium.
- CI testet jeden Push und veröffentlicht `main` auf GitHub Pages (Basispfad
  `/Strickapp/`). Ein Push auf `main` ist also eine Veröffentlichung.
- Das Playwright-Image muss dieselbe Version wie `@playwright/test` haben,
  auch in `.github/workflows/ci.yml`.
- WebKit in Playwright ist nicht Safari. Auf dem iPad Ungeprüftes klar benennen.

## Technik (siehe docs/decisions/0002-web-app.md)

- TypeScript (strict), React, Vite, IndexedDB über `idb`, offline per Service Worker.
- Neue Abhängigkeiten nur nach Rückfrage, Versionen fest eintragen.
- Keine Inhalte von fremden Servern laden (Schriften, Skripte, Analyse).

## Architektur

- `src/core/`: Fachlogik als reine Funktionen, ohne React und Browser-Speicher.
- `src/core/import/`: Anleitung erkennen. `lines` (Layout) → `parse` (Regeln) →
  Prüfansicht → `build` (Projekt).
- `src/data/`: einziger Zugriff auf IndexedDB und pdf.js. Ändern immer in einer Transaktion.
- `src/components/`: Anzeige, bekommt Daten und Aktionen als Props.

Datenfluss: `App.tsx` hält den Zustand. Komponenten melden Änderungen als Funktion
`Project → Project` aus `core/project.ts`, `store.updateProject` wendet sie in einer
Transaktion auf den gespeicherten Stand an, danach lädt `run` alles neu und zeigt Fehler.
Das gewählte Projekt steht im URL-Hash.

Regeln in `core/project.ts`, die leicht verletzt werden:

- `completedCount` ist der Index des aktuellen Schritts, nicht ein Haken je Schritt.
- Wiederholungen sind zusammenhängend und überlappen nie. Verschieben darf sie nicht zerreißen.
- Weitergehen schreibt `history` (Rückgängig). Einfügen, Löschen und Verschieben laufen
  über `withSteps`, das sie leert. Wiederholungen ändern leert sie ebenfalls. Nur
  Anhängen (`addSteps`) und Textänderungen (`editStep`) lassen sie stehen.
- Strickschrift-Reihen sind normale Schritte mit `step.chart`. Reihe 1 ist unten.

Neue Felder an `Project` oder `Step`: auch `upgrade` (alte Daten) und Prüfung samt
Kopie in `core/backup.ts` anpassen. Neue IndexedDB-Version: Test wie `e2e/upgrade.spec.ts`.

Original-PDFs liegen in einem eigenen Store `sources` (Schlüssel: Projekt-ID) und
fehlen in der Sicherung. Code muss mit fehlendem Original umgehen.

## Code

- Bezeichner auf Englisch, Oberfläche immer auf Deutsch.
- Kein `any`. Daten von außen (Dateien) vollständig prüfen.
- Fehler behandeln und verständlich anzeigen, nicht verschlucken.
- Kommentare erklären das Warum.

## Bedienung

- Beim Stricken sind die Hände beschäftigt: große Tippflächen (mindestens
  44 × 44 px, Zähler deutlich größer), wenige Schritte, Rückgängig.
- Zählerstände sofort speichern. Ein Absturz darf keinen Fortschritt kosten.
- Alles Wesentliche funktioniert offline.
- Textvergrößerung, VoiceOver, Tastatur und Dark Mode unterstützen. Information nie nur über
  Farbe vermitteln.
- Texte direkt auf Deutsch in den Komponenten, die App bleibt einsprachig.

## Daten und Datenschutz

- Daten bleiben lokal. Tracking, Konten oder Cloud nur nach Freigabe.
- Keine Secrets ins Repo. Das GitHub-Repo ist öffentlich.
- Änderungen an IndexedDB und Sicherungsformat nach Veröffentlichung brauchen eine Migration.
- Keine urheberrechtlich geschützten Strickanleitungen ins Repo legen, auch nicht
  als Testdaten. Beispiele selbst schreiben.

## Anleitungen einlesen

- Nie Schritte erfinden oder still weglassen. Unsicheres markieren.
- Originalanleitung behalten und jederzeit anzeigen können.
- Tipps und Kontrollen gehören zum passenden Schritt, nie als eigener Schritt.
- Strickschriften werden Reihe für Reihe durchgegangen, mit erkannten Farben.
- Jeder erkannte Schritt ist vom Nutzer korrigierbar.
- Erkennung und Fortschrittslogik ohne UI-Abhängigkeit schreiben, damit sie
  direkt testbar sind.
- Anleitungen nie an externe Dienste senden, Erkennung und Übersetzung laufen auf
  dem Gerät.
- Private Beispiele liegen in `beispiele/` (per .gitignore ausgeschlossen). Nie
  committen und keine Textstellen daraus in Code, Tests oder Doku übernehmen.

## Tests

- Fachlogik mit Unit-Tests absichern, auch Randfälle (Zähler bei 0, Rückgängig).
- Fehler erst mit einem Test nachstellen, dann beheben.
- Wichtige Abläufe mit Playwright testen (iPad- und iPhone-Größe), neue Funktionen
  zusätzlich auf dem iPad.

## Git

- Nur committen oder pushen, wenn der Nutzer darum bittet.
- Kleine Commits, englisch im Imperativ. Ab dem ersten Code Feature-Branches.

## Fertig heißt

- [ ] Verhält sich wie im Todo beschrieben
- [ ] Gebaut und Tests grün, oder als ungeprüft benannt
- [ ] Barrierefreiheit und Dark Mode berücksichtigt
- [ ] Todos und Dokumentation aktuell
