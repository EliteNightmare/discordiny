import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./SivaBoot.css";

type SivaBootProps = {
  onComplete: () => void;
};

const REQUIRED_KEYS = [
  "shift",
  "s",
  "i",
  "v",
  "a",
];

export default function SivaBoot({
  onComplete,
}: SivaBootProps) {
  const [progress, setProgress] =
    useState(0);

  const [status, setStatus] =
    useState(
      "INITIALIZING DISCORDINY",
    );

  const [terminalTriggered, setTerminalTriggered] =
    useState(false);

  const heldKeys =
    useRef<Set<string>>(
      new Set(),
    );

  const triggered =
    useRef(false);

  useEffect(() => {
    /*
     * Five-second boot sequence.
     */
    const startedAt =
      Date.now();

    const duration = 5000;

    const progressTimer =
      window.setInterval(() => {
        const elapsed =
          Date.now() -
          startedAt;

        const nextProgress =
          Math.min(
            100,
            Math.floor(
              (elapsed / duration) *
                100,
            ),
          );

        setProgress(
          nextProgress,
        );

        if (elapsed < 900) {
          setStatus(
            "INITIALIZING DISCORDINY",
          );
        } else if (
          elapsed < 1800
        ) {
          setStatus(
            "VERIFYING MEMORY",
          );
        } else if (
          elapsed < 2700
        ) {
          setStatus(
            "ESTABLISHING NETWORK LINK",
          );
        } else if (
          elapsed < 3600
        ) {
          setStatus(
            "VALIDATING SYSTEM",
          );
        } else if (
          elapsed < 4500
        ) {
          setStatus(
            "FINALIZING BOOT SEQUENCE",
          );
        } else {
          setStatus(
            "SYSTEM READY",
          );
        }

        if (
          elapsed >= duration
        ) {
          window.clearInterval(
            progressTimer,
          );

          /*
           * Don't open Home if the
           * secret terminal trigger is
           * currently being processed.
           */
          if (!triggered.current) {
            onComplete();
          }
        }
      }, 40);

    return () => {
      window.clearInterval(
        progressTimer,
      );
    };
  }, [onComplete]);

  useEffect(() => {
    function normalizeKey(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Shift"
      ) {
        return "shift";
      }

      return event.key.toLowerCase();
    }

    async function activateTerminal() {
      /*
       * Prevent duplicate requests if
       * key-repeat events fire while the
       * keys are being held.
       */
      if (triggered.current) {
        return;
      }

      triggered.current = true;

      setTerminalTriggered(
        true,
      );

      setStatus(
        "SIVA ACCESS VECTOR DETECTED",
      );

      try {
        const response =
          await fetch(
            "/api/terminal/create",
            {
              method: "POST",
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.instanceKey
        ) {
          throw new Error(
            "Instance creation failed.",
          );
        }

        setStatus(
          "OPENING SIVA TERMINAL",
        );

        /*
         * Redirect to the secure
         * one-time terminal instance.
         */
        window.location.href =
          `https://terminal.discordiny.com/${encodeURIComponent(
            data.instanceKey,
          )}`;
      } catch {
        /*
         * If something goes wrong,
         * cancel the Easter egg and
         * allow Discordiny to finish
         * booting normally.
         */
        triggered.current =
          false;

        setTerminalTriggered(
          false,
        );

        heldKeys.current.clear();

        setStatus(
          "SYSTEM READY",
        );

        window.setTimeout(
          () => {
            onComplete();
          },
          500,
        );
      }
    }

    function checkKeys() {
      const allHeld =
        REQUIRED_KEYS.every(
          (key) =>
            heldKeys.current.has(
              key,
            ),
        );

      if (allHeld) {
        void activateTerminal();
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      const key =
        normalizeKey(event);

      heldKeys.current.add(
        key,
      );

      checkKeys();
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      const key =
        normalizeKey(event);

      heldKeys.current.delete(
        key,
      );
    }

    function handleBlur() {
      /*
       * Avoid keys getting "stuck"
       * if the browser loses focus
       * while a key is held.
       */
      heldKeys.current.clear();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "keyup",
      handleKeyUp,
    );

    window.addEventListener(
      "blur",
      handleBlur,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp,
      );

      window.removeEventListener(
        "blur",
        handleBlur,
      );
    };
  }, [onComplete]);

  return (
    <main
      className={
        terminalTriggered
          ? "siva-boot siva-boot-triggered"
          : "siva-boot"
      }
    >
      <div className="siva-boot-grid" />

      <div className="siva-boot-scanlines" />

      <div className="siva-boot-glitch siva-boot-glitch-one" />

      <div className="siva-boot-glitch siva-boot-glitch-two" />

      <div className="siva-boot-glitch siva-boot-glitch-three" />

      <section className="siva-boot-content">
        <div className="siva-boot-code siva-boot-code-left">
          <span>
            0x001 // LINK
          </span>

          <span>
            0x004 // MEMORY
          </span>

          <span>
            0x00A // NETWORK
          </span>

          <span>
            0x00F // PROTOCOL
          </span>
        </div>

        <div className="siva-boot-center">
          <div className="siva-boot-symbol">
            <span>
              ◆
            </span>
          </div>

          <div className="siva-boot-name">
            DISCORDINY
          </div>

          <div className="siva-boot-status">
            {status}
          </div>

          <div className="siva-boot-progress">
            <div
              className="siva-boot-progress-fill"
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <div className="siva-boot-progress-data">
            <span>
              SYS://BOOT
            </span>

            <span>
              {String(
                progress,
              ).padStart(
                3,
                "0",
              )}
              %
            </span>
          </div>
        </div>

        <div className="siva-boot-code siva-boot-code-right">
          <span>
            [OK] CORE
          </span>

          <span>
            [OK] D1
          </span>

          <span>
            [OK] AUTH
          </span>

          <span>
            [..] SIVA
          </span>
        </div>
      </section>

      <div className="siva-boot-footer">
        <span>
          DISCORDINY SYSTEM
        </span>

        <span>
          BUILD://ACTIVE
        </span>
      </div>
    </main>
  );
}
