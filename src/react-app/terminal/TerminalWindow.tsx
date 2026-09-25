import type {
  MouseEvent,
} from "react";

import type {
  TerminalFile,
} from "./terminalFiles";

import "./TerminalWindow.css";

type TerminalWindowProps = {
  file: TerminalFile;

  zIndex: number;

  offset: number;

  onClose: (
    fileId: string,
  ) => void;

  onFocus: (
    fileId: string,
  ) => void;
};

export default function TerminalWindow({
  file,
  zIndex,
  offset,
  onClose,
  onFocus,
}: TerminalWindowProps) {
  function handleClose(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    /*
     * Don't let the window focus event
     * fire when clicking close.
     */
    event.stopPropagation();

    onClose(
      file.id,
    );
  }

  return (
    <article
      className="terminal-file-window"
      style={{
        zIndex,

        /*
         * Each newly opened window gets
         * a slightly different position.
         */
        transform:
          `translate(${offset}px, ${offset}px)`,
      }}
      onMouseDown={() =>
        onFocus(file.id)
      }
    >
      <header className="terminal-file-titlebar">
        <div className="terminal-file-title-info">
          <span className="terminal-file-system">
            CLOVIS BRAY //
            ARCHIVE
          </span>

          <strong>
            {file.title}
          </strong>
        </div>

        <button
          type="button"
          className="terminal-file-close"
          onClick={
            handleClose
          }
          aria-label={
            `Close ${file.title}`
          }
        >
          ×
        </button>
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
