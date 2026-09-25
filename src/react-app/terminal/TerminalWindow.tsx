import {
  useRef,
} from "react";

import type {
  MouseEvent as ReactMouseEvent,
} from "react";

import type {
  TerminalFile,
} from "./terminalFiles";

import "./TerminalWindow.css";

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

  const dragStart =
    useRef({
      mouseX: 0,
      mouseY: 0,
      windowX: 0,
      windowY: 0,
    });

  function handleClose(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    onClose(file.id);
  }

  function handleMinimize(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    onFocus(file.id);

    onMinimize(file.id);
  }

  function handleRestore(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    onFocus(file.id);

    onRestore(file.id);
  }

  function startDragging(
    event: ReactMouseEvent<HTMLElement>,
  ) {
    /*
     * Don't begin dragging if the user
     * clicked one of the titlebar
     * buttons.
     */
    if (
      (
        event.target as HTMLElement
      ).closest("button")
    ) {
      return;
    }

    /*
     * Mobile windows stay fixed.
     */
    if (
      window.matchMedia(
        "(max-width: 700px)",
      ).matches
    ) {
      return;
    }

    event.preventDefault();

    onFocus(file.id);

    dragging.current = true;

    dragStart.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,

      windowX: position.x,
      windowY: position.y,
    };

    document.body.classList.add(
      "terminal-window-dragging",
    );

    const handleMouseMove = (
      moveEvent: MouseEvent,
    ) => {
      if (!dragging.current) {
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
       * Keep at least part of the
       * window visible.
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
        -(
          minimized
            ? 220
            : 500
        );

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
    };

    const handleMouseUp = () => {
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
    };

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
   * MINIMIZED WINDOW
   */
  if (minimized) {
    return (
      <article
        className="terminal-file-window terminal-file-window-minimized"
        style={{
          zIndex,

          left: position.x,
          top: position.y,
        }}
        onMouseDown={() =>
          onFocus(file.id)
        }
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
              {file.title}
            </strong>
          </div>

          <div className="terminal-file-controls">
            <button
              type="button"
              className="terminal-file-control terminal-file-expand"
              onClick={
                handleRestore
              }
              aria-label={
                `Restore ${file.title}`
              }
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
              aria-label={
                `Close ${file.title}`
              }
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
   * NORMAL WINDOW
   */
  return (
    <article
      className="terminal-file-window"
      style={{
        zIndex,

        left: position.x,
        top: position.y,
      }}
      onMouseDown={() =>
        onFocus(file.id)
      }
    >
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
            {file.title}
          </strong>
        </div>

        <div className="terminal-file-controls">
          <button
            type="button"
            className="terminal-file-control terminal-file-minimize"
            onClick={
              handleMinimize
            }
            aria-label={
              `Minimize ${file.title}`
            }
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
            aria-label={
              `Close ${file.title}`
            }
            title="Close"
          >
            ×
          </button>
        </div>
      </header>

      <div className="terminal-file-blue-line">
        <span />
      </div>

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
              {file.classification}
            </strong>
          </div>
        </header>

        <div className="terminal-file-content">
          {file.content.map(
            (line, index) => (
              <p
                key={
                  `${file.id}-${index}`
                }
              >
                {line ||
                  "\u00A0"}
              </p>
            ),
          )}
        </div>
      </section>

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
