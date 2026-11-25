# Plan

**Status:** Freigegeben am 2026-11-25.

## Vom Nutzer festgelegt

- Die App liest eine Strickanleitung ein und erstellt daraus ein Projekt.
- Das Projekt wird Schritt für Schritt als Anleitung durchgegangen.
- Mehrere Projekte sind möglich, jedes speichert seinen eigenen Stand.
- Geräte: iPhone und iPad. Kein Mac vorhanden.
- Anleitungen auf Deutsch und Englisch, in der App immer Deutsch.
- Web-App mit Icon auf dem Home-Bildschirm statt nativer App.
- Kein KI-Dienst im Internet.
- Nur für private Nutzung, kein App Store.
- Vorerst nur Stricken, kein Häkeln.
- Schritte englischer Anleitungen erscheinen auf Deutsch.
- Zielgerät ist zunächst das iPad. Das iPhone folgt später.
- Testgerät: iPad Air (4. Generation), iPadOS 26.5.2.

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

1. Wie gut ist Texterkennung im Browser (z. B. Tesseract, vor M4 prüfen)?
2. Wie weit reicht das Glossar für englischen Fließtext?

## Veröffentlichung

GitHub Actions testet jeden Push und stellt `main` auf GitHub Pages bereit. Der Code
ist öffentlich, Projekte und Anleitungen bleiben auf dem Gerät.

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

1. Text aus PDF mit Positionen (pdf.js). Seiten ohne Text per Texterkennung
   im Browser, falls gut genug (zu prüfen).
2. Abschnitte, Reihen, Größen und Wiederholungen mit festen Regeln erkennen.
3. Englisch: Strickbegriffe und typische Satzmuster über ein Glossar. Unübersetztes bleibt im Original und wird markiert.
4. Nutzer prüft und korrigiert alles. Das ist fester Teil des Imports.

Strickschriften werden als Bild gezeigt, nicht interpretiert.

## Meilensteine

| Nr. | Ergebnis |
| --- | --- |
| M0 | Plan freigegeben, Build-Weg geklärt |
| M1 | App-Grundgerüst, CI baut und testet |
| M2 | Mehrere Projekte, Schritte von Hand, Stand wird gespeichert, Sicherung |
| M3 | Schritt-für-Schritt-Ansicht mit Wiederholungen und Rückgängig |
| M4 | PDF-Import mit Text- und Regelerkennung, mit Prüfansicht |
| M5 | Englische Anleitungen auf Deutsch |
| M6 | Feinschliff, Barrierefreiheit, iPhone-Layout |

## Später

Garn und Nadeln am Projekt, Fotoimport, Maschenproben-Rechner

## Risiken

- **Erkennung:** Anleitungen sind sehr unterschiedlich aufgebaut (Abkürzungen,
  Größen in Klammern, „gleichzeitig“). Früh mit echten Beispielen testen.
- **Datenverlust:** Browserdaten können gelöscht werden. Sicherung anbieten.
- **Keine KI:** Die Erkennung muss mit festen Regeln auskommen.
- **Urheberrecht:** Importierte Anleitungen bleiben privat auf dem Gerät.
