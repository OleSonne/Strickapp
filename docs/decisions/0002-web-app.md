# 0002: Web-App statt nativer App

**Status:** Angenommen (2026-11-25), ersetzt 0001

## Entscheidung

PWA mit TypeScript, React, Vite und IndexedDB, veröffentlicht über GitHub Pages.

## Gründe

- Swift Playground hält die App nicht geöffnet, das Starten ist umständlich
- Kein Mac, kein kostenpflichtiges Apple Developer Program
- Start per Icon, automatische Updates, unter Linux vollständig testbar

## Nachteile

- Keine Apple-Frameworks für Texterkennung und Übersetzung
- Browserdaten können verloren gehen, daher Sichern und Wiederherstellen

Der Swift-Stand bleibt auf dem Branch `feature/m2-projects`.
