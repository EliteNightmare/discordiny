import {
  useRef,
  useState,
} from "react";

import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

import type {
  TerminalFile,
} from "./terminalFiles";

import "./TerminalWindow.css";



/* =========================================================
   DISCORD-STYLE MESSAGE FORMATTING
   =========================================================

   The original bot messages use Discord markdown. Keep the
   parser deliberately small and safe: it creates React nodes
   instead of injecting HTML.

   Supported:
   **bold**   *italic*   `inline code`
   ```code blocks```   ~~strike~~   ||spoilers||
========================================================= */

function renderInlineDiscordMarkup(
  text: string,
  keyPrefix = "inline",
): ReactNode[] {
  const tokenPattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\|\|[^|]+\|\|)/g;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex++}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key}>
          {renderInlineDiscordMarkup(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("||")) {
      nodes.push(
        <span key={key} className="terminal-discord-spoiler">
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="terminal-discord-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderDiscordText(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  return text.split("\n").flatMap((line, index, lines) => {
    const rendered = renderInlineDiscordMarkup(
      line,
      `${keyPrefix}-line-${index}`,
    );

    if (index < lines.length - 1) {
      rendered.push(<br key={`${keyPrefix}-br-${index}`} />);
    }

    return rendered;
  });
}

function renderDiscordBlock(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  const pieces = text.split("```");

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-piece-${index}`;

    if (index % 2 === 1) {
      return (
        <pre key={key} className="terminal-discord-code-block">
          <code>{piece.replace(/^\n|\n$/g, "")}</code>
        </pre>
      );
    }

    if (!piece) {
      return null;
    }

    return (
      <span key={key} className="terminal-discord-text">
        {renderDiscordText(piece, key)}
      </span>
    );
  });
}

export type TerminalWindowPosition = {
  x: number;
  y: number;
};

type TerminalWindowProps = {
  file: TerminalFile;

  zIndex: number;

  position: TerminalWindowPosition;

  minimized: boolean;

  onClose: (
    fileId: string,
  ) => void;

  onFocus: (
    fileId: string,
  ) => void;

  onMove: (
    fileId: string,
    position: TerminalWindowPosition,
  ) => void;

  onMinimize: (
    fileId: string,
  ) => void;

  onRestore: (
    fileId: string,
  ) => void;
};

export default function TerminalWindow({
  file,
  zIndex,
  position,
  minimized,
  onClose,
  onFocus,
  onMove,
  onMinimize,
  onRestore,
}: TerminalWindowProps) {
  const dragging =
    useRef(false);

  const [
    closing,
    setClosing,
  ] = useState(false);

  const dragStart =
    useRef({
      mouseX: 0,
      mouseY: 0,
      windowX: 0,
      windowY: 0,
    });

  /*
   * ========================================================
   * CLOSE
   * ========================================================
   *
   * We delay the actual React removal
   * slightly so the CSS closing animation
   * has time to finish.
   */

  function handleClose(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    if (closing) {
      return;
    }

    setClosing(true);

    window.setTimeout(
      () => {
        onClose(file.id);
      },
      180,
    );
  }

  /*
   * ========================================================
   * MINIMIZE
   * ========================================================
   */

  function handleMinimize(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    if (closing) {
      return;
    }

    onFocus(file.id);

    onMinimize(file.id);
  }

  /*
   * ========================================================
   * RESTORE
   * ========================================================
   */

  function handleRestore(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    if (closing) {
      return;
    }

    onFocus(file.id);

    onRestore(file.id);
  }

  /*
   * ========================================================
   * DRAGGING
   * ========================================================
   */

  function startDragging(
    event: ReactMouseEvent<HTMLElement>,
  ) {
    /*
     * Never begin dragging when one of
     * the window control buttons was
     * clicked.
     */
    if (
      (
        event.target as HTMLElement
      ).closest("button")
    ) {
      return;
    }

    /*
     * Ignore dragging while the window
     * is closing.
     */
    if (closing) {
      return;
    }

    /*
     * Mobile windows use the responsive
     * fixed layout instead of desktop
     * dragging.
     */
    if (
      window.matchMedia(
        "(max-width: 700px)",
      ).matches
    ) {
      return;
    }

    event.preventDefault();

    /*
     * Bring the window to the front.
     */
    onFocus(file.id);

    dragging.current = true;

    dragStart.current = {
      mouseX:
        event.clientX,

      mouseY:
        event.clientY,

      windowX:
        position.x,

      windowY:
        position.y,
    };

    document.body.classList.add(
      "terminal-window-dragging",
    );

    function handleMouseMove(
      moveEvent: MouseEvent,
    ) {
      if (
        !dragging.current
      ) {
        return;
      }

      const deltaX =
        moveEvent.clientX -
        dragStart.current.mouseX;

      const deltaY =
        moveEvent.clientY -
        dragStart.current.mouseY;

      let nextX =
        dragStart.current.windowX +
        deltaX;

      let nextY =
        dragStart.current.windowY +
        deltaY;

      /*
       * Keep enough of the window visible
       * that the player can always recover
       * it.
       */

      const visibleWidth =
        minimized
          ? 220
          : 320;

      const visibleHeight =
        minimized
          ? 54
          : 90;

      const minX =
        minimized
          ? -220
          : -500;

      const maxX =
        window.innerWidth -
        visibleWidth;

      const minY = 0;

      const maxY =
        window.innerHeight -
        visibleHeight;

      nextX =
        Math.max(
          minX,
          Math.min(
            nextX,
            maxX,
          ),
        );

      nextY =
        Math.max(
          minY,
          Math.min(
            nextY,
            maxY,
          ),
        );

      onMove(
        file.id,
        {
          x: nextX,
          y: nextY,
        },
      );
    }

    function handleMouseUp() {
      dragging.current = false;

      document.body.classList.remove(
        "terminal-window-dragging",
      );

      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp,
      );
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove,
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp,
    );
  }

  /*
   * ========================================================
   * MINIMIZED WINDOW
   * ========================================================
   */

  if (minimized) {
    return (
      <article
        className={[
          "terminal-file-window",
          "terminal-file-window-minimized",

          closing
            ? "terminal-file-window-closing"
            : "",
        ].join(" ")}
        style={{
          zIndex,
          left: position.x,
          top: position.y,
        }}
        onMouseDown={() => {
          if (!closing) {
            onFocus(
              file.id,
            );
          }
        }}
      >
        <header
          className="terminal-file-minimized-bar"
          onMouseDown={
            startDragging
          }
        >
          <div className="terminal-file-minimized-title">
            <span>
              CLOVIS BRAY
            </span>

            <strong>
              {renderDiscordText(file.title, `${file.id}-title`)}
            </strong>
          </div>

          <div className="terminal-file-controls">
            <button
              type="button"
              className="terminal-file-control terminal-file-expand"
              onClick={
                handleRestore
              }
              aria-label={`Restore ${file.title}`}
              title="Restore"
            >
              □
            </button>

            <button
              type="button"
              className="terminal-file-control terminal-file-close"
              onClick={
                handleClose
              }
              aria-label={`Close ${file.title}`}
              title="Close"
            >
              ×
            </button>
          </div>
        </header>
      </article>
    );
  }

  /*
   * ========================================================
   * FULL WINDOW
   * ========================================================
   */

  return (
    <article
      className={[
        "terminal-file-window",

        closing
          ? "terminal-file-window-closing"
          : "",
      ].join(" ")}
      style={{
        zIndex,
        left: position.x,
        top: position.y,
      }}
      onMouseDown={() => {
        if (!closing) {
          onFocus(
            file.id,
          );
        }
      }}
    >
      {/*
       * ====================================================
       * TITLE BAR
       * ====================================================
       */}

      <header
        className="terminal-file-titlebar"
        onMouseDown={
          startDragging
        }
      >
        <div className="terminal-file-title-info">
          <span className="terminal-file-system">
            CLOVIS BRAY //
            ARCHIVE
          </span>

          <strong>
            {renderDiscordText(file.title, `${file.id}-title`)}
          </strong>
        </div>

        <div className="terminal-file-controls">
          <button
            type="button"
            className="terminal-file-control terminal-file-minimize"
            onClick={
              handleMinimize
            }
            aria-label={`Minimize ${file.title}`}
            title="Minimize"
          >
            —
          </button>

          <button
            type="button"
            className="terminal-file-control terminal-file-close"
            onClick={
              handleClose
            }
            aria-label={`Close ${file.title}`}
            title="Close"
          >
            ×
          </button>
        </div>
      </header>

      {/*
       * ====================================================
       * BLUE ACCENT
       * ====================================================
       */}

      <div className="terminal-file-blue-line">
        <span />
      </div>

      {/*
       * ====================================================
       * FILE CONTENT
       * ====================================================
       */}

      <section className="terminal-file-body">
        <header className="terminal-file-metadata">
          <div>
            <span>
              RECORD
            </span>

            <strong>
              {file.id}
            </strong>
          </div>

          <div>
            <span>
              DIVISION
            </span>

            <strong>
              {file.subtitle}
            </strong>
          </div>

          <div>
            <span>
              CLASSIFICATION
            </span>

            <strong>
              {
                file.classification
              }
            </strong>
          </div>
        </header>

        <div className="terminal-file-content">
          {file.content.map((block, index) => (
            <div
              className="terminal-message-block"
              key={`${file.id}-${index}`}
            >
              {renderDiscordBlock(
                block,
                `${file.id}-${index}`,
              )}
            </div>
          ))}
        </div>
      </section>

      {/*
       * ====================================================
       * FOOTER
       * ====================================================
       */}

      <footer className="terminal-file-footer">
        <span>
          CLOVIS BRAY
          CORPORATION
        </span>

        <span>
          TERMINAL ARCHIVE
        </span>
      </footer>
    </article>
  );
}
