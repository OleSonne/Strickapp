# Plan

**Status:** Freigegeben am 2026-11-25.

## Vom Nutzer festgelegt

- Die App liest eine Strickanleitung ein und erstellt daraus ein Projekt.
- Das Projekt wird Schritt für Schritt als Anleitung durchgegangen.
- Mehrere Projekte sind möglich, jedes speichert seinen eigenen Stand.
- Geräte: iPhone und iPad. Kein Mac vorhanden.
- Anleitungen auf Deutsch und Englisch, in der App immer Deutsch.
- Kein KI-Dienst im Internet.
- Nur für private Nutzung, kein App Store.
- Vorerst nur Stricken, kein Häkeln.
- Schritte englischer Anleitungen erscheinen auf Deutsch.
- Zielgerät ist zunächst das iPad. Das iPhone folgt später.
- Testgerät: iPad Air (4. Generation), iPadOS 26.5.2, Swift Playground installiert.

## Vorschlag für den Ablauf

1. **Importieren:** Anleitung auswählen.
2. **Erkennen:** Text auslesen, in Abschnitte und Schritte zerlegen.
3. **Prüfen:** Nutzer korrigiert Schritte und wählt die Größe. Das Original
   bleibt einsehbar, unsichere Stellen werden markiert.
4. **Stricken:** aktueller Schritt groß, weiter, zurück, Wiederholungen zählen.
5. **Fortsetzen:** Projektliste mit Fortschritt, Einstieg an der letzten Stelle.

## Vorschlag für das Datenmodell

| Typ | Inhalt |
| --- | --- |
| `Project` | Name, gewählte Größe, Originalanleitung |
| `Section` | Teil der Anleitung, z. B. Ärmel |
| `Step` | Anweisung, Originaltext, Reihe/Runde, Farbe, Maschenkontrolle, Bild |
| `Repeat` | Schritte von bis, Abbruchbedingung |
| `Progress` | aktueller Schritt, Wiederholung, Zeitpunkt |

## Offene Fragen

1. Wie kommt der Code vom Repo aufs iPad?

## Build-Weg ohne Mac (Vorschlag)

- Fachlogik als Swift Package, unter Linux im Docker-Container getestet
- Build und Tests der App per GitHub Actions auf macOS
- Installation: zuerst Swift Playground auf dem iPad, noch zu prüfen
- Später für das iPhone: Sideloading (muss regelmäßig erneuert werden) oder
  TestFlight (kostenpflichtiges Apple Developer Program)

## Auswertung der Beispiele (2026-11-25)

Fünf PDFs: drei deutsch, zwei englisch. Vier enthalten Text, eines enthält die
Schrift nur grafisch und braucht Texterkennung.

| Beobachtung | Folge für die App |
| --- | --- |
| Nummerierte Reihen, aber auch reiner Fließtext | Regeln für Reihen, sonst ein Schritt pro Satz |
| Größen als `a (b)`, `a (b) c` oder zehn Werte im Wechsel | Größenwert per Position auswählen |
| Klammern auch für Maschenzahlen und Hinweise | Nur Klammern mit passender Werteanzahl als Größen lesen |
| Wiederholungen: feste Anzahl, bis Reihe, bis Maschenzahl, bis cm | Vier Arten von Abbruchbedingung |
| Verweise wie „wie Reihe 1“ | Verweis auflösen |
| Parallele Anweisungen, z. B. Knopfloch alle paar Streifen | Erinnerung, zunächst von Hand anlegen |
| Varianten in zwei Spalten, z. B. linker/rechter Fuß | Variante wählen, Spalten über Position trennen |
| Teile doppelt stricken (Ärmel, zweiter Schuh) | Abschnitt mehrfach durchlaufen |
| Farbwechsel, Maschenkontrolle am Ende | Eigene Felder am Schritt |
| Strickschrift als Bild | Bild am Schritt anzeigen |
| Abkürzung mehrdeutig: CO als Anschlagen und Abketten | Markieren und nachfragen |
| Einleitung, Copyright, Links, Seitenzahlen | Als Nicht-Schritte ausblendbar |

## Vorschlag zur Erkennung

1. Text aus PDF mit Positionen (PDFKit). Seiten ohne Text per Texterkennung
   auf dem Gerät (Vision).
2. Abschnitte, Reihen, Größen und Wiederholungen mit festen Regeln erkennen.
3. Englisch: Strickbegriffe und typische Satzmuster über ein Glossar. Restlichen
   Fließtext mit Apples Übersetzung auf dem Gerät, falls verfügbar (zu prüfen).
   Unübersetztes bleibt im Original und wird markiert.
4. Nutzer prüft und korrigiert alles. Das ist fester Teil des Imports.

Strickschriften werden als Bild gezeigt, nicht interpretiert.

## Meilensteine

| Nr. | Ergebnis |
| --- | --- |
| M0 | Plan freigegeben, Build-Weg geklärt |
| M1 | App startet auf dem iPad, CI baut und testet |
| M2 | Mehrere Projekte, Schritte von Hand, Stand wird gespeichert |
| M3 | Schritt-für-Schritt-Ansicht mit Wiederholungen und Rückgängig |
| M4 | PDF-Import mit Text- und Regelerkennung, mit Prüfansicht |
| M5 | Englische Anleitungen auf Deutsch |
| M6 | Feinschliff, Barrierefreiheit, iPhone-Layout |

## Später

Garn und Nadeln am Projekt, Fotoimport, Maschenproben-Rechner, Widget,
Apple Watch, iCloud

## Risiken

- **Erkennung:** Anleitungen sind sehr unterschiedlich aufgebaut (Abkürzungen,
  Größen in Klammern, „gleichzeitig“). Früh mit echten Beispielen testen.
- **Kein Xcode unter Linux:** Kein Mac vorhanden, siehe Build-Weg.
- **Installation:** Ohne kostenpflichtiges Apple Developer Program ist sie auf dem
  iPhone umständlich.
- **Geräte-KI:** Das iPad Air 4 (A14) unterstützt Apple Intelligence nicht. Die
  Erkennung muss mit festen Regeln auskommen.
- **Urheberrecht:** Importierte Anleitungen bleiben privat auf dem Gerät.
