# Strickapp

Eine iOS-App, die Strickanleitungen einliest und Schritt für Schritt durch das
Projekt führt.

> **Status:** M2, Projekte und Schritte von Hand.

## Ziel

- Strickanleitung einlesen und daraus ein Projekt erstellen
- Projekt Schritt für Schritt durchgehen
- Mehrere Projekte, jedes mit eigenem gespeicherten Stand

Details und offene Fragen: [docs/PLAN.md](docs/PLAN.md)

## Technik

| Bereich | Wahl |
| --- | --- |
| Sprache | Swift |
| Oberfläche | SwiftUI |
| Datenhaltung | SwiftData, lokal auf dem Gerät |
| Mindestversion | iOS 17 |
| Tests | Swift Testing |

Begründung: [docs/decisions/0001-technik.md](docs/decisions/0001-technik.md)

## Projektstruktur

```text
Strickapp.swiftpm/    App für Swift Playground und Xcode
├── App/              Einstiegspunkt, Navigation
├── Core/             Fachlogik ohne SwiftUI, unter Linux testbar
├── DesignSystem/     Wiederverwendbare Views
├── Features/         Ein Ordner pro Funktion
├── Models/           SwiftData-Modelle
└── Services/         Speicherung
Package.swift         Nur für Tests der Fachlogik
Tests/                Unit-Tests
docs/                 Plan und Entscheidungen
todos/                Aufgaben
CLAUDE.md             Arbeitsanweisungen für Claude
```

## Entwicklung

- **iPad:** Repo als ZIP laden, entpacken, `Strickapp.swiftpm` in Swift Playground
  öffnen.
- **Tests unter Linux:**

  ```sh
  docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/src:ro \
    -w /src swift:6.1 swift test --scratch-path /tmp/b
  ```
- **CI:** GitHub Actions testet die Fachlogik und baut die App auf macOS.
