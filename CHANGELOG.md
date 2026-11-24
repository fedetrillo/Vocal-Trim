# Changelog

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
