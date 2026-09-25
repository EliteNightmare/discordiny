import {
  useCallback,
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

/*
 * Mobile puzzle:
 *
 * S -> I -> V -> A
 *
 * Each next letter must be pressed
 * within this amount of time.
 */
const MOBILE_SEQUENCE = [
  "S",
  "I",
  "V",
  "A",
];

const MOBILE_SEQUENCE_TIMEOUT =
  1600;

export default function SivaBoot({
  onComplete,
}: SivaBootProps) {
  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    status,
    setStatus,
  ] = useState(
    "INITIALIZING DISCORDINY",
  );

  const [
    terminalTriggered,
    setTerminalTriggered,
  ] = useState(false);

  /*
   * Which step of S-I-V-A the
   * mobile player has reached.
   *
   * 0 = waiting for S
   * 1 = waiting for I
   * 2 = waiting for V
   * 3 = waiting for A
   */
  const [
    mobileSequenceIndex,
    setMobileSequenceIndex,
  ] = useState(0);

  const heldKeys =
    useRef<Set<string>>(
      new Set(),
    );

  const triggered =
    useRef(false);

  const mobileSequenceIndexRef =
    useRef(0);

  const mobileSequenceTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /*
   * ========================================================
   * RESET MOBILE SEQUENCE
   * ========================================================
   */

  const resetMobileSequence =
    useCallback(() => {
      if (
        mobileSequenceTimer.current
      ) {
        clearTimeout(
          mobileSequenceTimer.current,
        );

        mobileSequenceTimer.current =
          null;
      }

      mobileSequenceIndexRef.current =
        0;

      setMobileSequenceIndex(0);
    }, []);

  /*
   * ========================================================
   * ACTIVATE TERMINAL
   * ========================================================
   */

  const activateTerminal =
    useCallback(async () => {
      if (triggered.current) {
        return;
      }

      triggered.current = true;

      setTerminalTriggered(true);

      setStatus(
        "SIVA ACCESS VECTOR DETECTED",
      );

      if (
        mobileSequenceTimer.current
      ) {
        clearTimeout(
          mobileSequenceTimer.current,
        );

        mobileSequenceTimer.current =
          null;
      }

      try {
        const response =
          await fetch(
            "/api/terminal/create",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },
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
            "Unable to create terminal instance.",
          );
        }

        setStatus(
          "OPENING SIVA TERMINAL",
        );

        window.location.href =
          `https://terminal.discordiny.com/${encodeURIComponent(
            data.instanceKey,
          )}`;
      } catch {
        triggered.current = false;

        setTerminalTriggered(false);

        heldKeys.current.clear();

        resetMobileSequence();

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
    }, [
      onComplete,
      resetMobileSequence,
    ]);

  /*
   * ========================================================
   * 5 SECOND BOOT SEQUENCE
   * ========================================================
   */

  useEffect(() => {
    const startTime =
      performance.now();

    let animationFrame = 0;

    function update() {
      const elapsed =
        performance.now() -
        startTime;

      const nextProgress =
        Math.min(
          100,
          (elapsed / 5000) *
            100,
        );

      setProgress(
        nextProgress,
      );

      if (
        !triggered.current
      ) {
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
      }

      if (elapsed >= 5000) {
        if (
          !triggered.current
        ) {
          onComplete();
        }

        return;
      }

      animationFrame =
        requestAnimationFrame(
          update,
        );
    }

    animationFrame =
      requestAnimationFrame(
        update,
      );

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );
    };
  }, [onComplete]);

  /*
   * ========================================================
   * DESKTOP SECRET
   *
   * SHIFT + S + I + V + A
   * held simultaneously.
   * ========================================================
   */

  useEffect(() => {
    function normalizeKey(
      key: string,
    ) {
      if (
        key === "Shift"
      ) {
        return "shift";
      }

      return key.toLowerCase();
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
        activateTerminal();
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      const key =
        normalizeKey(
          event.key,
        );

      heldKeys.current.add(
        key,
      );

      checkKeys();
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      const key =
        normalizeKey(
          event.key,
        );

      heldKeys.current.delete(
        key,
      );
    }

    function handleBlur() {
      heldKeys.current.clear();

      resetMobileSequence();
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
  }, [
    activateTerminal,
    resetMobileSequence,
  ]);

  /*
   * ========================================================
   * MOBILE S-I-V-A PUZZLE
   * ========================================================
   */

  function handleMobileLetter(
    letter: string,
  ) {
    if (
      triggered.current
    ) {
      return;
    }

    const currentIndex =
      mobileSequenceIndexRef.current;

    const expectedLetter =
      MOBILE_SEQUENCE[
        currentIndex
      ];

    /*
     * Wrong letter:
     *
     * Reset everything.
     *
     * If they happened to press S,
     * however, immediately treat that
     * as the beginning of a new
     * sequence.
     */
    if (
      letter !==
      expectedLetter
    ) {
      resetMobileSequence();

      if (letter === "S") {
        mobileSequenceIndexRef.current =
          1;

        setMobileSequenceIndex(
          1,
        );

        mobileSequenceTimer.current =
          setTimeout(
            resetMobileSequence,
            MOBILE_SEQUENCE_TIMEOUT,
          );
      }

      return;
    }

    /*
     * Correct letter.
     */
    const nextIndex =
      currentIndex + 1;

    /*
     * A completed the sequence.
     */
    if (
      nextIndex >=
      MOBILE_SEQUENCE.length
    ) {
      resetMobileSequence();

      activateTerminal();

      return;
    }

    mobileSequenceIndexRef.current =
      nextIndex;

    setMobileSequenceIndex(
      nextIndex,
    );

    /*
     * Restart the timer every time
     * they successfully press the
     * next letter.
     */
    if (
      mobileSequenceTimer.current
    ) {
      clearTimeout(
        mobileSequenceTimer.current,
      );
    }

    mobileSequenceTimer.current =
      setTimeout(
        resetMobileSequence,
        MOBILE_SEQUENCE_TIMEOUT,
      );
  }

  /*
   * Clean up sequence timer if the
   * component disappears.
   */
  useEffect(() => {
    return () => {
      if (
        mobileSequenceTimer.current
      ) {
        clearTimeout(
          mobileSequenceTimer.current,
        );
      }
    };
  }, []);

  return (
    <main
      className={
        terminalTriggered
          ? "siva-boot siva-terminal-triggered"
          : "siva-boot"
      }
    >
      <div className="siva-grid" />

      <div className="siva-scanlines" />

      <div className="siva-glitch-bar siva-glitch-bar-one" />

      <div className="siva-glitch-bar siva-glitch-bar-two" />

      <div className="siva-glitch-bar siva-glitch-bar-three" />

      {/*
       * Decorative system text
       */}

      <div className="siva-code siva-code-left">
        <span>
          SYS//DISCORDINY
        </span>

        <span>
          MEM_CHECK: OK
        </span>

        <span>
          LINK: ACTIVE
        </span>

        <span>
          PROTOCOL: INIT
        </span>
      </div>

      <div className="siva-code siva-code-right">
        <span>
          0x0007F3A
        </span>

        <span>
          NODE//ACTIVE
        </span>

        <span>
          SIVA_NET
        </span>

        <span>
          AUTH//WAIT
        </span>
      </div>

      {/*
       * Main boot content
       */}

      <section className="siva-boot-content">
        <div className="siva-diamond">
          <span />
        </div>

        <h1>
          DISCORDINY
        </h1>

        <p className="siva-status">
          {status}
        </p>

        <div className="siva-progress-track">
          <div
            className="siva-progress-fill"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div className="siva-progress-number">
          {Math.floor(
            progress,
          )
            .toString()
            .padStart(
              3,
              "0",
            )}
          %
        </div>
      </section>

      <footer className="siva-footer">
        DISCORDINY SYSTEM
        // BOOT
      </footer>

      {/*
       * ====================================================
       * MOBILE SECRET BUTTONS
       *
       * Deliberately scattered across
       * four separate areas.
       *
       * They only appear on coarse
       * pointer/touch devices via CSS.
       * ====================================================
       */}

      <button
        type="button"
        className={[
          "siva-sequence-key",
          "siva-sequence-s",
          mobileSequenceIndex >
          0
            ? "siva-sequence-complete"
            : "",
        ].join(" ")}
        onClick={() =>
          handleMobileLetter(
            "S",
          )
        }
        aria-label="S"
      >
        S
      </button>

      <button
        type="button"
        className={[
          "siva-sequence-key",
          "siva-sequence-i",
          mobileSequenceIndex >
          1
            ? "siva-sequence-complete"
            : "",
        ].join(" ")}
        onClick={() =>
          handleMobileLetter(
            "I",
          )
        }
        aria-label="I"
      >
        I
      </button>

      <button
        type="button"
        className={[
          "siva-sequence-key",
          "siva-sequence-v",
          mobileSequenceIndex >
          2
            ? "siva-sequence-complete"
            : "",
        ].join(" ")}
        onClick={() =>
          handleMobileLetter(
            "V",
          )
        }
        aria-label="V"
      >
        V
      </button>

      <button
        type="button"
        className={[
          "siva-sequence-key",
          "siva-sequence-a",
          mobileSequenceIndex >
          3
            ? "siva-sequence-complete"
            : "",
        ].join(" ")}
        onClick={() =>
          handleMobileLetter(
            "A",
          )
        }
        aria-label="A"
      >
        A
      </button>
    </main>
  );
}
