# Changelog

## 1.0.2 — 2026-11-26

- **Fixed on Windows:** LUNA on Windows sizes the page to the window's outer size, title bar and frame included, so the bottom 39 px and the right 16 px were hidden. The page now leaves that space out on Windows, so everything at the bottom and right edges shows in full.
  the part you can see, so the controls at the bottom were hidden. The page now fits itself to
  the window size LUNA reports; nothing changes where the two match.
- **Report copy:** Alt-click on the version now always says in the status bar that the report was copied. Where the system clipboard is blocked (seen on some Windows set-ups) it uses a fallback, and if that fails too it shows the report selected so you can copy it by hand.

## 1.0.1 — 2026-11-25

- A short getting-started guide: the first time it opens it asks for your language, then walks
  you through the window in it. The **Guide** button brings it back.

## 1.0.0 — 2026-11-24

- First release: reads a vocal track's level from LUNA's waveform overview and writes the gain
  rides that keep it near a target, on the whole track or a selected range.
- Writes to the track's input **Trim** lane (mono, or left and right on a stereo track), so the
  fader stays free, or to the **Volume** lane.
- Target and threshold by hand or Auto; range ±1 to ±18 dB, amount, and slow, medium or fast speed.
- **Phrase ends:** Keep leaves the natural fall at the end of a phrase alone; Level evens it out.
- **Consonants:** pulls down short loud peaks inside a phrase.
- Points stay inside the control's range; when the rides would pass its top, the whole curve is
  lowered to fit and you are told by how much.
- Before and after preview with the gain curve; Clear in range and Undo.
- Dark and grey themes, seven colours, 7 languages, Alt-click the version for a support report.
