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

export default function Terminal() {
  const [
    state,
    setState,
  ] = useState<TerminalState>(
    "checking",
  );

  const [
    command,
    setCommand,
  ] = useState("");

  const inputRef =
    useRef<HTMLInputElement>(
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

          /*
           * Remove any consumed instance
           * key from the address bar.
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
         * The first path component
         * should contain our one-time
         * terminal instance key.
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

        /*
         * Attempt to consume the
         * one-time instance key.
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
         * Remove the secret instance
         * key from the visible URL.
         */
        window.history.replaceState(
          {},
          "",
          "/",
        );

        setState("connected");
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

    /*
     * Placeholder for the terminal-file
     * system we'll add next.
     *
     * Eventually this will resolve a
     * terminal-only code and open its
     * corresponding file window.
     */
    console.log(
      "Terminal code:",
      trimmed,
    );

    setCommand("");
  }

  /*
   * EXISTING CONNECTION LOADING SCREEN
   *
   * Kept as the existing red/SIVA
   * connection screen.
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
   * CLOVIS BRAY ACCESS DENIED
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

  /*
   * AUTHENTICATED CLOVIS BRAY TERMINAL
   *
   * Intentionally minimal.
   *
   * File windows will be rendered over
   * this interface in the next step.
   */
  return (
    <main
      className="terminal-page terminal-connected"
      onClick={
        handleTerminalClick
      }
    >
      <div className="cbc-background-grid" />

      <section className="cbc-minimal-terminal">
        <header className="cbc-minimal-brand">
          <img
            src={cbcLogo}
            alt="Clovis Bray Corporation"
            className="cbc-minimal-logo"
          />

          <div className="cbc-minimal-title">
            <h1>
              CLOVIS BRAY
            </h1>

            <span>
              CORPORATION
            </span>
          </div>
        </header>

        <form
          className="cbc-minimal-prompt"
          onSubmit={
            handleSubmit
          }
        >
          <div className="cbc-prompt-box">
            <span className="cbc-prompt-chevron">
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
              aria-label="Terminal code"
              placeholder="ENTER TERMINAL CODE"
            />

            <button
              type="submit"
              aria-label="Execute terminal code"
            >
              EXECUTE
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
