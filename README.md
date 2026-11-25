# Strickapp

Eine iOS-App, die Strickanleitungen einliest und Schritt für Schritt durch das
Projekt führt.

> **Status:** Plan freigegeben. Es gibt noch keinen App-Code.

## Ziel

- Strickanleitung einlesen und daraus ein Projekt erstellen
- Projekt Schritt für Schritt durchgehen
- Mehrere Projekte, jedes mit eigenem gespeicherten Stand

Details und offene Fragen: [docs/PLAN.md](docs/PLAN.md)

## Technik (Vorschlag)

| Bereich | Wahl |
| --- | --- |
| Sprache | Swift |
| Oberfläche | SwiftUI |
| Datenhaltung | SwiftData, lokal auf dem Gerät |
| Mindestversion | iOS 17 |
| Tests | Swift Testing, XCUITest |

Begründung: [docs/decisions/0001-technik.md](docs/decisions/0001-technik.md)

## Projektstruktur

```text
Strickapp/            App-Code
├── App/              Einstiegspunkt, Navigation
├── Features/         Ein Ordner pro Funktion (View + Logik)
├── Models/           Datenmodelle
├── Services/         Speicherung, Benachrichtigungen usw.
├── DesignSystem/     Farben, Schriften, wiederverwendbare Views
├── Utilities/        Kleine Helfer und Extensions
└── Resources/        Assets, Übersetzungen
StrickappTests/       Unit-Tests
StrickappUITests/     UI-Tests
docs/                 Plan und Entscheidungen
todos/                Aufgaben
CLAUDE.md             Arbeitsanweisungen für Claude
```

## Entwicklung

Zum Bauen und Ausführen wird ein Mac mit Xcode benötigt (oder macOS in der CI).
Das Xcode-Projekt ist noch nicht angelegt, Anleitung folgt.
