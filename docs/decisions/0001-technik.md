# 0001: Technische Grundlage

**Status:** Ersetzt durch 0002

## Entscheidung

Native iOS-App mit Swift, SwiftUI und SwiftData, ab iOS 17.

## Gründe

- Guter Zugang zu Widgets, Live Activities und Barrierefreiheit
- SwiftData passt zu lokaler Speicherung und setzt iOS 17 voraus
- Kaum externe Abhängigkeiten

## Nachteile

- Zum Bauen ist macOS nötig, entwickelt wird bisher unter Linux
- Nur Apple-Geräte. Für Android wäre Flutter oder React Native zu prüfen.
