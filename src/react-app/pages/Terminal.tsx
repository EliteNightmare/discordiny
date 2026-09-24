import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import "./Terminal.css";

type TerminalState =
  | "checking"
  | "connecting"
  | "connected"
  | "refused";

type TerminalLine = {
  id: number;
  type:
    | "system"
    | "command"
    | "response";
  text: string;
};

let nextLineId = 1;

function makeLine(
  type: TerminalLine["type"],
  text: string,
): TerminalLine {
  return {
    id: nextLineId++,
    type,
    text,
  };
}

export default function Terminal() {
  const [
    state,
    setState,
  ] = useState<TerminalState>(
    "checking",
  );

  const [
    lines,
    setLines,
  ] = useState<TerminalLine[]>(
    [],
  );

  const [
    command,
    setCommand,
  ] = useState("");

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const outputRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      /*
       * First check whether this browser
       * already has a valid terminal
       * session.
       */
      try {
        const sessionResponse =
          await fetch(
            "/api/terminal/session",
            {
              credentials:
                "include",
            },
          );

        const sessionData =
          await sessionResponse.json();

        if (cancelled) {
          return;
        }

        if (
          sessionData.authenticated
        ) {
          setState("connected");

          setLines([
            makeLine(
              "system",
              "SIVA://TERMINAL",
            ),
            makeLine(
              "system",
              "INSTANCE ESTABLISHED",
            ),
            makeLine(
              "system",
              "STATUS: CONNECTED",
            ),
            makeLine(
              "system",
              "",
            ),
            makeLine(
              "response",
              "PLACEHOLDER TERMINAL",
            ),
            makeLine(
              "response",
              "Command interface not yet initialized.",
            ),
          ]);

          /*
           * Remove any old instance key
           * from the address bar.
           */
          window.history.replaceState(
            {},
            "",
            "/",
          );

          return;
        }

        /*
         * No existing session.
         *
         * The first path component should
         * be our one-time instance key.
         */
        const path =
          window.location.pathname;

        const instanceKey =
          path
            .split("/")
            .filter(Boolean)[0];

        if (!instanceKey) {
          setState("refused");
          return;
        }

        setState("connecting");

        /*
         * Attempt to consume the one-time
         * instance key.
         */
        const connectResponse =
          await fetch(
            "/api/terminal/connect",
            {
              method: "POST",

              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                instanceKey,
              }),
            },
          );

        const connectData =
          await connectResponse.json();

        if (cancelled) {
          return;
        }

        if (
          !connectResponse.ok ||
          !connectData.success
        ) {
          setState("refused");
          return;
        }

        /*
         * Admission succeeded.
         *
         * Remove the secret instance key
         * from the visible URL immediately.
         */
        window.history.replaceState(
          {},
          "",
          "/",
        );

        setState("connected");

        setLines([
          makeLine(
            "system",
            "SIVA://TERMINAL",
          ),
          makeLine(
            "system",
            "INSTANCE ESTABLISHED",
          ),
          makeLine(
            "system",
            "STATUS: CONNECTED",
          ),
          makeLine(
            "system",
            "",
          ),
          makeLine(
            "response",
            "PLACEHOLDER TERMINAL",
          ),
          makeLine(
            "response",
            "Command interface not yet initialized.",
          ),
        ]);
      } catch {
        if (!cancelled) {
          setState("refused");
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      state === "connected"
    ) {
      inputRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    outputRef.current?.scrollTo({
      top:
        outputRef.current
          .scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  function handleTerminalClick() {
    if (
      state === "connected"
    ) {
      inputRef.current?.focus();
    }
  }

  function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    const trimmed =
      command.trim();

    if (!trimmed) {
      return;
    }

    setLines((current) => [
      ...current,

      makeLine(
        "command",
        `> ${trimmed}`,
      ),

      makeLine(
        "response",
        "PLACEHOLDER: COMMAND INTERFACE NOT YET INITIALIZED",
      ),
    ]);

    setCommand("");
  }

  if (
    state === "checking" ||
    state === "connecting"
  ) {
    return (
      <main className="terminal-page terminal-loading">
        <div className="terminal-noise" />

        <div className="terminal-loading-content">
          <div className="terminal-loading-mark">
            ◆
          </div>

          <p>
            {state ===
            "checking"
              ? "CHECKING CONNECTION"
              : "ESTABLISHING INSTANCE"}
          </p>

          <span className="terminal-loading-cursor">
            _
          </span>
        </div>
      </main>
    );
  }

  if (state === "refused") {
    return (
      <main className="terminal-page terminal-refused">
        <div className="terminal-noise" />

        <section className="terminal-refused-content">
          <div className="terminal-refused-code">
            ERR://SIVA
          </div>

          <h1>
            CONNECTION REFUSED
          </h1>

          <div className="terminal-refused-line" />

          <p>
            No valid SIVA instance
            detected.
          </p>

          <span>
            CONNECTION TERMINATED
          </span>
        </section>
      </main>
    );
  }

  return (
    <main
      className="terminal-page terminal-connected"
      onClick={
        handleTerminalClick
      }
    >
      <div className="terminal-noise" />

      <div className="terminal-scanline" />

      <section className="terminal-shell">
        <header className="terminal-header">
          <div>
            <span className="terminal-header-dot" />

            <span>
              SIVA://TERMINAL
            </span>
          </div>

          <span className="terminal-status">
            CONNECTED
          </span>
        </header>

        <div
          ref={outputRef}
          className="terminal-output"
        >
          {lines.map((line) => (
            <div
              key={line.id}
              className={
                `terminal-line terminal-line-${line.type}`
              }
            >
              {line.text || "\u00A0"}
            </div>
          ))}

          <form
            className="terminal-prompt"
            onSubmit={
              handleSubmit
            }
          >
            <span className="terminal-prompt-symbol">
              &gt;
            </span>

            <input
              ref={inputRef}
              value={command}
              onChange={(event) =>
                setCommand(
                  event.target.value,
                )
              }
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Terminal command"
            />

            <span className="terminal-cursor">
              █
            </span>
          </form>
        </div>

        <footer className="terminal-footer">
          <span>
            DISCORDINY NETWORK
          </span>

          <span>
            SIVA INSTANCE ACTIVE
          </span>
        </footer>
      </section>
    </main>
  );
}
