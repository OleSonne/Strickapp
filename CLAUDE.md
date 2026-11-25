# Anweisungen für Claude

Strickapp ist eine iOS-App zum Stricken. Mit dem Nutzer auf Deutsch sprechen.

## Aktuelle Phase: Planung

Noch keinen App-Code schreiben, bis der Nutzer den Plan in `docs/PLAN.md`
freigegeben hat. Danach diesen Abschnitt aktualisieren.

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
- Build- und Testbefehle hier eintragen, sobald Mac oder CI verfügbar ist.

## Technik (Vorschlag, siehe docs/decisions/0001-technik.md)

- Swift, SwiftUI, SwiftData, ab iOS 17.
- Apple-Frameworks bevorzugen. Neue Abhängigkeiten nur nach Rückfrage.

## Architektur

- Nach Funktion ordnen: `Strickapp/Features/<Name>/`.
- Views zeigen an. Fachlogik (Zählen, Umrechnen) liegt in testbaren Typen
  ohne SwiftUI-Import.
- `@Observable` für eigenen Zustand, `@Query` für einfache Listen. Ein ViewModel
  nur anlegen, wenn die View nennenswerte Logik hat.
- Features hängen nicht voneinander ab. Gemeinsames kommt nach `Models`,
  `Services` oder `DesignSystem`.
- Abhängigkeiten übergeben statt neue Singletons anzulegen.

## Code

- Bezeichner auf Englisch, Oberfläche zuerst auf Deutsch.
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
- Texte über den String Catalog, keine fest verdrahteten Zeichenketten.
- Apple Human Interface Guidelines beachten.

## Daten und Datenschutz

- Daten bleiben lokal. Tracking, Konten oder Cloud nur nach Freigabe.
- Keine Secrets ins Repo. Das GitHub-Repo ist öffentlich.
- Änderungen am Datenmodell nach Veröffentlichung brauchen eine Migration.
- Keine urheberrechtlich geschützten Strickanleitungen einbinden.

## Tests

- Fachlogik mit Unit-Tests absichern, auch Randfälle (Zähler bei 0, Rückgängig).
- Fehler erst mit einem Test nachstellen, dann beheben.
- UI-Tests nur für die wichtigsten Abläufe.

## Git

- Nur committen oder pushen, wenn der Nutzer darum bittet.
- Kleine Commits, englisch im Imperativ. Ab dem ersten Code Feature-Branches.

## Fertig heißt

- [ ] Verhält sich wie im Todo beschrieben
- [ ] Gebaut und Tests grün, oder als ungeprüft benannt
- [ ] Barrierefreiheit und Dark Mode berücksichtigt
- [ ] Todos und Dokumentation aktuell
