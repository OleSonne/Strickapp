# Plan

**Status:** Entwurf, noch nicht freigegeben. Der Funktionsumfang ist ein Vorschlag.

## Offene Fragen

1. Für wen ist die App: nur für dich oder für den App Store?
2. Welches Problem beim Stricken soll sie zuerst lösen?
3. Gibt es Zugang zu einem Mac oder iPhone? (siehe Risiken)
4. Reicht iPhone, oder auch iPad und Apple Watch?
5. Welche Sprachen: nur Deutsch oder auch Englisch?
6. Nur Stricken oder auch Häkeln?

## Vorschlag für die erste Version

- **Projekte:** anlegen, bearbeiten, archivieren, Notizen und Foto
- **Reihenzähler:** pro Projekt, mehrere Zähler, Rückgängig
- **Material:** Garn und Nadelstärke am Projekt festhalten

## Mögliche spätere Versionen

- Maschenproben-Rechner
- Garnvorrat
- Anleitungen als PDF mit Markierung der aktuellen Reihe
- Strickschriften (Charts)
- Widget, Live Activity, Apple Watch
- iCloud-Synchronisierung

## Meilensteine

| Nr. | Ergebnis |
| --- | --- |
| M0 | Plan freigegeben, Build-Weg geklärt |
| M1 | Xcode-Projekt startet, CI baut und testet |
| M2 | Projekte anlegen und speichern |
| M3 | Reihenzähler |
| M4 | Material, Feinschliff, Barrierefreiheit |
| M5 | TestFlight, danach gegebenenfalls App Store |

## Risiken

- **Kein Xcode unter Linux:** Bauen braucht einen Mac, eine Cloud-Mac-Lösung oder
  CI mit macOS. Vor M1 klären.
- **Apple Developer Program:** TestFlight und App Store erfordern eine
  kostenpflichtige Mitgliedschaft.
