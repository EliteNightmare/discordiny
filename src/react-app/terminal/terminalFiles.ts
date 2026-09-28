export type TerminalFile = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  classification: string;
  content: string[];
};

/*
 * Terminal message copy below is restored from the original
 * Python bot's utils/terminal_messages JSON files. Discord-style
 * markup is intentionally preserved for TerminalWindow to render.
 */
export const terminalFiles: TerminalFile[] = [
  {
    id: "ascension-relic-override-whm742",
    code: "ASCENSION.RELIC-OVERRIDE.KEY=WHM742",
    title: "CORRUPTION KEY ACCEPTED `||ASCENSION/WHM742||`",
    subtitle: "SIVA TERMINAL",
    classification: "R.E.L.I.C. PROTOCOL",
    content: [
      "`INITIATING PROTOCOL: R.E.L.I.C.//PROGRESS`",
      "**ADDITIONAL KEY ACQUIRED, UNIQUE_DATA.MEMORIZE: KEY.ENHANCE**",
      "```PROTOCOL: R.E.L.I.C.//PROGRESS SUCCESSFULLY INITIATED\nEXECUTE R.E.L.I.C.//PHASE.PUSH(VALUE=1)\nATTEMPTING EXECUTION...\n\n...\n\nSUCCESS!\nR.E.L.I.C./PHASE == 4```\nC̷O̷R̷R̷U̷P̷T̷I̷O̷N̷.̷S̷T̷A̷T̷U̷S̷:̷ S̷P̷R̷E̷A̷D̷I̷N̷G̷\n**PLEASE AWAIT FURTHER INSTRUCTIONS**",
    ],
  },

  {
    id: "backwash",
    code: "BACKWASH",
    title: "SYSTEM BACKWASH REQUEST",
    subtitle: "BACKWASH SYSTEM",
    classification: "ENCRYPTION PROTOCOL",
    content: [
      "USERNAME CONFIRMATION: FAILED\n Please access ROOT using key:\nENCRYPTION LOCK!",
      "**ENCRYPTION PROTOCOL:**",
      "The protocol states a riddle must be made to identify the TYPE:\n\n```I am a perfect square of an even cube,\nand the perfect cube of an even square.\nDecrease me by half of my own root,\nand I become the steps the slender hand takes to change the hour.\n\nAdd me behind what the Area of a rectangle divided by Height is, and you discover the type.```",
      "**ENCRYPTION DATA:**",
      "Uk9PVC5JTklUSUFURS5PVkVSUklERV9LRVk9UEFTU1dPUkQtRVJST1IuVkFMVUU=",
    ],
  },

  {
    id: "bray",
    code: "BRAY",
    title: "AUTHORIZATION CODE || STATUS: RESTORED",
    subtitle: "B#AY#ECH TERMINAL",
    classification: "AUTHORIZATION RESTORED",
    content: [
      "PLEASE INPUT DECRYPTED USERNAME IN TERMINAL",
      "**USERNAME//ENCODED: DROOZ**",
      "CIPHER TYPE HINT: TBAHPLA//HSABTA",
    ],
  },

  {
    id: "c-bray",
    code: "C. BRAY",
    title: "ACCESS REQUEST IDENTIFIED",
    subtitle: "PRIVATE TERMINAL // EUROPA",
    classification: "AUTHORIZED PERSONNEL ONLY",
    content: [
      "This Terminal **Thread** is meant for Authorized Personnel only.",
      "**SENDING.TRANSMISSION.TXT >> DR. W-B**",
      "Wilhelmina, my dear... Do not worry, the R.E.L.I.C. still has REDACTED stages to go through.\nPlease refer to attached entrypoint.\n\n\n\n[SYSTEM_ERROR] >>  CRITICAL ERROR",
      "**Attached File:**",
      "**STATUS:** ENCODED-EMPEROR-7 \\\\\n YVVA PUPAPHSPGHAPVU RLF PZ OPKKLU PU WSHPU ZPNOA: oaawz://hzzlaz.k2jvttbupafobi.jvt/kpzjvykpuf/whzzdvyk-lyyvy.dlit\n\n**USERNAME ENCRYPTION WEAKENED.**\n PLEASE EXECUTE TERMINAL: \\\n ` BACKWASH `",
    ],
  },

  {
    id: "cbme",
    code: "CBME",
    title: "CORRUPTION KEY ACCEPTED `||CBME||`",
    subtitle: "SIVA TERMINAL",
    classification: "R.E.L.I.C. PROTOCOL",
    content: [
      "`INITIATING PROTOCOL: R.E.L.I.C.//PROGRESS`",
      "**SECOND KEY ACQUIRED, UNIQUE_DATA.MEMORIZE: KEY.ENHANCE**",
      "```PROTOCOL: R.E.L.I.C.//PROGRESS SUCCESSFULLY INITIATED\nEXECUTE R.E.L.I.C.//PHASE.PUSH(VALUE=1)\nATTEMPTING EXECUTION...\n\n...\n\nSUCCESS!\nR.E.L.I.C./PHASE == 2```\nC̷O̷R̷R̷U̷P̷T̷I̷O̷N̷.̷S̷T̷A̷T̷U̷S̷:̷ S̷P̷R̷E̷A̷D̷I̷N̷G̷\n**PLEASE AWAIT FURTHER INSTRUCTIONS**",
    ],
  },

  {
    id: "error123",
    code: "ERROR123",
    title: "ERROR: UNAUTHORIZED ACCESS DETECTED",
    subtitle: "WARNING TERMINAL",
    classification: "SECURITY BREACH",
    content: [
      "UNAUTHORIZED BREACH OF PROTOCOL R.E.L.I.C. HAS BEEN DETECTED",
      "**SABOTAGE.MESSAGE.READ >> LqBWpfSRsZc=**",
      "R.E.L.I.C. Protocol has activated twice.\n\nThat is not possible.\n\nI designed the activation sequence to require a singular authorization event.\nThere was no second authorization event from my credentials, but the system says otherwise.\nHow is this possible?\n\n**We CANNOT afford a containment breach...**\n\n -Willa Bray",
    ],
  },

  {
    id: "red-coral-relic-override-cvb786",
    code: "RED-CORAL.RELIC-OVERRIDE.KEY=CVB786",
    title: "CORRUPTION KEY ACCEPTED `||RED-CORAL/CVB786||`",
    subtitle: "SIVA TERMINAL",
    classification: "R.E.L.I.C. PROTOCOL",
    content: [
      "`INITIATING PROTOCOL: R.E.L.I.C.//PROGRESS`",
      "**ADDITIONAL KEY ACQUIRED, UNIQUE_DATA.MEMORIZE: KEY.ENHANCE**",
      "```PROTOCOL: R.E.L.I.C.//PROGRESS SUCCESSFULLY INITIATED\nEXECUTE R.E.L.I.C.//PHASE.PUSH(VALUE=1)\nATTEMPTING EXECUTION...\n\n...\n\nSUCCESS!\nR.E.L.I.C./PHASE == 5//COMPLETE```\nC̷O̷R̷R̷U̷P̷T̷I̷O̷N̷.̷S̷T̷A̷T̷U̷S̷:̷ S̷P̷R̷E̷A̷D̷I̷N̷G̷\n**PLEASE AWAIT FURTHER INSTRUCTIONS**",
    ],
  },

  {
    id: "travel-plaguelands",
    code: "TRAVEL.PLAGUELANDS",
    title: "CORRUPTION KEY ACCEPTED `||PLAGUE.OVERRIDE||`",
    subtitle: "SIVA TERMINAL // TRANSIT CORRIDOR",
    classification: "GEOSPATIAL ROUTING",
    content: [
      "`INITIATING REMOTE GEOSPATIAL ROUTING: PLG_LDS//TERMINAL`",
      "**CURRENT DESTINATION UPDATED. REMOTE LINK ESTABLISHED.**",
      "```ROUTE CONFIGURATION: FACILITIES/EARTH/PLG_LDS/\nEXECUTE TRANSIT.QUANTUM_SNAP(SECTOR=SITE_6)\nATTEMPTING GEOSPATIAL ANCHOR...\n\n...\n\nSUCCESS!\nUPLINK REROUTED // NETWORK ACCESS STABLE```\nC̷O̷R̷R̷U̷P̷T̷I̷O̷N̷.̷S̷T̷A̷T̷U̷S̷:̷ S̷I̷V̷A̷_̷D̷E̷N̷S̷I̷T̷Y̷_̷M̷A̷X̷I̷M̷U̷M̷\nUse **`/terminal key=TRAVEL.PLAGUELANDS`** to instantly return to this sector protocol framework.",
    ],
  },

  {
    id: "uh3c",
    code: "UH3C",
    title: "ACCESS CODE DETECTED: WELCOME, Dr. REDACTED",
    subtitle: "B####E#H TERMINAL",
    classification: "SIVA NODE UNSTABLE",
    content: [
      "[ERROR_0x7F3A] *ENHANCE* PROTOCOL: CORRUPTED // SIVA NODE UNSTABLE\n>>> // REPLICATING... REPLICATING... REPLICATING...",
      "**HINT: EMPEROR+7**",
      "DECIPHER: `IYHF`",
    ],
  },

  {
    id: "willa",
    code: "WILLA",
    title: "RESTORED AUTHORIZATION CODE DETECTED:\n`WELCOME Dr. Willa Bray`",
    subtitle: "BRAYTECH TERMINAL",
    classification: "ENCRYPTED DOCUMENTS",
    content: [
      "`CAUTION: ENCRYPTED DOCUMENTS REQUESTED`\n|| Warning: Attempting to access unauthorized SIVA Documents may lead to imminent termination by the BrayTech Corporation.\n`By using this terminal you have accepted to these terms.`\n**You have been warned.**",
      "**TYPE: UNKNOWN.SIGNAL.DECRYPT**",
      "UNKNOWN SIGNAL IDENTIFIED: ~~ZDR017~~\n`ROTATE OVER TRANSMIT - 1`",
      "**KEY: *Italic*.BACKTRACK**",
      "Please refer to prior terminal entries.",
      "**CORRUPTION DATA**",
      "ENTER DECIPHERED CORRUPTION KEY IN TERMINAL TO PROCEED",
      "**TERMINAL IDENTIFIER:**",
      "`uzM0hVBGDAEUiaTTX+BGQg==`",
    ],
  },

  {
    id: "yxk7-xg7a-5w4k",
    code: "YXK7-XG7A-5W4K",
    title: "CORRUPTION KEY ACCEPTED `||PLAGUE.OVERRIDE||`",
    subtitle: "SIVA TERMINAL // TRANSIT CORRIDOR",
    classification: "GEOSPATIAL ROUTING",
    content: [
      "`INITIATING REMOTE GEOSPATIAL ROUTING: PLG_LDS//TERMINAL`",
      "**CURRENT DESTINATION UPDATED. REMOTE LINK ESTABLISHED.**",
      "```ROUTE CONFIGURATION: FACILITIES/EARTH/PLG_LDS/\nEXECUTE TRANSIT.QUANTUM_SNAP(SECTOR=SITE_6)\nATTEMPTING GEOSPATIAL ANCHOR...\n\n...\n\nSUCCESS!\nUPLINK REROUTED // NETWORK ACCESS STABLE```\nC̷O̷R̷R̷U̷P̷T̷I̷O̷N̷.̷S̷T̷A̷T̷U̷S̷:̷ S̷I̷V̷A̷_̷D̷E̷N̷S̷I̷T̷Y̷_̷M̷A̷X̷I̷M̷U̷M̷\nUse **`/terminal key=TRAVEL.PLAGUELANDS`** to instantly return to this sector protocol framework.",
    ],
  },

];

export function findTerminalFile(
  enteredCode: string,
): TerminalFile | undefined {
  const normalized = enteredCode.trim().toUpperCase();

  return terminalFiles.find(
    (file) => file.code.trim().toUpperCase() === normalized,
  );
}
