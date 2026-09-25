import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import cbcLogo from "../assets/cbclogo.png";

import {
  findTerminalFile,
} from "../terminal/terminalFiles";

import type {
  TerminalFile,
} from "../terminal/terminalFiles";

import TerminalWindow from "../terminal/TerminalWindow";

import "./Terminal.css";

type TerminalState =
  | "checking"
  | "connecting"
  | "connected"
  | "refused";

type OpenTerminalFile = {
  file: TerminalFile;
  zIndex: number;
  offset: number;
};

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

  const [
    commandError,
    setCommandError,
  ] = useState("");

  const [
    openFiles,
    setOpenFiles,
  ] = useState<
    OpenTerminalFile[]
  >([]);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  /*
   * File windows begin above the
   * terminal interface.
   */
  const nextZIndex =
    useRef(100);

  /*
   * Used to stagger newly opened
   * desktop windows.
   */
  const nextOffset =
    useRef(0);

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

          window.history.replaceState(
            {},
            "",
            "/",
          );

          return;
        }

        /*
         * No active session.
         *
         * Attempt admission using the
         * one-time instance key from
         * the URL.
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
         * Instance consumed.
         * Remove it from the URL.
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

  /*
   * Bring a terminal file window to
   * the front.
   */
  function focusFile(
    fileId: string,
  ) {
    const newZIndex =
      nextZIndex.current++;

    setOpenFiles(
      (current) =>
        current.map(
          (openFile) => {
            if (
              openFile.file.id ===
              fileId
            ) {
              return {
                ...openFile,
                zIndex:
                  newZIndex,
              };
            }

            return openFile;
          },
        ),
    );
  }

  /*
   * Close one virtual terminal file.
   */
  function closeFile(
    fileId: string,
  ) {
    setOpenFiles(
      (current) =>
        current.filter(
          (openFile) =>
            openFile.file.id !==
            fileId,
        ),
    );

    window.setTimeout(
      () => {
        inputRef.current?.focus();
      },
      0,
    );
  }

  /*
   * Open a virtual terminal file.
   */
  function openFile(
    file: TerminalFile,
  ) {
    const existing =
      openFiles.find(
        (openFile) =>
          openFile.file.id ===
          file.id,
      );

    /*
     * Already open?
     * Just bring it to the front.
     */
    if (existing) {
      focusFile(
        file.id,
      );

      return;
    }

    const zIndex =
      nextZIndex.current++;

    const offset =
      nextOffset.current;

    /*
     * Stagger windows:
     *
     * 0px
     * 20px
     * 40px
     * 60px
     * then start again.
     */
    nextOffset.current += 20;

    if (
      nextOffset.current >
      60
    ) {
      nextOffset.current = 0;
    }

    setOpenFiles(
      (current) => [
        ...current,

        {
          file,
          zIndex,
          offset,
        },
      ],
    );
  }

  function handleTerminalClick() {
    if (
      state !== "connected"
    ) {
      return;
    }

    /*
     * Don't steal focus while the
     * player is interacting with an
     * open file window.
     */
    if (
      openFiles.length === 0
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

    const file =
      findTerminalFile(
        trimmed,
      );

    if (!file) {
      setCommandError(
        "ACCESS CODE NOT RECOGNIZED",
      );

      setCommand("");

      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        0,
      );

      return;
    }

    setCommandError("");

    setCommand("");

    openFile(file);
  }

  /*
   * EXISTING CONNECTION LOADING SCREEN
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
   * AUTHENTICATED TERMINAL
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
              onChange={(event) => {
                setCommand(
                  event.target.value,
                );

                if (
                  commandError
                ) {
                  setCommandError("");
                }
              }}
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

          <div
            className={
              commandError
                ? "cbc-command-error cbc-command-error-visible"
                : "cbc-command-error"
            }
            aria-live="polite"
          >
            {commandError ||
              "\u00A0"}
          </div>
        </form>
      </section>

      {/*
       * VIRTUAL TERMINAL FILE WINDOWS
       */}
      <div className="terminal-window-layer">
        {openFiles.map(
          (openFile) => (
            <TerminalWindow
              key={
                openFile.file.id
              }
              file={
                openFile.file
              }
              zIndex={
                openFile.zIndex
              }
              offset={
                openFile.offset
              }
              onClose={
                closeFile
              }
              onFocus={
                focusFile
              }
            />
          ),
        )}
      </div>
    </main>
  );
}
