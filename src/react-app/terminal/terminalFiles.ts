export type TerminalFile = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  classification: string;
  content: string[];
};

export const terminalFiles: TerminalFile[] = [
  {
    id: "cb-record-001",

    /*
     * This is what the player types
     * into the terminal.
     */
    code: "EXO-01",

    title: "EXOSCIENCE RECORD 001",

    subtitle:
      "EUROPA RESEARCH ARCHIVE",

    classification:
      "RESTRICTED",

    content: [
      "PLACEHOLDER TERMINAL FILE.",
      "",
      "This record has not yet been populated.",
      "",
      "Additional Clovis Bray archive material will be inserted here.",
    ],
  },

  {
    id: "cb-record-002",

    code: "BRAY-7",

    title: "PROJECT ARCHIVE 007",

    subtitle:
      "CLOVIS BRAY CORPORATION",

    classification:
      "CONFIDENTIAL",

    content: [
      "PLACEHOLDER PROJECT ARCHIVE.",
      "",
      "SUBJECT: UNASSIGNED",
      "STATUS: ARCHIVED",
      "",
      "No additional data is currently available.",
    ],
  },

  {
    id: "cb-record-003",

    code: "DEEP-STONE",

    title: "DEEP STONE RECORD",

    subtitle:
      "EXOSCIENCE NETWORK",

    classification:
      "EXECUTIVE ACCESS",

    content: [
      "PLACEHOLDER DEEP STONE RECORD.",
      "",
      "Access to this document has been recorded.",
      "",
      "Further information will be added later.",
    ],
  },
];


/*
 * Resolve a player-entered terminal
 * code to a virtual terminal file.
 *
 * Codes are case-insensitive.
 */
export function findTerminalFile(
  enteredCode: string,
): TerminalFile | undefined {
  const normalized =
    enteredCode
      .trim()
      .toUpperCase();

  return terminalFiles.find(
    (file) =>
      file.code.toUpperCase() ===
      normalized,
  );
}
