import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import cbcLogo from "../assets/cbclogo.png";

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

function getInitialLines(): TerminalLine[] {
  return [
    makeLine(
      "system",
      "CLOVIS BRAY CORPORATION",
    ),
    makeLine(
      "system",
      "EXOSCIENCE NETWORK TERMINAL",
    ),
    makeLine(
      "system",
      "REMOTE SESSION ESTABLISHED",
    ),
    makeLine(
      "system",
      "",
    ),
    makeLine(
      "response",
      "Authorization accepted.",
    ),
    makeLine(
      "response",
      "Terminal command interface online.",
    ),
    makeLine(
      "response",
      "Awaiting access code.",
    ),
  ];
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
      try {
        /*
         * First check whether this
         * browser already owns a valid
         * terminal session.
         */
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

          setLines(
            getInitialLines(),
          );

          /*
           * Remove any old consumed
           * instance key from the URL.
           */
          window.history.replaceState(
            {},
            "",
            "/",
          );

          return;
        }

        /*
         * No existing terminal session.
         *
         * Attempt admission using the
         * instance key in the URL.
         */
        const instanceKey =
          window.location.pathname
            .split("/")
            .filter(Boolean)[0];

        if (!instanceKey) {
          setState("refused");
          return;
        }

        setState("connecting");

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
         * Instance successfully consumed.
         * Hide the one-time key.
         */
        window.history.replaceState(
          {},
          "",
          "/",
        );

        setState("connected");

        setLines(
          getInitialLines(),
        );
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
        "ACCESS CODE NOT RECOGNIZED.",
      ),
    ]);

    setCommand("");
  }

  /*
   * Keep the existing loading state
   * structurally unchanged.
   */
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

  /*
   * CLOVIS BRAY ACCESS DENIED SCREEN
   */
  if (state === "refused") {
    return (
      <main className="terminal-page terminal-refused">
        <div className="cbc-background-grid" />

        <section className="cbc-refused-panel">
          <header className="cbc-refused-header">
            <img
              src={cbcLogo}
              alt="Clovis Bray Corporation"
              className="cbc-refused-logo"
            />

            <div>
              <span>
                CLOVIS BRAY
              </span>

              <small>
                CORPORATION
              </small>
            </div>
          </header>

          <div className="cbc-refused-rule" />

          <div className="cbc-refused-code">
            SECURITY PROTOCOL
            // CB-401
          </div>

          <h1>
            ACCESS
            <br />
            DENIED
          </h1>

          <p>
            The requested terminal
            instance could not be
            authenticated.
          </p>

          <div className="cbc-refused-details">
            <span>
              SESSION
            </span>

            <strong>
              INVALID
            </strong>

            <span>
              NETWORK
            </span>

            <strong>
              RESTRICTED
            </strong>

            <span>
              CLEARANCE
            </span>

            <strong>
              UNVERIFIED
            </strong>
          </div>

          <footer className="cbc-refused-footer">
            CLOVIS BRAY CORPORATION
            // EXOSCIENCE
          </footer>
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
      <div className="cbc-background-grid" />

      <div className="cbc-terminal-shell">
        <header className="cbc-terminal-header">
          <div className="cbc-brand">
            <img
              src={cbcLogo}
              alt="Clovis Bray Corporation"
              className="cbc-logo"
            />

            <div className="cbc-brand-copy">
              <strong>
                CLOVIS BRAY
              </strong>

              <span>
                CORPORATION
              </span>
            </div>
          </div>

          <div className="cbc-header-data">
            <span>
              EXOSCIENCE NETWORK
            </span>

            <strong>
              ONLINE
            </strong>
          </div>
        </header>

        <div className="cbc-terminal-divider">
          <span />
        </div>

        <section className="cbc-terminal-main">
          <aside className="cbc-sidebar">
            <div className="cbc-sidebar-label">
              TERMINAL
            </div>

            <div className="cbc-terminal-number">
              01
            </div>

            <div className="cbc-sidebar-data">
              <span>
                CONNECTION
              </span>

              <strong>
                SECURE
              </strong>

              <span>
                PROTOCOL
              </span>

              <strong>
                CBX-7
              </strong>

              <span>
                INSTANCE
              </span>

              <strong>
                ACTIVE
              </strong>
            </div>
          </aside>

          <section className="cbc-console">
            <div className="cbc-console-heading">
              <div>
                <span>
                  REMOTE SYSTEM
                </span>

                <h1>
                  COMMAND
                  <br />
                  TERMINAL
                </h1>
              </div>

              <div className="cbc-console-status">
                <span className="cbc-status-dot" />

                AUTHORIZED
              </div>
            </div>

            <div
              ref={outputRef}
              className="cbc-output"
            >
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={
                    `cbc-line cbc-line-${line.type}`
                  }
                >
                  {line.text ||
                    "\u00A0"}
                </div>
              ))}
            </div>

            <form
              className="cbc-prompt"
              onSubmit={
                handleSubmit
              }
            >
              <div className="cbc-prompt-label">
                ENTER TERMINAL CODE
              </div>

              <div className="cbc-prompt-box">
                <span className="cbc-prompt-chevron">
                  &gt;
                </span>

                <input
                  ref={inputRef}
                  value={command}
                  onChange={(
                    event,
                  ) =>
                    setCommand(
                      event.target
                        .value,
                    )
                  }
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label="Terminal code"
                  placeholder="INPUT CODE"
                />

                <button
                  type="submit"
                  aria-label="Submit terminal code"
                >
                  EXECUTE
                </button>
              </div>
            </form>
          </section>
        </section>

        <footer className="cbc-terminal-footer">
          <span>
            CLOVIS BRAY CORPORATION
          </span>

          <span>
            EXOSCIENCE //
            RESTRICTED NETWORK
          </span>

          <span>
            CB.OS
          </span>
        </footer>
      </div>
    </main>
  );
}
