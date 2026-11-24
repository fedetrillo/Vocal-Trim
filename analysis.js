// Vocal Trim: the analysis, as pure functions over a level envelope. No LUNA here.
//
// The page samples the track's waveform overview (peak per 2.6 ms) on an even grid of `n`
// points over the span; `peaks[i]` is the linear peak at point i, or null where no clip plays.
// From that we get a level in dBFS, decide where the voice is, and build the gain that brings
// each phrase towards the target, smoothed both ways so it moves ahead of the voice like a
// rider with lookahead.

(function (root) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const db = (x) => (x > 1e-6 ? 20 * Math.log10(x) : -120);

  // Level in dBFS over a sliding window of `win` points: the RMS of the peaks, 3 dB down (the
  // peak of a sine is 3 dB over its RMS), so it reads like a loudness meter, not a peak meter.
  function level(peaks, win) {
    const n = peaks.length, out = new Float64Array(n).fill(-120);
    const half = Math.max(1, Math.round(win / 2));
    let sum = 0, cnt = 0;
    const sq = peaks.map((p) => (p == null ? null : p * p));
    for (let i = 0; i < Math.min(n, half); i++) if (sq[i] != null) { sum += sq[i]; cnt++; }
    for (let i = 0; i < n; i++) {
      const add = i + half, drop = i - half - 1;
      if (add < n && sq[add] != null) { sum += sq[add]; cnt++; }
      if (drop >= 0 && sq[drop] != null) { sum -= sq[drop]; cnt--; }
      out[i] = peaks[i] == null || cnt <= 0 ? -120 : db(Math.sqrt(Math.max(0, sum) / cnt)) - 3;
    }
    return out;
  }

  // Where the voice is: above the threshold, with short dips bridged (between words) and very
  // short blips ignored (a click, a breath's edge).
  function activity(lev, thr, bridge, minOn) {
    const n = lev.length, on = new Uint8Array(n);
    for (let i = 0; i < n; i++) on[i] = lev[i] > thr ? 1 : 0;
    // Bridge gaps shorter than `bridge` points.
    for (let i = 0; i < n;) {
      if (on[i]) { i++; continue; }
      let j = i; while (j < n && !on[j]) j++;
      if (i > 0 && j < n && j - i <= bridge) for (let k = i; k < j; k++) on[k] = 1;
      i = j;
    }
    // Drop islands shorter than `minOn`.
    for (let i = 0; i < n;) {
      if (!on[i]) { i++; continue; }
      let j = i; while (j < n && on[j]) j++;
      if (j - i < minOn) for (let k = i; k < j; k++) on[k] = 0;
      i = j;
    }
    return on;
  }

  // The target when left on auto: the median level of the voice, to the nearest half dB.
  function autoTarget(lev, on) {
    const v = []; for (let i = 0; i < lev.length; i++) if (on[i]) v.push(lev[i]);
    if (!v.length) return -18;
    v.sort((a, b) => a - b);
    return Math.round(v[Math.floor(v.length / 2)] * 2) / 2;
  }
  // An automatic threshold: well under the voice, over the noise between phrases.
  function autoThreshold(lev) {
    const v = Array.from(lev).filter((x) => x > -100).sort((a, b) => a - b);
    if (!v.length) return -50;
    const floor = v[Math.floor(v.length * 0.1)], loud = v[Math.floor(v.length * 0.9)];
    return Math.round(clamp(Math.max(floor + 8, loud - 30), -70, -20));
  }

  // Zero-phase smoothing: a one-pole filter forward, then backward. `tc` is in points.
  function smooth(x, tc) {
    const a = tc <= 0 ? 0 : Math.exp(-1 / tc);
    const y = Float64Array.from(x);
    for (let i = 1; i < y.length; i++) y[i] = a * y[i - 1] + (1 - a) * y[i];
    for (let i = y.length - 2; i >= 0; i--) y[i] = a * y[i + 1] + (1 - a) * y[i];
    return y;
  }

  // The ride, in dB per point. Inside a phrase it is (target - level) times the amount, limited
  // to ±range; outside it holds for a moment and then glides back to 0 dB, so nothing rides the
  // silence or the noise between phrases.
  function ride(lev, on, o) {
    const n = lev.length, g = new Float64Array(n);
    const amt = clamp(o.amount ?? 100, 0, 100) / 100;
    const up = clamp(o.rangeUp ?? o.range ?? 6, 0, 24), down = clamp(o.rangeDown ?? o.range ?? 6, 0, 24);
    let last = 0, off = 0;
    for (let i = 0; i < n; i++) {
      if (on[i]) { last = clamp((o.target - lev[i]) * amt, -down, up); off = 0; g[i] = last; }
      else { off++; g[i] = off < (o.hold ?? 0) ? last : 0; }
    }
    return smooth(g, o.tc ?? 20);
  }

  // Keep only the points the curve needs: Ramer–Douglas–Peucker with a tolerance in dB.
  function simplify(xs, ys, tol) {
    const n = xs.length;
    if (n < 3) return xs.map((x, i) => [x, ys[i]]);
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let best = -1, dmax = tol;
      for (let i = a + 1; i < b; i++) {
        const t = (xs[i] - xs[a]) / (xs[b] - xs[a] || 1);
        const d = Math.abs(ys[i] - (ys[a] + (ys[b] - ys[a]) * t));
        if (d > dmax) { dmax = d; best = i; }
      }
      if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push([xs[i], ys[i]]);
    return out;
  }

  // Phrase ends: a voice that fades out at the end of a phrase is a natural cadence, not a
  // level problem. From the point where a phrase falls well under its own level (read on the
  // fast level `det`) to its end, the level the ride follows is held where it was, so the fade
  // does not ask for a boost.
  function guardTails(lev, det, on, drop) {
    const out = Float64Array.from(lev), n = on.length;
    for (let i = 0; i < n;) {
      if (!on[i]) { i++; continue; }
      let j = i; while (j < n && on[j]) j++;
      const v = []; for (let k = i; k < j; k++) v.push(det[k]);
      v.sort((a, b) => a - b);
      const med = v[Math.floor(v.length / 2)];
      let tail = j - 1;
      while (tail > i && det[tail] < med - drop) tail--;
      // Hold from a little before the fall, so the smoothing does not lean into it either.
      const from = Math.max(i, tail - Math.round((j - i) * 0.05));
      // The phrase's own level (its median before the fall): the centred window has already
      // started to fall at `from`, so its value there would be too low.
      const body = []; for (let k = i; k <= from; k++) body.push(lev[k]);
      body.sort((x, y) => x - y);
      const hold = body.length ? body[Math.floor(body.length / 2)] : out[from];
      for (let k = from; k < Math.min(n, j + 60); k++) if (out[k] < hold) out[k] = hold;
      i = j;
    }
    return out;
  }

  // Loud consonants and short peaks: a fast detector finds the bits that still stick out over the
  // target after the ride, and pulls just those down, quickly, with no boost.
  function peakCuts(gain, levFast, on, o) {
    const n = gain.length, cut = new Float64Array(n);
    const margin = o.peakMargin ?? 3, amt = Math.max(0, Math.min(100, o.peaks ?? 0)) / 100;
    if (!amt) return gain;
    for (let i = 0; i < n; i++) {
      if (!on[i] || levFast[i] <= -100) continue;
      const over = levFast[i] + gain[i] - (o.target + margin);
      if (over > 0) cut[i] = -over * amt;
    }
    // Spread each cut a little either side so it opens before the consonant and closes after it.
    const sm = smooth(cut, o.tcFast ?? 2);
    const spread = new Float64Array(n);
    for (let i = 0; i < n; i++) { let m = sm[i]; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) m = Math.min(m, cut[k] * 0.85); spread[i] = m; }
    const out = Float64Array.from(gain, (g, i) => g + spread[i]);
    const floor = -(o.range ?? 6) - 6;
    for (let i = 0; i < n; i++) if (out[i] < floor) out[i] = floor;
    return out;
  }

  // Everything in one call. `ms` is the length of one point in milliseconds.
  function analyse(peaks, ms, o) {
    const pts = (x) => Math.max(1, Math.round(x / ms));
    const sp = { slow: [400, 350], medium: [220, 150], fast: [110, 60] }[o.speed ?? 'medium'] ?? [220, 150];
    // The level the ride follows: a phrase-scale window, so it evens out phrases and words,
    // not every syllable.
    const lev = level(peaks, pts(sp[0]));
    const levFast = level(peaks, pts(12));
    const levShow = level(peaks, pts(40));
    const thr = o.threshold === 'auto' || o.threshold == null ? autoThreshold(levShow) : o.threshold;
    const on = activity(levShow, thr, pts(o.bridge ?? 250), pts(o.minOn ?? 60));
    const target = o.target === 'auto' || o.target == null ? autoTarget(lev, on) : o.target;
    const levRide = o.tails !== false ? guardTails(lev, levShow, on, o.tailDrop ?? 6) : lev;
    let gain = ride(levRide, on, { ...o, target, tc: pts(sp[1]), hold: pts(300) });
    gain = peakCuts(gain, levFast, on, { ...o, target, tcFast: pts(6) });
    const after = Float64Array.from(levShow, (v, i) => (v > -100 ? v + gain[i] : v));
    let active = 0, minG = 0, maxG = 0;
    for (let i = 0; i < on.length; i++) { if (on[i]) active++; minG = Math.min(minG, gain[i]); maxG = Math.max(maxG, gain[i]); }
    const spread = (arr) => { const v = []; for (let i = 0; i < arr.length; i++) if (on[i]) v.push(arr[i]); if (v.length < 4) return 0; v.sort((a, b) => a - b); return v[Math.floor(v.length * 0.9)] - v[Math.floor(v.length * 0.1)]; };
    return { lev: levShow, on, gain, after, target, threshold: thr, active: on.length ? active / on.length : 0, minG, maxG, spreadBefore: spread(levShow), spreadAfter: spread(after) };
  }

  root.Rider = { level, activity, autoTarget, autoThreshold, smooth, ride, guardTails, peakCuts, simplify, analyse, db };
})(typeof window !== 'undefined' ? window : globalThis);
