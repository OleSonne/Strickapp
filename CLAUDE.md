# Anweisungen für Claude

Strickapp ist eine iOS-App zum Stricken. Mit dem Nutzer auf Deutsch sprechen.

## Aktuelle Phase: M1, Grundgerüst

Grundgerüst in `Strickapp.swiftpm`. Offen: Start auf dem iPad und CI bestätigen.
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

- Entwicklungsrechner ist Linux: Xcode, Simulator und SwiftUI gibt es hier nicht.
- Nie behaupten, etwas sei gebaut oder getestet, wenn das nicht passiert ist.
  Ungeprüftes klar benennen.
- Testbefehl für `Core` steht in der README. Die App selbst baut nur die CI (macOS)
  oder das iPad.
- Neue Dateien kommen automatisch ins App-Target. Nur ein Target, keine lokalen
  Pakete, damit Swift Playground das Projekt öffnen kann.

## Technik (siehe docs/decisions/0001-technik.md)

- Swift, SwiftUI, SwiftData, ab iOS/iPadOS 17.
- Zuerst für das iPad (Hoch- und Querformat, Split View), Layout aber so bauen,
  dass das iPhone später folgen kann.
- Apple-Frameworks bevorzugen. Neue Abhängigkeiten nur nach Rückfrage.

## Architektur

- Nach Funktion ordnen: `Strickapp.swiftpm/Features/<Name>/`.
- Views zeigen an. Fachlogik (Erkennung, Fortschritt) liegt in
  `Strickapp.swiftpm/Core/`, nur mit Foundation, ohne Apple-UI-Frameworks.
- `@Observable` für eigenen Zustand, `@Query` für einfache Listen. Ein ViewModel
  nur anlegen, wenn die View nennenswerte Logik hat.
- Features hängen nicht voneinander ab. Gemeinsames kommt nach `Models`,
  `Services` oder `DesignSystem`.
- Abhängigkeiten übergeben statt neue Singletons anzulegen.

## Code

- Bezeichner auf Englisch, Oberfläche immer auf Deutsch.
- Swift API Design Guidelines befolgen, Dateien und Views klein halten.
- Kein Force-Unwrap (`!`) und kein `try!` im App-Code.
- Nebenläufigkeit mit `async/await`, UI-Zustand auf dem `@MainActor`.
- Fehler behandeln und verständlich anzeigen, nicht verschlucken.
- Kommentare erklären das Warum.

## Bedienung

- Beim Stricken sind die Hände beschäftigt: große Tippflächen (mindestens
  44 × 44 pt, Zähler deutlich größer), wenige Schritte, Rückgängig.
- Zählerstände sofort speichern. Ein Absturz darf keinen Fortschritt kosten.
- Alles Wesentliche funktioniert offline.
- Dynamic Type, VoiceOver und Dark Mode unterstützen. Information nie nur über
  Farbe vermitteln.
- Texte direkt auf Deutsch in den Views. Die App bleibt einsprachig, ein String
  Catalog ist dafür nicht nötig.
- Apple Human Interface Guidelines beachten.

## Daten und Datenschutz

- Daten bleiben lokal. Tracking, Konten oder Cloud nur nach Freigabe.
- Keine Secrets ins Repo. Das GitHub-Repo ist öffentlich.
- Änderungen am Datenmodell nach Veröffentlichung brauchen eine Migration.
- Keine urheberrechtlich geschützten Strickanleitungen ins Repo legen, auch nicht
  als Testdaten. Beispiele selbst schreiben.

## Anleitungen einlesen

- Nie Schritte erfinden oder still weglassen. Unsicheres markieren.
- Originalanleitung behalten und jederzeit anzeigen können.
- Jeder erkannte Schritt ist vom Nutzer korrigierbar.
- Erkennung und Fortschrittslogik ohne UI-Abhängigkeit schreiben, damit sie auch
  unter Linux testbar sind.
- Anleitungen nie an externe Dienste senden, Erkennung und Übersetzung laufen auf
  dem Gerät.
- Private Beispiele liegen in `beispiele/` (per .gitignore ausgeschlossen). Nie
  committen und keine Textstellen daraus in Code, Tests oder Doku übernehmen.

## Tests

- Fachlogik mit Unit-Tests absichern, auch Randfälle (Zähler bei 0, Rückgängig).
- Fehler erst mit einem Test nachstellen, dann beheben.
- UI-Tests gibt es vorerst nicht, Abläufe auf dem iPad prüfen.

## Git

- Nur committen oder pushen, wenn der Nutzer darum bittet.
- Kleine Commits, englisch im Imperativ. Ab dem ersten Code Feature-Branches.

## Fertig heißt

- [ ] Verhält sich wie im Todo beschrieben
- [ ] Gebaut und Tests grün, oder als ungeprüft benannt
- [ ] Barrierefreiheit und Dark Mode berücksichtigt
- [ ] Todos und Dokumentation aktuell
