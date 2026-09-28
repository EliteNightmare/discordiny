:root {
  background: #050000;
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
  background: #050000;
}

.root-shell {
  min-height: 100dvh;
  overflow-x: hidden;
  background: #070000;
  color: #b97a6e;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  line-height: 1.55;
}

.root-shell * {
  box-sizing: border-box;
}

.root-browserbar {
  position: relative;
  z-index: 10;
  height: 25px;
  border-bottom: 1px solid #2b1715;
  background: #160d0c;
  color: #817168;
  font-size: 9px;
  letter-spacing: 0.04em;
}

.root-browser-dots {
  position: absolute;
  top: 50%;
  left: 9px;
  display: flex;
  gap: 5px;
  transform: translateY(-50%);
}

.root-browser-dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e56845;
}

.root-browser-dots i:nth-child(2) {
  background: #d99739;
}

.root-browser-dots i:nth-child(3) {
  background: #69925b;
}

.root-browser-title {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.85;
  white-space: nowrap;
}

.root-stage {
  position: relative;
  min-height: calc(100dvh - 25px);
  padding: 18px 24px 54px;
  background:
    radial-gradient(
      ellipse at 48% 32%,
      rgba(52, 0, 0, 0.2) 0,
      rgba(20, 0, 0, 0.28) 30%,
      rgba(8, 0, 0, 0.92) 67%,
      #050000 100%
    );
}

.root-stage::before,
.root-login::before {
  position: fixed;
  z-index: 20;
  inset: 25px 0 0;
  content: "";
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.012) 0,
    rgba(255, 255, 255, 0.012) 1px,
    transparent 1px,
    transparent 4px
  );
  mix-blend-mode: screen;
}

.root-terminal-marker {
  position: absolute;
  top: 14px;
  left: 12px;
  color: #ff5548;
  font-size: 15px;
  line-height: 1;
  text-shadow: 0 0 7px #d10b00;
  animation: rootBlink 1.2s steps(1) infinite;
}

.root-session {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin: 0 0 28px 24px;
  color: #68423d;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.root-directory,
.root-file {
  width: min(980px, 100%);
  padding-left: 24px;
}

.root-directory-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 300px);
  gap: 28px;
  align-items: start;
  margin-bottom: 18px;
}

.root-directory-image {
  justify-self: end;
  width: min(300px, 100%);
  max-height: 150px;
  object-fit: contain;
  object-position: right top;
  opacity: 0.36;
  filter: saturate(0.55) brightness(0.55) contrast(1.2);
}

.root-pathline {
  margin-bottom: 13px;
  color: #d18b7e;
  font-size: 13px;
  letter-spacing: 0.035em;
  overflow-wrap: anywhere;
}

.root-directory-controls,
.root-file-nav {
  min-height: 24px;
  margin-bottom: 8px;
}

.root-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  width: 100%;
}

.root-link {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  color: #b66f63;
  font: inherit;
  line-height: 1.45;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.root-link:hover,
.root-link:focus-visible {
  color: #ff6658;
  outline: 0;
  text-shadow: 0 0 7px #b9140b;
}

.root-dir {
  color: #cf8274;
  font-weight: 700;
}

.root-kind {
  color: #74423c;
  font-weight: 400;
}

.root-back {
  color: #875048;
}

.root-entry {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.root-locked {
  color: #75443e;
}

.root-lock-note {
  color: #663631;
  font-size: 11px;
}

.root-file-status {
  margin: 0 0 22px;
  color: #74433d;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.root-file h1 {
  margin: 0 0 22px;
  color: #dc9385;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: 0.02em;
}

.root-field {
  margin: 0 0 24px;
}

.root-field h2 {
  margin: 0 0 8px;
  color: #cf8578;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.root-description,
.root-embed-description {
  margin-bottom: 20px;
}

.root-embed-description {
  color: #c78376;
}

.root-copy,
.root-line {
  color: #b97a6e;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.root-copy strong {
  color: #d89587;
}

.root-copy em {
  color: #c98a7d;
}

.root-copy s {
  opacity: 0.65;
}

.root-copy code {
  color: #e39a8d;
  font-family: inherit;
}

.root-file pre {
  max-width: 100%;
  margin: 10px 0 14px;
  border-left: 2px solid #58231e;
  background: #0e0302;
  padding: 11px 13px;
  color: #b97f74;
  font: inherit;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.root-spoiler {
  border-radius: 2px;
  background: #35100d;
  color: transparent;
  text-shadow: none;
  cursor: default;
  transition: color 120ms ease;
}

.root-spoiler:hover,
.root-spoiler:focus {
  color: #c98a7d;
}

.root-file-image {
  display: block;
  width: auto;
  max-width: min(620px, 100%);
  max-height: 58vh;
  margin: 16px 0 24px;
  object-fit: contain;
  object-position: left center;
  filter: saturate(0.82) brightness(0.76) contrast(1.08);
}

.root-denied {
  margin-top: 18px;
  color: #e94b3f;
  font-size: 14px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  text-shadow: 0 0 7px #7a0c06;
}

.root-stage footer {
  position: fixed;
  right: 14px;
  bottom: 9px;
  z-index: 5;
  color: #442a27;
  font-size: 8px;
  letter-spacing: 0.08em;
  text-align: right;
}

.root-login {
  position: relative;
  min-height: calc(100dvh - 25px);
  padding: 18px;
  background:
    radial-gradient(
      ellipse at 50% 38%,
      rgba(46, 0, 0, 0.18),
      #070000 62%
    );
}

.root-login form {
  width: min(430px, calc(100vw - 48px));
  margin: 16vh auto 0;
  border-left: 2px solid #682a24;
  padding: 20px 22px;
  color: #b96f62;
}

.root-login-heading {
  color: #d48476;
  font-size: 17px;
  letter-spacing: 0.055em;
}

.root-login-subheading {
  margin: 6px 0 24px;
  color: #6f4943;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.root-login label {
  display: block;
  margin: 14px 0 6px;
  color: #8f5a52;
  font-size: 11px;
  letter-spacing: 0.07em;
}

.root-login input {
  display: block;
  width: 100%;
  margin-top: 5px;
  border: 0;
  border-bottom: 1px solid #5a2924;
  outline: 0;
  background: #090101;
  padding: 9px 7px;
  color: #d28a7e;
  font: inherit;
  caret-color: #ff5548;
}

.root-login input:focus {
  border-bottom-color: #a94439;
  box-shadow: 0 6px 10px -10px #ff5548;
}

.root-login button {
  margin-top: 22px;
  border: 1px solid #62251f;
  background: #160302;
  padding: 9px 13px;
  color: #c35d52;
  font: inherit;
  cursor: pointer;
}

.root-login button:hover,
.root-login button:focus-visible {
  border-color: #a43d33;
  color: #ff6658;
  outline: 0;
  text-shadow: 0 0 6px #9d1009;
}

.root-login p {
  margin-top: 14px;
  color: #e94b3f;
  font-size: 11px;
}

.root-fatal {
  min-height: calc(100dvh - 25px);
  padding: 12vh 10vw;
  background: #050000;
  color: #d64a3e;
  font: 14px/1.7 "Courier New", Courier, monospace;
}

@keyframes rootBlink {
  0%,
  48% {
    opacity: 1;
  }

  49%,
  100% {
    opacity: 0.25;
  }
}

@media (max-width: 700px) {
  .root-shell {
    font-size: 13px;
  }

  .root-browserbar {
    height: 23px;
  }

  .root-stage {
    min-height: calc(100dvh - 23px);
    padding: 15px 12px 48px;
  }

  .root-stage::before,
  .root-login::before {
    inset: 23px 0 0;
  }

  .root-terminal-marker {
    top: 12px;
    left: 8px;
  }

  .root-session {
    flex-direction: column;
    gap: 3px;
    margin: 0 0 22px 18px;
    font-size: 8px;
  }

  .root-directory,
  .root-file {
    padding-left: 18px;
  }

  .root-directory-head {
    display: block;
  }

  .root-directory-image {
    display: block;
    width: min(240px, 76vw);
    max-height: 100px;
    margin: 4px 0 18px;
    object-position: left top;
  }

  .root-list {
    gap: 9px;
  }

  .root-pathline {
    font-size: 11px;
  }

  .root-file h1 {
    font-size: 17px;
  }

  .root-field h2 {
    font-size: 13px;
  }

  .root-file-image {
    max-height: 44vh;
  }

  .root-stage footer {
    max-width: 70vw;
    font-size: 7px;
  }

  .root-login form {
    margin-top: 12vh;
  }
}
