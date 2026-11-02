// Styles for /deck, after the case-study slides on wierzbianski.com:
// #0A0A0A / #F9F8F8, light statement slides on #F4F4F4, Instrument Serif headlines with italic accents,
// Brawler uppercase labels (// LABEL, [ 01 ]), hairline rules, 16px image frames with pill captions,
// the orange diamond from the site's nav, and the site's entrance: opacity + blur coming off.
// Every selector sits under .fwd so nothing leaks into the prototype.

export const DECK_CSS = `
.fwd {
  --sans: var(--fwd-brawler), var(--fwd-fill), Georgia, serif;
  --serif: var(--fwd-serif), Georgia, serif;
  position: fixed; inset: 0; overflow: hidden; z-index: 0;
  background: #0A0A0A; color: #F9F8F8;
  font-family: var(--sans); font-synthesis: none;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  transition: background-color .45s ease;
}
.fwd.is-light { background: #F4F4F4; }
.fwd.is-wait { visibility: hidden; }
.fwd *, .fwd *::before, .fwd *::after { box-sizing: border-box; }
/* :where keeps these at class-level weight, so .fwd-serif and friends still win */
.fwd :where(h1, h2, h3, p, ul, ol, figure) { margin: 0; padding: 0; font-weight: inherit; }
.fwd :where(h1, h2, h3) { font-family: var(--sans); }
.fwd ul, .fwd ol { list-style: none; }
.fwd a { color: inherit; text-decoration: none; }
.fwd em { font-style: italic; }
.fwd :focus-visible { outline: 3px solid #E06030; outline-offset: 4px; }

/* The prototype's style editor button would sit on top of the slides. */
button[aria-label="Edit fonts and colours"] { display: none !important; }

/* 1920 × 1080 canvas, scaled to fit the window */
.fwd-canvas {
  position: absolute; left: 50%; top: 50%; width: 1920px; height: 1080px;
  transform: translate(-50%, -50%) scale(var(--k, .5));
}
.fwd-slide {
  --ink: 249, 248, 248;
  position: absolute; inset: 0; overflow: hidden;
  background: #0A0A0A; color: rgb(var(--ink));
  opacity: 0; filter: blur(14px); transform: translateX(48px); visibility: hidden; pointer-events: none;
  transition: opacity .42s ease, filter .42s ease, transform .6s cubic-bezier(.16, 1, .3, 1), visibility 0s linear .42s;
}
.fwd-slide.is-before { transform: translateX(-48px); }
.fwd-slide.is-on {
  opacity: 1; filter: none; transform: none; visibility: visible; pointer-events: auto;
  transition: opacity .42s ease, filter .42s ease, transform .6s cubic-bezier(.16, 1, .3, 1), visibility 0s;
}
.fwd-slide.light { --ink: 13, 13, 13; background: #F4F4F4; }

/* staggered entrance of the slide's parts */
.fwd-slide .rv {
  opacity: 0; transform: translateY(18px);
  transition: opacity .5s ease, transform .7s cubic-bezier(.16, 1, .3, 1);
  transition-delay: calc(var(--d, 0) * 70ms + 60ms);
}
.fwd-slide.is-on .rv { opacity: 1; transform: none; }

/* top bar: FW® and the three chapters */
.fwd-top {
  --ink: 249, 248, 248;
  position: absolute; left: 96px; right: 96px; top: 48px; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  color: rgb(var(--ink)); transition: color .45s ease;
}
.fwd.is-light .fwd-top { --ink: 13, 13, 13; }
.fwd-ch span { transition: color .45s ease; }
.fwd-logo { display: flex; align-items: flex-start; font-family: var(--serif); font-size: 48px; line-height: 1; }
.fwd-logo span { font-size: 22px; line-height: 1; opacity: .7; }
.fwd-ch {
  display: flex; align-items: center; gap: 48px;
  font-size: 24px; line-height: 1; letter-spacing: .14em; text-transform: uppercase;
  color: rgba(var(--ink), .3);
}
.fwd-ch.cover { color: rgba(var(--ink), .55); }
.fwd-ch .on { position: relative; color: rgb(var(--ink)); }
.fwd-ch .on::before {
  content: ""; position: absolute; left: -24px; top: 50%; width: 9px; height: 9px;
  background: #E06030; transform: translateY(-50%) rotate(45deg);
}

/* type */
.fwd-serif { font-family: var(--serif); }
.fwd-label { font-size: 24px; line-height: 1; letter-spacing: .16em; text-transform: uppercase; color: rgba(var(--ink), .55); }
.fwd-k { font-size: 22px; line-height: 1.25; letter-spacing: .14em; text-transform: uppercase; color: rgba(var(--ink), .55); }
.fwd-h { font-family: var(--serif); font-size: 80px; line-height: 1.02; letter-spacing: -.02em; }
.fwd-p { font-size: 26px; line-height: 1.5; color: rgba(var(--ink), .62); }
.fwd-lede { font-size: 28px; line-height: 1.6; color: rgba(var(--ink), .6); }
.fwd-rule { border-top: 1px solid rgba(var(--ink), .16); padding-top: 28px; }
.fwd-chip {
  height: 44px; padding: 0 18px; border: 1px solid rgba(var(--ink), .85); border-radius: 22px;
  display: inline-flex; align-items: center; white-space: nowrap;
  font-size: 20px; line-height: 1; letter-spacing: .12em; text-transform: uppercase;
}
.fwd-chip.dim { border-color: rgba(var(--ink), .3); color: rgba(var(--ink), .75); }
.fwd-pill {
  position: absolute; left: 20px; top: 20px; height: 40px; padding: 0 16px; border-radius: 20px;
  background: rgba(10, 10, 10, .72); color: #F9F8F8;
  display: inline-flex; align-items: center; white-space: nowrap;
  font-size: 18px; line-height: 1; letter-spacing: .14em; text-transform: uppercase;
}
.fwd-img { position: absolute; border-radius: 16px; overflow: hidden; background: rgb(20, 20, 20); }
.fwd-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fwd-img::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); pointer-events: none; }

/* screenshots of the prototype */
.fwd-shot img { right: auto; bottom: auto; height: auto; max-width: none; object-fit: fill; }
.fwd-lift { box-shadow: 0 40px 90px rgba(0, 0, 0, .75), 0 12px 30px rgba(0, 0, 0, .5); }
.fwd-phone {
  position: relative; aspect-ratio: 390 / 800; border-radius: 12.5% / 6.1%; overflow: hidden; background: #101010;
  box-shadow: 0 0 0 7px #1d1d1d, 0 0 0 8px rgba(255, 255, 255, .14), 0 18px 40px rgba(0, 0, 0, .4);
}
.fwd-phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.fwd-stage { background: radial-gradient(120% 90% at 50% 0%, #1f1f1f 0%, #121212 65%); }

/* big numbers */
.fwd-stats { position: absolute; left: 96px; right: 96px; bottom: 96px; display: flex; gap: 48px; }
.fwd-stat { flex: 1 1 0; display: flex; flex-direction: column; gap: 28px; }
.fwd-big { font-family: var(--serif); font-size: 200px; line-height: .8; letter-spacing: -.03em; white-space: nowrap; }
.fwd-big small { font-size: 72px; letter-spacing: -.01em; color: rgba(var(--ink), .5); margin-left: 12px; }
.fwd-stats.sm .fwd-big { font-size: 128px; }
.fwd-stats.sm .fwd-big small { font-size: 48px; margin-left: 8px; }
.fwd-stats.sm .fwd-sub { font-size: 32px; }
.fwd-sub { font-family: var(--serif); font-size: 40px; line-height: 1.08; color: rgba(var(--ink), .55); }

/* columns of numbered points */
.fwd-cols { position: absolute; left: 96px; right: 96px; bottom: 96px; display: flex; gap: 48px; }
.fwd-col { flex: 1 1 0; display: flex; flex-direction: column; gap: 24px; }
.fwd-col h3 { font-family: var(--serif); font-size: 56px; line-height: 1.02; letter-spacing: -.015em; }

/* questions grid */
.fwd-qs {
  position: absolute; left: 96px; right: 96px; top: 420px; bottom: 96px;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); grid-auto-flow: column;
  column-gap: 64px; row-gap: 22px;
}
.fwd-q { display: flex; flex-direction: column; gap: 16px; padding-top: 24px; }
.fwd-q p { font-family: var(--serif); font-size: 44px; line-height: 1.06; letter-spacing: -.01em; }

/* numbered rows with a round badge (the A / B / C markers on Filip's slides) */
.fwd-badge {
  width: 56px; height: 56px; border-radius: 28px; background: rgb(var(--ink)); color: #0A0A0A;
  display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; line-height: 1;
}

/* prototype launchpad */
.fwd-cards { position: absolute; left: 96px; right: 96px; top: 392px; bottom: 96px; display: flex; gap: 32px; }
.fwd-card { flex: 1 1 0; display: flex; flex-direction: column; gap: 26px; cursor: pointer; }
.fwd-card .fwd-img { position: relative; flex: none; clip-path: inset(0 round 16px); transition: clip-path .45s cubic-bezier(.25, .46, .45, .94); }
.fwd-card:hover .fwd-img, .fwd-card:focus-visible .fwd-img { clip-path: inset(3% round 16px); }
.fwd-card:focus-visible { outline-offset: 8px; border-radius: 18px; }
.fwd-card h3 { font-family: var(--serif); font-size: 42px; line-height: 1.04; letter-spacing: -.01em; min-height: 88px; }
.fwd-card h3 span { color: rgba(var(--ink), .5); }
.fwd-open {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; padding-bottom: 8px;
  border-bottom: 1px solid rgb(var(--ink));
  font-family: var(--serif); font-size: 26px; line-height: 1.1; text-transform: uppercase;
}
.fwd-open svg { width: 18px; height: 18px; transition: transform .4s cubic-bezier(.4, 0, .2, 1); }
.fwd-card:hover .fwd-open svg { transform: translate(4px, -4px); }
.fwd-route { position: absolute; right: 20px; top: 20px; height: 40px; padding: 0 14px; border-radius: 20px;
  background: rgba(10, 10, 10, .72); color: rgba(249, 248, 248, .8); display: inline-flex; align-items: center;
  font-size: 17px; letter-spacing: .06em; }

/* the call timeline (light slide) */
.fwd-time { font-family: var(--serif); font-size: 168px; line-height: .8; letter-spacing: -.03em; }
.fwd-time-sub { font-family: var(--serif); font-size: 40px; line-height: 1.1; color: rgba(var(--ink), .62); }

/* persistence spectrum */
.fwd-scale { position: absolute; left: 96px; right: 96px; top: 548px; height: 220px; }
.fwd-ticks { position: absolute; left: 0; right: 0; top: 66px; height: 64px; display: flex; justify-content: space-between; align-items: flex-end; }
.fwd-ticks i { display: block; width: 2px; background: rgb(var(--ink)); border-radius: 1px; }
.fwd-axis { position: absolute; left: 0; right: 0; top: 130px; height: 1px; background: rgba(var(--ink), .35); }
.fwd-end { position: absolute; top: 154px; display: flex; flex-direction: column; gap: 10px; }
.fwd-end b { font-family: var(--serif); font-weight: 400; font-size: 52px; line-height: 1; letter-spacing: -.01em; }
.fwd-marker {
  position: absolute; top: 0; left: var(--at, 50%); transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  transition: left 1.1s cubic-bezier(.16, 1, .3, 1) .25s;
}
.fwd-slide:not(.is-on) .fwd-marker { left: 50%; }
.fwd-marker .dot {
  width: 22px; height: 22px; border-radius: 50%; background: #E06030; margin-top: 108px;
  box-shadow: 0 0 0 8px rgba(224, 96, 48, .18);
}
.fwd-marker .tag {
  position: absolute; top: 0; white-space: nowrap; height: 44px; padding: 0 18px; border-radius: 22px;
  background: rgb(var(--ink)); color: #0A0A0A; display: inline-flex; align-items: center;
  font-size: 19px; letter-spacing: .12em; text-transform: uppercase;
}

/* my process */
.fwd-two { position: absolute; left: 96px; right: 96px; top: 372px; bottom: 96px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 96px; }
.fwd-stack { display: flex; flex-direction: column; gap: 22px; }
.fwd-row { display: flex; gap: 24px; border-top: 1px solid rgba(var(--ink), .16); padding-top: 20px; }
.fwd-row > .fwd-k { flex: 0 0 72px; padding-top: 6px; }
.fwd-row.col { flex-direction: column; gap: 14px; }
.fwd-row.col > .fwd-k { flex: none; padding-top: 0; }
.fwd-row p { font-family: var(--serif); font-size: 36px; line-height: 1.12; letter-spacing: -.005em; }
.fwd-row p .dim { color: rgba(var(--ink), .5); }
.fwd-head { font-size: 22px; letter-spacing: .14em; text-transform: uppercase; line-height: 1; }

/* chrome outside the canvas: prev / counter / next, language */
.fwd-nav { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 5; display: flex; align-items: center; gap: 6px; }
.fwd-btn {
  width: 44px; height: 44px; padding: 0; display: grid; place-items: center; border-radius: 50%; cursor: pointer;
  background: rgba(10, 10, 10, .35); border: 1px solid rgba(255, 255, 255, .22); color: #F9F8F8;
  transition: background .2s, border-color .2s, opacity .2s, color .45s;
}
.fwd-btn:hover { background: rgba(249, 248, 248, .12); border-color: rgba(255, 255, 255, .5); }
.fwd-btn[disabled] { opacity: .25; cursor: default; background: transparent; }
.fwd-btn svg { width: 16px; height: 16px; }
.fwd-count { min-width: 84px; text-align: center; font-size: 13px; letter-spacing: .16em; color: rgba(249, 248, 248, .8); font-variant-numeric: tabular-nums; transition: color .45s; }
.fwd-lang {
  position: absolute; right: 24px; bottom: 28px; z-index: 5; display: flex; align-items: center; gap: 10px;
  font-size: 13px; line-height: 1; letter-spacing: .16em; color: rgba(249, 248, 248, .4); transition: color .45s;
}
.fwd-lang a { padding: 4px 2px; transition: color .2s; }
.fwd-lang a:hover, .fwd-lang a[aria-current] { color: #F9F8F8; }
.fwd.is-light .fwd-btn { background: rgba(244, 244, 244, .5); border-color: rgba(13, 13, 13, .25); color: #0D0D0D; }
.fwd.is-light .fwd-btn:hover { background: rgba(13, 13, 13, .08); border-color: rgba(13, 13, 13, .5); }
.fwd.is-light .fwd-count { color: rgba(13, 13, 13, .75); }
.fwd.is-light .fwd-lang { color: rgba(13, 13, 13, .4); }
.fwd.is-light .fwd-lang a:hover, .fwd.is-light .fwd-lang a[aria-current] { color: #0D0D0D; }

@media (prefers-reduced-motion: reduce) {
  .fwd-slide, .fwd-slide.is-on, .fwd-slide .rv, .fwd-marker, .fwd-card .fwd-img { transition: none !important; }
  .fwd-slide { filter: none; transform: none; }
  .fwd-slide .rv { transform: none; }
}
`;
