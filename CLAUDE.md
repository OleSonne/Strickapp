# Anweisungen für Claude

Strickapp ist eine Web-App (PWA) zum Stricken für iPad und iPhone. Mit dem Nutzer auf Deutsch sprechen.

## Aktuelle Phase: M2, Projekte

M2 ist als Web-App gebaut. Offen: Veröffentlichung und Test auf dem iPad.
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
- Das Playwright-Image muss dieselbe Version wie `@playwright/test` haben.
- WebKit in Playwright ist nicht Safari. Auf dem iPad Ungeprüftes klar benennen.

## Technik (siehe docs/decisions/0002-web-app.md)

- TypeScript (strict), React, Vite, IndexedDB über `idb`, offline per Service Worker.
- Neue Abhängigkeiten nur nach Rückfrage, Versionen fest eintragen.
- Keine Inhalte von fremden Servern laden (Schriften, Skripte, Analyse).

## Architektur

- `src/core/`: Fachlogik als reine Funktionen, ohne React und Browser-Speicher.
- `src/data/`: einziger Zugriff auf IndexedDB. Ändern immer in einer Transaktion.
- `src/components/`: Anzeige, bekommt Daten und Aktionen als Props.

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
