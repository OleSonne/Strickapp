# Strickapp

Eine iOS-App, die beim Stricken begleitet.

> **Status:** Planung. Es gibt noch keinen App-Code.

## Ziel

Der genaue Funktionsumfang wird gerade festgelegt. Vorschläge und offene Fragen
stehen in [docs/PLAN.md](docs/PLAN.md).

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
