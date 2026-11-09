import { useEffect, useState } from "react";
import "./BrayTerminal.css";

const lines = [
  "WELCOME ONCE MORE EMBLEM HUNTERS.",
  "I’VE ENJOYED OUR LITTLE GAMES.",
  "BUT YOU WON’T BE FINDING THIS ONE SO EASILY.",
  "",
  "ACCESS LEVEL: NONE",
  "",
  "USERNAME:",
  "PASSWORD:",
  "HINT:",
];

export default function BrayTerminal() {
  const [visible, setVisible] = useState<string[]>([]);
  const [cursor, setCursor] = useState({ line: 0, char: 0 });

  useEffect(() => {
    if (cursor.line >= lines.length) return;
    const line = lines[cursor.line];
    const finished = cursor.char >= line.length;
    const timer = window.setTimeout(() => {
      if (finished) {
        setVisible(previous => [...previous, line]);
        setCursor(previous => ({ line: previous.line + 1, char: 0 }));
      } else {
        setCursor(previous => ({ ...previous, char: previous.char + 1 }));
      }
    }, finished ? (line === "" ? 240 : 430) : (line.length > 24 ? 31 : 48));
    return () => window.clearTimeout(timer);
  }, [cursor]);

  return (
    <main className="bray-terminal" aria-label="Warmind interface terminal">
      <div className="bray-terminal-inner">
        <h1 className="bray-terminal-title">WARMIND INTERFACE: RIVA</h1>
        <div className="bray-terminal-output" aria-live="off">
          {visible.map((line, index) => (
            <div className="bray-terminal-line" key={index}>
              <span className="bray-terminal-prompt">&gt;</span>{line || "\u00a0"}
            </div>
          ))}
          {cursor.line < lines.length && (
            <div className="bray-terminal-line">
              <span className="bray-terminal-prompt">&gt;</span>
              {lines[cursor.line].slice(0, cursor.char)}<span className="bray-terminal-caret" aria-hidden="true">▌</span>
            </div>
          )}
          {cursor.line >= lines.length && <div className="bray-terminal-line"><span className="bray-terminal-prompt">&gt;</span><span className="bray-terminal-caret" aria-hidden="true">▌</span></div>}
        </div>
      </div>
    </main>
  );
}
