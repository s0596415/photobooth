📸 FIW Winterfest Photobooth (Vercel + Render)

Dies ist die vollständig cloud-basierte Webanwendung für den Photobooth des FIW Winterfests, die es Nutzern ermöglicht, Fotos im Stil eines klassischen Automatenstreifens aufzunehmen und digital zu speichern.

Hauptfunktionen



Interaktive Fotoaufnahme: Nutzer wählen ein Layout (z.B. 1x3 Strip, 2x2 Grid) und nehmen eine Serie von Fotos über die Gerätekamera auf.

Filter & Anpassung: Fotos können mit verschiedenen Filtern (Schwarz-Weiß, Sepia, Vintage) versehen und mit einem individuellen Hintergrund (Farbe oder Motiv) angepasst werden.

Sofortige Speicherung & Download: Der fertige Fotostreifen wird generiert und zum Download angeboten.

QR-Code-Sharing: Das generierte Foto wird auf den Server hochgeladen, und ein QR-Code wird angezeigt, damit Nutzer das Bild direkt mit dem Handy scannen und speichern können.

Technischer Stack



KomponenteHosting-PlattformBeschreibungFrontendVercelStatische Seite (HTML, CSS, JS) mit Kamerazugriff, Countdown und Canvas-Rendering.**Backend (API)**Render (Node.js/Express)Verwaltet den Bild-Upload, speichert die Datei temporär und liefert die finale URL an das Frontend zurück.

In Google Sheets exportieren

Wichtiger Hinweis (Betrieb)



*Da das Backend auf dem kostenlosen Tier von Render läuft, geht es nach ca. 15 Minuten Inaktivität in den Sleep Mode. * Um den Upload-Service zu aktivieren, muss die Backend-URL (https://photobooth-4r1k.onrender.com) vor der ersten Nutzung im Browser aufgerufen werden. Nach dem Aufwecken funktioniert der Upload für die nächsten 15 Minuten reibungslos.
