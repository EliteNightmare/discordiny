import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import cbcLogo from "../assets/cbclogo.png";

import {
  findTerminalFile,
} from "../terminal/terminalFiles";

import type {
  TerminalFile,
} from "../terminal/terminalFiles";

import TerminalWindow from "../terminal/TerminalWindow";

import type {
  TerminalWindowPosition,
} from "../terminal/TerminalWindow";

import "./Terminal.css";

type TerminalState =
  | "checking"
  | "connecting"
  | "connected"
  | "refused";

type OpenTerminalFile = {
  file: TerminalFile;

  zIndex: number;

  position: TerminalWindowPosition;

  minimized: boolean;
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
   * Each focused/opened window gets
   * a higher z-index.
   */
  const nextZIndex =
    useRef(100);

  /*
   * ========================================================
   * TERMINAL AUTHENTICATION
   * ========================================================
   */

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

        /*
         * Existing terminal session.
         */
        if (
          sessionData.authenticated
        ) {
          setState("connected");

          /*
           * Remove any old instance
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
         * No active terminal session.
         *
         * Try to obtain the one-time
         * instance key from the URL.
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
         * Consume the one-time
         * terminal instance.
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
         * Remove the consumed key from
         * the visible URL.
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

  /*
   * Focus the terminal input whenever
   * the authenticated interface first
   * becomes available.
   */
  useEffect(() => {
    if (
      state === "connected"
    ) {
      inputRef.current?.focus();
    }
  }, [state]);

  /*
   * ========================================================
   * WINDOW MANAGEMENT
   * ========================================================
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

    /*
     * Return keyboard focus to the
     * command input after closing.
     */
    window.setTimeout(
      () => {
        inputRef.current?.focus();
      },
      0,
    );
  }

  function moveFile(
    fileId: string,
    position: TerminalWindowPosition,
  ) {
    setOpenFiles(
      (current) =>
        current.map(
          (openFile) => {
            if (
              openFile.file.id !==
              fileId
            ) {
              return openFile;
            }

            return {
              ...openFile,

              position,
            };
          },
        ),
    );
  }

  function minimizeFile(
    fileId: string,
  ) {
    const newZIndex =
      nextZIndex.current++;

    setOpenFiles(
      (current) =>
        current.map(
          (openFile) => {
            if (
              openFile.file.id !==
              fileId
            ) {
              return openFile;
            }

            return {
              ...openFile,

              minimized: true,

              zIndex:
                newZIndex,
            };
          },
        ),
    );
  }

  function restoreFile(
    fileId: string,
  ) {
    const newZIndex =
      nextZIndex.current++;

    setOpenFiles(
      (current) =>
        current.map(
          (openFile) => {
            if (
              openFile.file.id !==
              fileId
            ) {
              return openFile;
            }

            return {
              ...openFile,

              minimized: false,

              zIndex:
                newZIndex,
            };
          },
        ),
    );
  }

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
     * File already open.
     *
     * Restore it if minimized and
     * bring it to the front.
     */
    if (existing) {
      const newZIndex =
        nextZIndex.current++;

      setOpenFiles(
        (current) =>
          current.map(
            (openFile) => {
              if (
                openFile.file.id !==
                file.id
              ) {
                return openFile;
              }

              return {
                ...openFile,

                minimized: false,

                zIndex:
                  newZIndex,
              };
            },
          ),
      );

      return;
    }

    const zIndex =
      nextZIndex.current++;

    /*
     * New windows are slightly
     * staggered so opening several
     * files doesn't perfectly stack
     * them on top of each other.
     */
    const windowNumber =
      openFiles.length % 5;

    /*
     * Normal desktop window size is
     * approximately 620 x 440.
     *
     * Start near the center.
     */
    const desktopWidth = 620;
    const desktopHeight = 440;

    const baseX =
      window.innerWidth / 2 -
      desktopWidth / 2;

    const baseY =
      window.innerHeight / 2 -
      desktopHeight / 2;

    const position:
      TerminalWindowPosition = {
        x:
          Math.max(
            20,
            baseX +
              windowNumber *
                24,
          ),

        y:
          Math.max(
            20,
            baseY +
              windowNumber *
                24,
          ),
      };

    setOpenFiles(
      (current) => [
        ...current,

        {
          file,

          zIndex,

          position,

          minimized: false,
        },
      ],
    );
  }

  /*
   * ========================================================
   * TERMINAL INPUT
   * ========================================================
   */

  function handleTerminalClick() {
    if (
      state !== "connected"
    ) {
      return;
    }

    /*
     * Only automatically focus the
     * command field when there are no
     * file windows open.
     *
     * This prevents window interaction
     * from constantly stealing focus.
     */
    if (
      openFiles.length === 0
    ) {
      inputRef.current?.focus();
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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

    /*
     * Invalid terminal access code.
     */
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

    /*
     * Valid terminal file.
     */
    setCommandError("");

    setCommand("");

    openFile(file);
  }

  /*
   * ========================================================
   * LOADING SCREEN
   * ========================================================
   *
   * Existing SIVA-style connection
   * screen remains unchanged.
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
   * ========================================================
   * ACCESS DENIED
   * ========================================================
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
   * ========================================================
   * AUTHENTICATED TERMINAL
   * ========================================================
   */

  return (
    <main
      className="terminal-page terminal-connected"
      onClick={
        handleTerminalClick
      }
    >
      <div className="cbc-background-grid" />

      {/*
       * ----------------------------------------------------
       * MAIN TERMINAL INTERFACE
       * ----------------------------------------------------
       */}

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

                /*
                 * Remove the invalid-code
                 * warning as soon as the
                 * player begins typing
                 * again.
                 */
                if (
                  commandError
                ) {
                  setCommandError(
                    "",
                  );
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
       * ----------------------------------------------------
       * TERMINAL FILE WINDOW MANAGER
       * ----------------------------------------------------
       *
       * These are virtual terminal
       * records only. They are not
       * website/root files.
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

              position={
                openFile.position
              }

              minimized={
                openFile.minimized
              }

              onClose={
                closeFile
              }

              onFocus={
                focusFile
              }

              onMove={
                moveFile
              }

              onMinimize={
                minimizeFile
              }

              onRestore={
                restoreFile
              }
            />
          ),
        )}
      </div>
    </main>
  );
}
