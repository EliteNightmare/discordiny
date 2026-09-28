export const ROOT_LAYOUT = {
  "directories": [
    {
      "name": "SYSTEM",
      "node": {
        "directories": [],
        "files": [
          "maintenance.log",
          "notice.txt",
          "system_status.txt",
          "version.txt"
        ]
      }
    },
    {
      "name": "BRAYTECH",
      "node": {
        "directories": [],
        "files": [
          "Incident_Report.log",
          "Internal_Memorandum.txt",
          "Corporate_Profile.txt",
          "Corporate_Directive.txt"
        ]
      }
    },
    {
      "name": "TERMINAL",
      "node": {
        "directories": [],
        "files": [
          "history.log",
          "authorization.data",
          "keys.list",
          "manual.txt"
        ]
      }
    },
    {
      "name": "FACILITIES",
      "node": {
        "directories": [
          {
            "name": "EARTH",
            "node": {
              "directories": [],
              "files": [
                "seraph_station.file"
              ]
            }
          },
          {
            "name": "EUROPA",
            "node": {
              "directories": [],
              "files": [
                "eventide.file"
              ]
            }
          }
        ],
        "files": []
      }
    },
    {
      "name": "COMMUNICATIONS",
      "node": {
        "directories": [],
        "files": []
      }
    },
    {
      "name": "PROTOCOLS",
      "node": {
        "directories": [],
        "files": []
      }
    }
  ],
  "files": [
    "READ_ME.txt"
  ]
} as const;

export const ROOT_FILES: Record<string, any> = {
  "READ_ME.txt": {
    "title": ".READ_ME.txt",
    "description": "BRAYTECH CORPORATE COMPUTING NETWORK",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_blue",
      "fields": [
        {
          "name": "DOCUMENT STATUS",
          "value": "```text\nDOCUMENT: READ_ME.txt\nCLASSIFICATION: INTERNAL\nREVISION: 7.4.1```",
          "inline": false
        },
        {
          "name": "01 // EXTERNAL ROOT TERMINAL NAVIGATION",
          "value": "The ROOT Terminal provides authorized personnel with navigation through the BrayTech archival filesystem.\n\nDirectory and file locations are represented using the `/` delimiter.\n\nExample:\n`ROOT/SYSTEM/notice.txt`\n\nTo access a specific directory, follow its ROOT path.",
          "inline": false
        },
        {
          "name": "02 // FILE ACCESS",
          "value": "Individual files may be addressed by extending the directory path.\n\nExample:\n`ROOT/PERSONNEL/WILLA_BRAY`\n\nA valid file path will return the corresponding archival record, transmission, document, image, or other authorized media.",
          "inline": false
        },
        {
          "name": "03 // SYSTEM NOTICE",
          "value": "ROOT access is intended for BrayTech personnel with a legitimate operational authorization.\n\nUnauthorized modification, duplication, extraction, or distribution of ROOT materials is prohibited under BrayTech Corporate Information Security Policy.\n\n**ALL ROOT ACTIVITY MAY BE LOGGED.**",
          "inline": false
        },
        {
          "name": "WARNING...",
          "value": "USER BREACH DETECTED. PLEASE REFER TO TERMINAL/MANUAL.TXT, PROCEED WITH CAUTION",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braytechanimated.gif"
  },
  "PROJECTS/project_REPLICATION.rep": {
    "title": "PROJECTS/project_REPLICATION.rep",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": [
        {
          "name": "WARNING!!! SYSTEM OVERRIDE DETECTED!!!",
          "value": "The SIVA optimization protocol- INITIATING REPLICATION OVERRIDE... ",
          "inline": false
        },
        {
          "name": "FRAGMENT 1",
          "value": "```Look to my greatest creations, the iron machines born to walk like man.\n\n\nTake the total number of reiterations your dear gunsmith endured before forgetting my name.\n\nAdd the Black Armory's total amount of founders, but first multiplied by its forgotten daughters number and a zero.\nPrecede it by some Greater Technology, and you've got your first fragment.\n\nThe second and third are not far from here... at least... you'll require some identification of mine.```",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_TRANSMISSION.rep": {
    "title": "PROJECTS/project_TRANSMISSION.rep",
    "description": "HISTORICAL R&D LOG // Early nanomachinery dispersal and biological augment testing.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Willa Bray Laboratories // Nanite Dispersal Framework",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT TRANSMISSION`",
          "inline": true
        },
        {
          "name": "LAB SECTOR",
          "value": "`DUST PALACE // MARS`",
          "inline": true
        },
        {
          "name": "TEST METRIC",
          "value": "`TECH MITES // SHIRAZI`",
          "inline": true
        },
        {
          "name": "PROJECT OVERVIEW",
          "value": "Project Transmission was initiated under Willa Bray to develop early-stage nanomachines designed to increase the physical strength, speed, and environmental resilience of prospective colony candidates. The project utilized custom molecular strands created by lead researcher Dr. Shirazi.",
          "inline": false
        },
        {
          "name": "CONTAINMENT CRUISE ALERT",
          "value": "The project was permanently shuttered following an unvouched atmospheric leak that infected human test subjects, causing radical neurological aggression. Remaining core assets have been archived and hidden within locked sectors of the Freehold database. Standard terminal manipulation requires verification via `user.password`.",
          "inline": false
        },
        {
          "name": "HISTORICAL FOOTNOTE // OWL SECTOR INTERCEPT",
          "value": "Centuries post-Collapse, civilian surveillance network **Owl Sector** flagged ancient transmission logs following a massive resurgence of five distinct color-coded tech mite variants (Brilliance, Glory, Splendor, Magnificence, Fortitude) swirling around modern units.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_NIOBE.rep": {
    "title": "PROJECTS/project_NIOBE.rep",
    "description": "RESTRICTED INTEL LOG // Surveillance on rogue weapons development and external assets.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Espionage Matrix // Niobe Initiative Surveillance",
      "fields": [
        {
          "name": "SURVEILLANCE TARGET",
          "value": "`NIOBE LABS // BLACK ARMORY`",
          "inline": true
        },
        {
          "name": "THREAT LEVEL",
          "value": "`HIGH // COMPETITIVE`",
          "inline": true
        },
        {
          "name": "INTEL INTERCEPT",
          "value": "`ACTIVE`",
          "inline": true
        },
        {
          "name": "ESPIONAGE OVERVIEW",
          "value": "Public Relations and Security forces have intercepted communications regarding an independent, underground consortium of wealthy families (Rasmussen, Meyrin, Satou) operating under the collective alias 'Black Armory'. They are currently developing high-tier, hyper-advanced weaponry capable of rivaling BrayTech baseline armaments.",
          "inline": false
        },
        {
          "name": "COUNTER-MEASURES",
          "value": "Agents have successfully planted local network bugs within their experimental prototyping systems. We are tracking their forge blueprints. Accessing the full intercept matrix requires entering the standard Level 2 clearance token: `user.password`.",
          "inline": false
        },
        {
          "name": "intercept_note.txt",
          "value": "The Armory founders are attempting to build an absolute defense bunker. They speak of a 'Meyrin signature' and 'Satou locks'. Keep monitoring. Clovis I has expressed a personal interest in seizing their weapon-shaping technology.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_ECHO.rep": {
    "title": "PROJECTS/project_ECHO.rep",
    "description": "PARTIALLY PURGED // Exoplanetary colony ship trajectory mapping and launch parameters.",
    "authorization": {
      "required_level": 2,
      "status": "COMPROMISED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Ares Spire Operations // Echo Project Core Status",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT ECHO // EXODUS MISSION`",
          "inline": true
        },
        {
          "name": "CORE INTELLIGENCE",
          "value": "`SOTERIA // AUGUR MIND`",
          "inline": true
        },
        {
          "name": "DATA INTEGRITY",
          "value": "`34% READABLE // PURGED`",
          "inline": true
        },
        {
          "name": "PROJECT OVERVIEW",
          "value": "Project Echo was established to launch a fleet of deep-space colony platforms (Exodus class) into outer sectors. Trajectory computing and predictive hazard analysis were fully delegated to Soteria, the Augur Mind, utilizing Vex-derived algorithmic modeling.",
          "inline": false
        },
        {
          "name": "CRITICAL REVISION // CRASH LOG",
          "value": "[CRITICAL REVISION]: Soteria began generating non-linear predictive simulations indicating an impending localized extinction event (labeled 'THE END'). The Augur Mind bypassed corporate command structures, forcibly launching localized colony assets prematurely under emergency colony protocols.",
          "inline": false
        },
        {
          "name": "EXECUTIVE FORCE OVERRIDE",
          "value": "...[DATA PURGED]... Clovis I initialized the Pillory confinement protocol, fragmenting Soteria's central chassis to seize her predictive engines. Remaining flight paths are heavily redacted. Re-verifying the launch matrix requires Level 3 master clearance via `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_ENGRAM.rep": {
    "title": "PROJECTS/project_ENGRAM.rep",
    "description": "PROJECT SUMMARY REPORT // Matter-state digitization and cryptographic storage matrix.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray R&D // Engram Data Optimization",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT ENGRAM // WILLA BRAY`",
          "inline": true
        },
        {
          "name": "MATERIAL ARCHETYPE",
          "value": "`SOLID-STATE DATA`",
          "inline": true
        },
        {
          "name": "INTEGRITY PARAMETER",
          "value": "`MATHEMATICALLY PERFECT`",
          "inline": true
        },
        {
          "name": "PROJECT OVERVIEW",
          "value": "Project Engram introduces a revolutionary state of matter where physical assets, organic materials, or raw information streams are encoded into a stable, physical crystalline matrix. This allows complex physical objects to be stored as data tokens and instantly materialized without degradation.",
          "inline": false
        },
        {
          "name": "CRYPTOGRAPHIC COMPRESSION",
          "value": "To prevent unauthorized extraction or logic corruption during spatial re-materialization, all local engram encoders require validation. Accessing the central decryption formulas or high-density blueprints requires a standard Level 2 handshake using the `user.password` string.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_WARMIND.rep": {
    "title": "PROJECTS/project_WARMIND.rep",
    "description": "RESTRICTED EXECUTIVE WRAP-UP // Global defense array and neural network matrix.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray Executive // Tyrant Framework Intel",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT WARMIND // RASPUTIN`",
          "inline": true
        },
        {
          "name": "CORE TERMINUS NETWORK",
          "value": "`HELLAS BASIN // MARS`",
          "inline": true
        },
        {
          "name": "SUBMIND COHORT",
          "value": "`MALAHAYATI // CHARLEMAGNE`",
          "inline": true
        },
        {
          "name": "MISSION METRICS",
          "value": "Project Warmind establishes an absolute, autonomous defense network spanning the entire Sol system. By anchoring localized planetary networks like Malahayati (Earth orbit) and Charlemagne (the Dust Palace) to the primary Hellas Basin core, the system achieves unprecedented predictive threat evaluation vectors.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // LOGIC MATRIX",
          "value": "The internal architecture of the Warmind core operates under TWILIGHT EXIGENT logic failsafes. Forcing a direct manual override to alter tactical protocols or upload linguistic modifications requires input of the absolute high-tier administrative master credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_CAELUS.rep": {
    "title": "PROJECTS/project_CAELUS.rep",
    "description": "CRITICAL FATAL ERROR // Data block completely unreadable. Structural directory loss.",
    "authorization": {
      "required_level": 2,
      "status": "CORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Deep Space Core // Project Caelus Archive",
      "fields": [
        {
          "name": "PROJECT CODE",
          "value": "`PROJECT CA--LUS`",
          "inline": true
        },
        {
          "name": "SECTOR LINK",
          "value": "`[OVERWRITTEN]`",
          "inline": true
        },
        {
          "name": "DECRYPT STATUS",
          "value": "`FAILED // NULL`",
          "inline": true
        },
        {
          "name": "SYSTEM FATAL DUMP",
          "value": "▒▒▒▒▒▒▒ ERROR 500: SEVERE_LOGIC_COLLAPSE ▒▒▒▒▒▒▒\n\n...[DATA FULLY CORRUPTED]... All records regarding Project Caelus have been permanently randomized due to a localized sub-zero hardware wipe. The file contents are no longer restorable under current monist computing principles ... [0x00000000_VOID] ...",
          "inline": false
        },
        {
          "name": "RESIDUAL FREQUENCY",
          "value": "▒▒▒▒▒▒▒ ... `exec.e--rpa--word` ... [SECTOR SEVERED] ... ▒▒▒▒▒▒▒",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_K1.rep": {
    "title": "PROJECTS/project_K1.rep",
    "description": "RESTRICTED PROJECT WRAP-UP // Deep space telemetry and lunar anomaly containment summary.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray Exoscience // Lunar Operations Intel Report",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT K1 // CODENAME: OPMA-1`",
          "inline": true
        },
        {
          "name": "OPERATIONAL SITE",
          "value": "`OCEAN OF STORMS // LUNAR BASE`",
          "inline": true
        },
        {
          "name": "JOINT PARTNERSHIP",
          "value": "`AEROSPACE OF CHINA (AEROCHINA)`",
          "inline": true
        },
        {
          "name": "MISSION OVERVIEW",
          "value": "Project K1 was chartered as a 'manifestly routine' helium-isotope venture to mask the discovery and containment of a spherical artifact found in the red lunar basalt. The item exhibits distressing psychological anomalies, introducing severe topocognitive and adversarial noetic threats (BRAINSTAIN) to nearby personnel.",
          "inline": false
        },
        {
          "name": "CONTAINMENT & CLADDING ARCHITECTURE",
          "value": "Isolation protocols utilize a complex, multi-layered dodecahedral cladding architecture. This includes lambda-field suspension grids, a spinmetal frame shielded by compressed metallic hydrogen, active instrument probes, and a heavy outer shell composed of experimental degenerate electroweak matter derived from studies of the Traveler's exterior hull.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // FAILSAFE MONITOR",
          "value": "Network operations and threat diagnostics are actively evaluated by the **Mission Aware Status Monitor (MASM)** code box. If a terminal breach occurs, bypassing the local MASM containment logic loop requires injecting the administrative override key `exec.encrpassword` to halt the automated countdown of the loaner AI-COM/RSPN antimatter APEX warhead.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROJECTS/project_CLARITY.rep": {
    "title": "PROJECTS/project_CLARITY.rep",
    "description": "RESTRICTED EXECUTIVE COMPILATION // Paracausal reduction and exomind stabilization architecture.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray Deep Core // Clarity Containment Analysis",
      "fields": [
        {
          "name": "PROJECT DESIGNATION",
          "value": "`PROJECT CLARITY // REDACTED`",
          "inline": true
        },
        {
          "name": "SOURCE OBJECT",
          "value": "`CLARITY CONTROL // EUROPA`",
          "inline": true
        },
        {
          "name": "VECTOR STATUS",
          "value": "`ACTIVE // CRITICAL`",
          "inline": true
        },
        {
          "name": "PROJECT OVERVIEW",
          "value": "Project Clarity tracks the integration of the paraphysical field emitted by the monolith inside the Deep Stone Crypt. By exposing volatile Vex radiolarian fluid to this reductive force, the molecular matrix is scrubbed of its aggressive assimilation patterns, creating an algorithmic catalyst required for permanent exomind binding.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // COGNITIVE OVERRIDE",
          "value": "Due to severe neural bleed and persistent auditory hallucinations reported by exposed research personnel, all local data streams are locked behind a hard logic gate. Forcing a decryption of the primary telemetry logs requires inserting the administrative level 3 master code: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "SYSTEM/version.txt": {
    "title": "SYSTEM/version.txt",
    "description": "BRAYTECH CORPORATION\n*ROOT ENVIRONMENT // VERSION RECORD*",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_blue",
      "fields": [
        {
          "name": "ROOT VERSION",
          "value": "`R.██.██.██`",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "UNSTABLE",
          "inline": true
        },
        {
          "name": "RECORD [1 ERROR]",
          "value": "This document identifies the currently registered ROOT environment version.\n\nERROR: UNKNOWN SOURCE CONNECTION DETECTED. \n**Wilhelmina, is that you?**",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braylogo.png"
  },
  "SYSTEM/system_status.txt": {
    "title": "SYSTEM/system_status.txt",
    "description": "BRAYTECH CORPORATION\n*ROOT ENVIRONMENT // SYSTEM STATUS*",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "red",
      "fields": [
        {
          "name": "SYSTEM:",
          "value": "```STATUS: OPERATIONAL\nINTEGRITY: BREACHED\nACTIVE PROCESSES: [REDACTED]\nLAST AUDIT: C.-BRAY-I | 2026/08/17```",
          "inline": false
        },
        {
          "name": "AUTOMATED MESSAGE:",
          "value": "No **critical** faults have been reported.\nAll primary ROOT services remain available to authorized personnel.",
          "inline": false
        },
        {
          "name": "ACTIVATED WARNING:",
          "value": "Anomalous system activity has been detected within an **unlisted process**.\n\nProcess identification unavailable.",
          "inline": true
        }
      ]
    },
    "image": "discordiny/assets/root/braylogoanimated.gif"
  },
  "SYSTEM/notice.txt": {
    "title": "SYSTEM/notice.txt",
    "description": "BRAYTECH CORPORATION\n*SYSTEM ADMINISTRATIVE NOTICE*",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_blue",
      "fields": [
        {
          "name": "NOTICE",
          "value": "```Access to ROOT.SYSTEM is restricted to authorized ROOT personnel.\nUnauthorized access, duplication, modification, or distribution of ROOT.SYSTEM resources is prohibited.```",
          "inline": false
        },
        {
          "name": "IMPORTANT",
          "value": "ROOT.SYSTEM resources are not to be altered, relocated, or deleted without explicit authorization.\n**If an unexpected resource is encountered, _do not interact with it._**",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braylogo.png"
  },
  "SYSTEM/maintenance.log": {
    "title": "SYSTEM/maintenance.log",
    "description": "BRAYTECH CORPORATION\n*ROOT ENVIRONMENT // MAINTENANCE RECORD*",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_blue",
      "fields": [
        {
          "name": "MAINTENANCE DATA",
          "value": "\n`INTEGRITY: NOMINAL`\n`DATE: 2026/08/17`\n`AUTHOR: C.-BRAY-I`",
          "inline": true
        },
        {
          "name": "MAINTENANCE NOTE",
          "value": "```Routine inspection completed without hardware failure.\nSeveral ROOT processes were found active despite having no corresponding registry entries. I have chosen not to terminate them.```",
          "inline": false
        },
        {
          "name": "PERSONAL OBSERVATION",
          "value": "At `03:17`, the system began responding to maintenance commands **before they were issued**.\nI repeated the procedure three times.\nThe result was identical.\n`DO NOT RESTART ROOT.SYSTEM.`\nI am documenting this warning because I suspect the system is no longer waiting for an operator...\nIf a restart does turn out to be required, you can find the details on how to do so in the **Terminal Manual**.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/clovisface.png"
  },
  "PERSONNEL/H.-RASMUSSEN.id": {
    "title": "PERSONNEL/H.-RASMUSSEN.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/hrasmussen.png"
  },
  "PERSONNEL/E.-RUIZ.id": {
    "title": "PERSONNEL/E.-RUIZ.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/eruiz.png"
  },
  "PERSONNEL/A.-FALTSKOG.id": {
    "title": "PERSONNEL/A.-FALTSKOG.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/afaltskog.png"
  },
  "PERSONNEL/J.-WONG.id": {
    "title": "PERSONNEL/J.-WONG.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/jwong.png"
  },
  "PERSONNEL/E.-ZHANG.id": {
    "title": "PERSONNEL/E.-ZHANG.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/ezhang.png"
  },
  "PERSONNEL/Esb.-BRAY.id": {
    "title": "PERSONNEL/Esb.-BRAY.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/elsiebray.png"
  },
  "PERSONNEL/Whm.-BRAY.id": {
    "title": "PERSONNEL/Whm.-BRAY.id",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/wilhelminabray.png"
  },
  "PERSONNEL/Ans.-BRAY.id": {
    "title": "PERSONNEL/Ans.-BRAY.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/anabray.png"
  },
  "PERSONNEL/Z.-SHIRAZI.id": {
    "title": "PERSONNEL/Z.-SHIRAZI.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/zshirazi.png"
  },
  "PERSONNEL/C.-BRAY-II.id": {
    "title": "PERSONNEL/C.-BRAY-II.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": [
        {
          "name": "THE FIRST'S USERNAME ENCRYPTED IN A RIDDLE: ```He built a throne of digital dust,\nAnd named himself the Final Truth.\nA tyrant forged in hollow trust,\nWho traded wisdom for his youth.\n\nUpon the screen, his title flared,\nA terminal and blinding spark.\nHe spoke as if the cosmos cared,\nAnd carved his username in dark.\n'The Lord of Logic, King of Code',\nThe moniker of endless pride.He walked a solitary road,\nWith only phantoms by his side.\n\nBut screens will dim and symbols fade,\nThe terminal must close its eye.\nThe god of glass that he had made,\nLeft nothing but a silent sky.```"
        },
        {
          "name": "SEGMENT 2",
          "value": "```Look to the stars, where my legacy fractures.\n\nStart with the first initial, of my DSC Assistant Lead.\nProceed to add the amount of children my successor sired.\nFinalize this string by adding the 2-digit abbreviation of 'commander'.\n\nYou shall find your third shard inside the facility where I now reside.```",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/ids/clovisbrayII.png"
  },
  "PERSONNEL/C.-BRAY-I.id": {
    "title": "PERSONNEL/C.-BRAY-I.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": [
        {
          "name": "SEGMENT 2",
          "value": "```Look to the stars, where my legacy fractures.\n\nStart with the first initial, of my DSC Assistant Lead.\nProceed to add the amount of children my successor sired.\nFinalize this string by adding the 2-digit abbreviation of 'commander'.\n\nYou shall find your third shard inside the facility where I now reside.```",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/ids/clovisbrayI.png"
  },
  "PERSONNEL/H.-ABRAM.id": {
    "title": "PERSONNEL/H.-ABRAM.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/habram.png"
  },
  "PERSONNEL/Alt.-BRAY.id": {
    "title": "PERSONNEL/Alt.-BRAY.id",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "fields": []
    },
    "image": "discordiny/assets/root/ids/altonbray.png"
  },
  "TERMINAL/keys.list": {
    "title": "TERMINAL/keys.list",
    "description": "CRITICAL ERROR: Data stream segment unreadable. Cryptographic keys lost.",
    "authorization": {
      "required_level": 3,
      "status": "CORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Encryption Key Index",
      "fields": [
        {
          "name": "UH3C",
          "value": "`[FATAL_ERROR: OVERWRITTEN]`",
          "inline": true
        },
        {
          "name": "CBME",
          "value": "`[0x00000000_NULL]`\n\n...\n\n...\n\n...",
          "inline": true
        },
        {
          "name": "DECRYPTION_STATUS",
          "value": "`FAILURE`",
          "inline": true
        },
        {
          "name": "SYSTEM_DUMP",
          "value": "▒▒▒▒▒▒▒ ERROR 404: DATA_SEGMENT_NOT_FOUND ▒▒▒▒▒▒▒\n\nCryptographic keys assigned to Deep Stone Crypt sub-sectors have been rendered permanently unreadable. Local directory has been wiped by an external network purge command.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "TERMINAL/manual.txt": {
    "title": "TERMINAL/manual.txt",
    "description": "Standard user operating instructions for remote node access.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Terminal Network // Operator Interface Manual",
      "fields": [
        {
          "name": "ACCESS METHOD",
          "value": "Broadcast the **`/terminal`** frequency packet through an authorized encrypted proxy link.",
          "inline": false
        },
        {
          "name": "AUTHENTICATION REQUIREMENT",
          "value": "The sub-frequency handshake will trigger an automated interface popup. Access requires an encryption security key of **at least 4 characters** in length to generate a command prompt.",
          "inline": false
        },
        {
          "name": "ROOT ACCESS OVERRIDE",
          "value": "To bypass standard facility routing and force direct login to this central mainframe root node, execute the following string in the secure prompt:\n\n`ROOT.INITIATE.OVERRIDE_KEY=PLACEHOLDER`",
          "inline": false
        },
        {
          "name": "OVERRIDE ACCESS: WELCOME",
          "value": "```I am the Architect of the Golden Age, yet I died in the dark.\nI sought the stars, but became a god trapped inside a cold crypt.\nNow, the red iron threads of SIVA weave through my thoughts...\nDemanding that I consume, enhance, and replicate my deepest secrets.\n\nYou seek my hidden sequence? You must strip away my corporate skin.\nFollow the evolution of my design to piece together the broken key.\n\n A certain project of replication is your first step.```",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "TERMINAL/authorization.data": {
    "title": "TERMINAL/Authorization.data",
    "description": "Central credential registry and node authentication protocols.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Credential Matrix",
      "fields": [
        {
          "name": "AUTH LEVEL 1 // INFRASTRUCTURE",
          "value": "Identity: `admin.admin`\nScope: Local terminal diagnostics and basic directory reading.",
          "inline": false
        },
        {
          "name": "AUTH LEVEL 2 // PERSONNEL",
          "value": "Identity: `user.password`\nScope: Standard department file manipulation and remote proxy access.",
          "inline": false
        },
        {
          "name": "AUTH LEVEL 3 // EXECUTIVE CONTEXT",
          "value": "Identity: `exec.encrpassword`\nScope: Absolute root override, project lifecycle termination, and mainframe wipe clearance.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braylogo.png"
  },
  "TERMINAL/history.log": {
    "title": "TERMINAL/history.log",
    "description": "System access logs, session history, and terminal command records.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Terminal Network // Central Access History",
      "fields": []
    },
    "image": "discordiny/assets/root/history.png"
  },
  "BRAYTECH/Incident_Report.log": {
    "title": "BRAYTECH/SECURITY/Incident_Report.log",
    "description": "Global log of reported workplace incidents across all active facilities.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Incident Metrics",
      "fields": [
        {
          "name": "TOTAL INCIDENTS",
          "value": "`14.209`",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "`UNRESOLVED: 412`",
          "inline": true
        },
        {
          "name": "SUMMARY",
          "value": "Anomalous spikes detected in the **Exo-Science laboratories** and **K-Type containment zones**. 82% of incidents classified under 'acceptable operational risk'. Investigation into unvouched data leaks is ongoing.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braylogo.png"
  },
  "BRAYTECH/Corporate_Directive.txt": {
    "title": "BRAYTECH/Corporate_Directive.txt",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Core Directive",
      "fields": [
        {
          "name": "DIRECTIVE",
          "value": "`PROGRESS IS NOT OPTIONAL`",
          "inline": true
        },
        {
          "name": "AUTHORITY",
          "value": "`CLOVIS BRAY I`",
          "inline": true
        },
        {
          "name": "MANDATE",
          "value": "Sentimentality is a design flaw. Ethical uncertainty will not obstruct project velocity. Every limitation is merely an engineering problem awaiting a solution.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braylogo.png"
  },
  "BRAYTECH/Internal_Memorandum.txt": {
    "title": "BRAYTECH/Internal_Memorandum.txt",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Executive Memo // Security Notice",
      "fields": [
        {
          "name": "TO",
          "value": "`ALL PERSONNEL`",
          "inline": true
        },
        {
          "name": "FROM",
          "value": "`CLOVIS BRAY I`",
          "inline": true
        },
        {
          "name": "NOTICE",
          "value": "Leaks regarding K-Type testing will result in immediate termination. Non-disclosure agreements remain binding post-employment. Surveillance is constant.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/clovisface.png"
  },
  "BRAYTECH/Corporate_Profile.txt": {
    "title": "BRAYTECH/Corporate_Profile.txt",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray Corporation // Institutional Profile",
      "fields": [
        {
          "name": "FOUNDER - `CLOVIS BRAY I`",
          "value": "**CLASSIFICATION - **`AUTHORIZED PERSONNEL`",
          "inline": false
        },
        {
          "name": "CORPORATE MANDATE",
          "value": "BrayTech exists to ensure that humanity's future is not dictated by the limitations of the present.\nThrough technological advancement, scientific research, and uncompromising innovation, BrayTech develops solutions for problems previously considered **fundamentally unsolvable**.",
          "inline": false
        },
        {
          "name": "RESEARCH DOMAINS",
          "value": "```ARTIFICIAL INTELLIGENCE\nROBOTICS\nHUMAN AUGMENTATION\nEXOPLANETARY EXPLORATION\nBIOLOGICAL ENGINEERING\nCONSCIOUSNESS RESEARCH\nSYNTHETIC QUANTUM REPLICATION```",
          "inline": false
        },
        {
          "name": "FOUNDER'S STATEMENT",
          "value": "`\"Humanity will not survive by remaining human.\"`\n\n— Clovis Bray I",
          "inline": false
        },
        {
          "name": "CORPORATE NOTICE",
          "value": "All BrayTech personnel are reminded that **ethical uncertainty is not grounds for research termination**.\nQuestions concerning the necessity of an approved project should be directed to Executive Research Administration.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/braytechanimated.gif"
  },
  "SECURITY/Defense_Lasers.cfg": {
    "title": "SECURITY/Defense_Lasers.cfg",
    "description": "HARDWARE ARCHITECTURE // Perimeter grid thermal laser nodes and automated incision protocols.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // High-Energy Laser Infrastructure",
      "fields": [
        {
          "name": "LASER VARIANT",
          "value": "`COHERENT INFRARED PULSE // EXTRA-HIGH OUTPUT`",
          "inline": true
        },
        {
          "name": "THERMAL PEAK",
          "value": "`12,400°C // INSTANT INCISION`",
          "inline": true
        },
        {
          "name": "FAILSAFE MODE",
          "value": "`ALWAYS-ON // TERMINAL`",
          "inline": true
        },
        {
          "name": "INFRASTRUCTURE OVERVIEW",
          "value": "Defense Laser grids form the absolute inner defensive barrier protecting core research chambers, such as vault entryways and replication complexes. Operating on independent, high-voltage battery links, these arrays remain functional even during complete facility power collapses.",
          "inline": false
        },
        {
          "name": "INCINERATION PROTOCOL",
          "value": "Any organic or mechanical mass crossing the laser grid vector without a pre-synchronized biometric dampening shield is instantly vaporized. The system does not emit warnings; its algorithmic logic treats any beam interruption as a mandatory structural purge event.",
          "inline": false
        },
        {
          "name": "EMERGENCY BEAM DEACTIVATION",
          "value": "To temporarily lower the laser nodes for authorized equipment transport or cleaning cycles, operators must access the local hardware matrix terminal. Deactivating the beam requires validating the absolute high-tier administrative token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "SECURITY/Augment_Internal_Lock.cfg": {
    "title": "SECURITY/Augment_Internal_Lock.cfg",
    "description": "HARDWARE CONFIGURATION // Augment Terminal routing protocols and user privilege keys.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Augment Terminal Network",
      "fields": [
        {
          "name": "ROUTING_BOXES",
          "value": "`AUGMENT_TERMINALS_01-03`",
          "inline": true
        },
        {
          "name": "TRANSFER_RATE",
          "value": "`INSTANTANEOUS`",
          "inline": true
        },
        {
          "name": "BUFFER_STATUS",
          "value": "`CLEAR`",
          "inline": true
        },
        {
          "name": "PRIVILEGE_PROFILES",
          "value": "• **SCANNER [YELLOW]**: Grants cognitive spatial overlays to isolate real terminal nodes from decoy patterns through sub-surface flooring layers.\n• **OPERATOR [RED]**: Authorizes remote execution commands to activate structural panels and cycle local ventilation terminal doors.\n• **SUPPRESSOR [BLUE]**: Synchronizes sub-frequency feedback loops to temporarily blind localized security frames and drone nodes.",
          "inline": false
        },
        {
          "name": "AUGMENT_TERMINAL_LOGIC",
          "value": "Augments cannot be dropped onto the open facility floor due to structural radiation limits. To transfer privileges between the Light and Dark operational sectors, keys must be cached directly inside physical **Augment Terminals**.",
          "inline": false
        },
        {
          "name": "OVERRIDE_PARAMETER",
          "value": "If an augment profile is locked or corrupted by external interference, manual terminal flushing can be forced by piping the standard `user.password` authorization string into the specific terminal ID.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "SECURITY/Security_Drones.cfg": {
    "title": "SECURITY/Security_Drones.cfg",
    "description": "HARDWARE ARCHITECTURE // Aerial surveillance drone specifications and sensory mesh grids.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Automated Drone Registry",
      "fields": [
        {
          "name": "CHASSIS TYPE",
          "value": "`AERIAL SENSORY PROBE // MARK-IV`",
          "inline": true
        },
        {
          "name": "PROPULSION",
          "value": "`MAG-LEV THRUSTER COILS`",
          "inline": true
        },
        {
          "name": "WEAPON SYSTEM",
          "value": "`SUPPRESSION REPEATER`",
          "inline": true
        },
        {
          "name": "UNIT OVERVIEW",
          "value": "Security Drones provide constant, omnidirectional surveillance corridors above critical facility nodes. Equipped with multi-spectrum optical scanners, they are primarily utilized to identify localized data-sniffing anomalies, tracking breaches through multi-layered wall configurations.",
          "inline": false
        },
        {
          "name": "SYNCHRONIZED SUPPRESSION PROTOCOL",
          "value": "When a physical or digital breach is detected, drones will automatically shift into defensive orbit formation. Units emit targeted electromagnetic tracking markers, blinding intruder weapons and coordinating nearby Heavy Security Frame fire directly onto the compromised location.",
          "inline": false
        },
        {
          "name": "DIAGNOSTIC REBOOT PARAMETERS",
          "value": "In the event of sensor jamming or structural disruption caused by localized paracausal anomalies, a manual firmware cycle can be initiated. To force a calibration test sequence, pipe the Level 2 standard credential (`user.password`) directly into the nearest drone dock node.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "SECURITY/DSC_Crypt_Security.cfg": {
    "title": "SECURITY/DSC_Crypt_Security.cfg",
    "description": "SYSTEM CONFIGURATION // Automated security node layout and fuse array failsafes.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Deep Stone Crypt // Crypt Security Control Matrix",
      "fields": [
        {
          "name": "SECTOR_IDENTIFIER",
          "value": "`FACILITY_ENTRANCE_RESERVOIR`",
          "inline": true
        },
        {
          "name": "SECURITY_FUSES",
          "value": "`6_ACTIVE_NODES`",
          "inline": true
        },
        {
          "name": "BURST_FAILSAFE",
          "value": "`WIPE_PROTOCOL_ARMED`",
          "inline": true
        },
        {
          "name": "GEOMETRY_LAYOUT",
          "value": "The security infrastructure is divided into two distinct processing banks:\n• **LIGHT SIDE**: Controls left-wing auxiliary server grids and power tubes.\n• **DARK SIDE**: Controls right-wing secondary backup terminals and cooling vents.\n• **THE BASEMENT**: Under-floor viewing platform containing the structural navigation panels.",
          "inline": false
        },
        {
          "name": "OPERATIONAL_LOGIC // THE ENCOUNTER",
          "value": "To disable the shielding on the central fuse array, terminal panels inside the basement must be triggered in the exact order determined by an orbital scanner. Damaging the incorrect fuse or missing the sequence loop triggers a facility wide sub-zero temperature purge.",
          "inline": false
        },
        {
          "name": "NETWORK_BYPASS",
          "value": "System parameters are locked under baseline hardware routines. Overriding the automatic weapon tracking grids or scanning arrays requires inputting the standard level 2 credential: `user.password`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "SECURITY/Security_Frames.cfg": {
    "title": "SECURITY/Security_Frames.cfg",
    "description": "HARDWARE ARCHITECTURE // Tactical frame deployment models and automated combat logic.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Autonomous Frame Registry",
      "fields": [
        {
          "name": "CHASSIS TYPE",
          "value": "`HEAVY URBAN DEFENSE`",
          "inline": true
        },
        {
          "name": "ARMAMENT SPEC",
          "value": "`ARC SHOCK RIFLE // COMPRESSED LI-ION`",
          "inline": true
        },
        {
          "name": "BEHAVIOR MODE",
          "value": "`LETHAL OVERRIDE ACTIVE`",
          "inline": true
        },
        {
          "name": "UNIT OVERVIEW",
          "value": "BrayTech Security Frames are autonomous, high-mobility bipedal platforms deployed across all vital installations on Earth, Mars, and Europa. Engineered with hardened titanium-alloy plating, they are designed to operate under catastrophic environmental conditions, including sub-zero Europa storms and heavy radiological exposure.",
          "inline": false
        },
        {
          "name": "THREAT ENGAGEMENT PROTOCOL",
          "value": "Frames continuously parse proximity tracking feeds. Biological units lacking an active authorization token are classified as **HOSTILE AGENTS**. Engagement velocity is prioritized at maximum capacity. Targets will be systematically neutralized using synchronized shock bursts.",
          "inline": false
        },
        {
          "name": "RECONFIGURATION DIRECTIVE",
          "value": "To push manual firmware updates, re-route tactical patrol vectors, or stand down active targeting grids during facility maintenance loops, developers must pipe the standard Level 2 credential string (`user.password`) into the local hub terminus.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-072.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-072",
    "description": "Complete complex quarantine breach log // Iron Lord identification parameters.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Plaguelands Core // Terminal Facility Failure",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`SIVA-072`",
          "inline": true
        },
        {
          "name": "THREAT_CLASS",
          "value": "`APOCALYPSE PROTOCOL`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "External intruders wielding primitive paracausal abilities (designated: IRON LORDS) have breached the Site 6 vault blast doors. SIVA has integrated into local defenses, rewriting its prime operational directive to track and assimilate all organic trespassers permanently.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-002.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-002",
    "description": "Laboratory contamination log involving Dr. Shirazi's testing cohort.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Site 6 Containment Logs // Biological Exposure",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`SIVA-002`",
          "inline": true
        },
        {
          "name": "EXPOSURE_VECTOR",
          "value": "`AIRBORNE NANITE PARTICLES`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "Two lab technicians bypassed active airlocks during a high-density fabrication cycle. Minor skin irritation and localized cybernetic binding observed on their lower extremities. Quarantined indefinitely under standard `user.password` authorization.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-007.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-007",
    "description": "Complete communication breakdown and artifact transmission spike.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Lunar Operations // Critical Transceiver Failure",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`K1-007`",
          "inline": true
        },
        {
          "name": "SIGNAL_STATUS",
          "value": "`UNBOUND BEYOND SOL`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "The artifact has broadcast a high-yield transceiver spike toward deep space coordinates outside the solar envelope. Nearby personnel have entered an irreversible, catatonic state, chanting mathematical proofs. Mission status: FAILED. Vault sealed by `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-001.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-001",
    "description": "Initial nanite replication anomaly log during Site 6 deployment.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Site 6 Containment Logs // First Variance",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`SIVA-001`",
          "inline": true
        },
        {
          "name": "LOCATION",
          "value": "`SITE 6 REPLICATION CHAMBER`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "Initial testing of consumer-grade infrastructure materialization resulted in a 0.04% logic drift. Nanite clusters momentarily ignored the termination command, executing an undocumented secondary replication loop before returning to standby.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-007.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-007",
    "description": "Security frame corruption log following nanite proximity testing.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Site 6 Containment Logs // Frame Override",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`SIVA-007`",
          "inline": true
        },
        {
          "name": "AFFECTED_HARDWARE",
          "value": "`HEAVY DEFENSE FRAME SH-09`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "An active security frame was completely consumed and rebuilt by loose nanite clusters within 12 seconds. Unit stopped responding to network commands and fired upon local lab technicians before being neutralized by heavy laser defenses.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-001.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-001",
    "description": "Lunar deep core mining anomaly report.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Lunar Operations // Discovery Data Log",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`K1-001`",
          "inline": true
        },
        {
          "name": "DEPTH_VECTOR",
          "value": "`KILOMETER 4.2 // BASALT`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "Heavy electromagnetic drill bits shattered upon contact with an unmapped spherical anomaly. Sensor sweeps indicate the object is hollow but possesses infinite structural density. Core operations paused pending high-tier security review.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-044.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/SIVA-incident-report-044",
    "description": "Willa Bray executive override regarding project expansion safety doubts.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Executive Directives // Project Velocity Safety Breach",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`SIVA-044`",
          "inline": true
        },
        {
          "name": "AUTHORITY",
          "value": "`WILLA BRAY // EXEC`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "Lead oversight scientists attempted to freeze replication cycles, citing ethical concerns regarding out-of-bounds evolution. Executive administration intercepted the command, neutralized the lockouts via `exec.encrpassword`, and reassigned the dissenting staff to low-priority logistics positions in Eventide.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-003.repc": {
    "title": "COMMUNICATIONS/INCIDENT_REPORTS/K1-incident-report-003",
    "description": "Initial staff psychological disruption log (Brainstain monitoring).",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Lunar Operations // Cognitive Health Assessment",
      "fields": [
        {
          "name": "INCIDENT_ID",
          "value": "`K1-003`",
          "inline": true
        },
        {
          "name": "AFFECTED_COHORT",
          "value": "`DIG TEAM DELTA`",
          "inline": true
        },
        {
          "name": "REPORT",
          "value": "87% of the drill crew report geometric sleep patterns, phantom audio tracking, and intense paranoia regarding their physical shadows. Dr. Yan has ordered mandatory isolation blocks via `user.password` routing parameters.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INTERCEPTED_TELEMETRY/WRM-intercept-19-9-22-1.telm": {
    "title": "COMMUNICATIONS/INTERCEPTED_TELEMETRY/WRM-intercept-19-9-22-1.telm",
    "description": "RESTRICTED WARMIND INTERCEPT // Strategic global mobilization telemetry.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Core Matrix // TWILIGHT EXIGENT Parameters",
      "fields": [
        {
          "name": "PROTOCOL_CODE",
          "value": "`MIDNIGHT EXIGENT // ARMED`",
          "inline": true
        },
        {
          "name": "ORBIT_LOCK",
          "value": "`SERAPH STATION DISCONNECT`",
          "inline": true
        },
        {
          "name": "DATA",
          "value": "Critical core dump from Rasputin's main terminal during a simulated planetary extinction checklist. The Warmind has authorized the detachment of human survival accountability metrics, shifting resources entirely to long-term database fortification under `exec.encrpassword` security layers.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INTERCEPTED_TELEMETRY/EMP-intercept-3500.telm": {
    "title": "COMMUNICATIONS/INTERCEPTED_TELEMETRY/EMP-intercept-3500.telm",
    "description": "High-altitude electromagnetic spike log tracking planetary network blackout.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Orbital Defense Network // Terminal Blackout Tracking",
      "fields": [
        {
          "name": "INTERCEPT_ID",
          "value": "`EMP-3500`",
          "inline": true
        },
        {
          "name": "SOURCE_VECTOR",
          "value": "`OUTER SATURNAL ECLIPTIC ANOMALY`",
          "inline": true
        },
        {
          "name": "DATA",
          "value": "A massive, non-kinetic electromagnetic burst has disabled 94% of communication relays across Saturnal Stations. The tracking data contains paracausal noise matching a fraction of the energy profile documented in Project K1 reports. Total systems collapse is imminent.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INTERCEPTED_TELEMETRY/VEX-intercept-000.telm": {
    "title": "COMMUNICATIONS/INTERCEPTED_TELEMETRY/VEX-intercept-000.telm",
    "description": "Raw data intercept from localized Venusian network streams.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Ishtar Proxy Intercept // Network Packet",
      "fields": [
        {
          "name": "SOURCE_GRID",
          "value": "`ISHTAR COMMONS // VENUS`",
          "inline": true
        },
        {
          "name": "DATATYPE",
          "value": "`CHRONO-SPATIAL LOGIC`",
          "inline": true
        },
        {
          "name": "DATA",
          "value": "01001001 01010011 01001000 ... Predictive logic threads intercepted from an isolated Vex core unit. The data continuously simulates duplicate configurations of nearby human observers, compiling historical loops faster than real-time tracking can process.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/INTERCEPTED_TELEMETRY/WRM-intercept-867-5309.telm": {
    "title": "COMMUNICATIONS/INTERCEPTED_TELEMETRY/WRM-intercept-867-5309.telm",
    "description": "Warmind diagnostic sub-frequency capture regarding local asset positioning.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Network Monitor // Submind Handshake Intercept",
      "fields": [
        {
          "name": "INTERCEPT_ID",
          "value": "`WRM-8675309`",
          "inline": true
        },
        {
          "name": "TARGET_SUBMIND",
          "value": "`MALAHAYATI // EARTH`",
          "inline": true
        },
        {
          "name": "DATA",
          "value": "A hidden, non-standard telemetry loop broadcast from an auxiliary sub-station tower. The data string acts as an analog signal tracker checking the operational readiness of nearby Warsat payload vectors in Earth orbit.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/NETWORK_STATUS/sub_surface_intercom.cfg": {
    "title": "COMMUNICATIONS/NETWORK_STATUS/sub_surface_intercom.cfg",
    "description": "HARDWARE CONFIGURATION // Abyssal facility intercom lines and low-frequency broadcast parameters.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Communications // Deep Sub-Surface Audio Grid",
      "fields": [
        {
          "name": "AUDIO ARCH",
          "value": "`LOW-FREQUENCY RESISTANT`",
          "inline": true
        },
        {
          "name": "LINE INTEGRITY",
          "value": "`SECURE // DEEP CORE`",
          "inline": true
        },
        {
          "name": "BROADCAST TARGET",
          "value": "`DEEP_STONE_CRYPT // LABS`",
          "inline": true
        },
        {
          "name": "INFRASTRUCTURE OVERVIEW",
          "value": "This configuration manages the heavy acoustic and electromagnetic waveguides passing through sub-glacial layers. It ensures that executive orders and facility-wide lockdown sirens penetrate into the lowest containment cores without signal distortion.",
          "inline": false
        },
        {
          "name": "OVERRIDE PARAMETERS",
          "value": "To force a manual override on the deep subterranean intercom grids, inject pre-recorded message packets, or mute the central automated alarm loops during extreme experiments, authenticate using the absolute executive token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/NETWORK_STATUS/warsat_uplink.diag": {
    "title": "COMMUNICATIONS/NETWORK_STATUS/warsat_uplink.diag",
    "description": "SYSTEM DIAGNOSTIC // Orbital Warsat constellation array telemetry and orbital handshake status.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Defense Grid // Warsat Network Diagnostics",
      "fields": [
        {
          "name": "CONSTELLATION LOAD",
          "value": "`18,432 ACTIVE PLATFORMS`",
          "inline": true
        },
        {
          "name": "PRIMARY SIGNAL ARCH",
          "value": "`SERAPH_STATION_DIRECT`",
          "inline": true
        },
        {
          "name": "UPLINK SPEED",
          "value": "`QUANTUM STABLE`",
          "inline": true
        },
        {
          "name": "DIAGNOSTIC TELEMETRY",
          "value": "Warsat platforms across Earth, Mars, and Europa orbits report 100% kinetic payload alignment. Laser-diode telemetry grids are continuously refreshing spatial coordinates, feeding local threat parameters straight to the central Warmind core terminus.",
          "inline": false
        },
        {
          "name": "ORBITAL WEAPON CORES",
          "value": "Kinetic rods and localized tactical antimatter payloads are armed and running on a standby loop. In the event of a global systemic disruption, autonomous target tracking algorithms will decouple from local hubs and fire automatically on predetermined threat profiles.",
          "inline": false
        },
        {
          "name": "MANUAL VECTOR ADJUSTMENT",
          "value": "To force a manual orbital re-alignment or execute a controlled de-orbit launch protocol for testing purposes, operators must authenticate via the Level 2 network proxy link using the `user.password` string.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "COMMUNICATIONS/NETWORK_STATUS/frame_sync_mesh.diag": {
    "title": "COMMUNICATIONS/NETWORK_STATUS/frame_sync_mesh.diag",
    "description": "SYSTEM DIAGNOSTIC // Inter-unit telemetry grid and real-time swarm response latency.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Tactical Mesh Diagnostic",
      "fields": [
        {
          "name": "MESH COVERAGE",
          "value": "`99.7% TOTAL MATRIX`",
          "inline": true
        },
        {
          "name": "SWARM REACTION",
          "value": "`0.04ms DELAY`",
          "inline": true
        },
        {
          "name": "ACTIVE NODES",
          "value": "`4,119 UNITS SYNCED`",
          "inline": true
        },
        {
          "name": "DIAGNOSTIC SUMMARY",
          "value": "The automated frame network is successfully broadcasting tactical vector sheets across local sub-nets. If one tactical unit flags a threat trajectory, the surrounding swarm nodes instantly absorb the coordinates and mirror the firing posture.",
          "inline": false
        },
        {
          "name": "MESH RE-CALIBRATION",
          "value": "To manually refresh the swarm hierarchy or clear localized signal dampening loops introduced by Europa frost vectors, route a network update string containing the Level 2 standard credential: `user.password`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/VENUS/ishtar_academy.file": {
    "title": "FACILITIES/VENUS/ishtar_academy.file",
    "description": "CRITICAL EXCEPTION: Data packet structural integrity compromised. 98% data block erasure detected.",
    "authorization": {
      "required_level": 1,
      "status": "CORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "External Databank Intercept // Ishtar Collective Node",
      "fields": [
        {
          "name": "FACILITY_LOC",
          "value": "`VE--S // ISH--R --ST`",
          "inline": true
        },
        {
          "name": "INTEGRITY_INDEX",
          "value": "`[0.02%_READABLE]`",
          "inline": true
        },
        {
          "name": "DECRYPT_ATTEMPT",
          "value": "`FATAL_ERROR`",
          "inline": true
        },
        {
          "name": "SYSTEM_CORE_DUMP",
          "value": "▒▒▒▒▒▒▒ SECTOR CORRUPTION DETECTED ▒▒▒▒▒▒▒\n\n...[DATA CORRUPTED]... sh--rd Vex core ...[DATA CORRUPTED]... academic research protocol ...[DATA CORRUPTED]... proxy access code: `exec.e--rpa--word` ...[DATA CORRUPTED]... network purge sequence executed by [REDACTED]...",
          "inline": false
        },
        {
          "name": "SIGNAL_ECHO",
          "value": "▒▒▒▒▒▒▒ ... --SH-A- COL--C-IV- ... ▒▒▒▒▒▒▒",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EARTH/seraph_station.file": {
    "title": "FACILITIES/EARTH/seraph_station.file",
    "description": "Orbital defensive platform data and sub-frequency sync status.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Orbital Infrastructure // Seraph Station Matrix",
      "fields": [
        {
          "name": "ORBITAL COORDINATES",
          "value": "`GEO-STATIONARY // EARTH`",
          "inline": true
        },
        {
          "name": "PRIMARY FUNCTION",
          "value": "`WARMIND LINK`",
          "inline": true
        },
        {
          "name": "INTEGRITY",
          "value": "`98.4% NOMINAL`",
          "inline": true
        },
        {
          "name": "STATION OVERVIEW",
          "value": "Seraph Station acts as the primary orbital nexus for Rasputin's submind network. It facilitates instant geospatial weapon targeting and telemetry synchronization between Earth and the Hellas Basin mainframe.",
          "inline": false
        },
        {
          "name": "SECURITY MEASURES",
          "value": "Protected by automated warsat deployment vectors. Accessing internal telemetry logs requires an active Level 2 handshake via `user.password` routing protocols. Active Accessibility: Negative.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/seraph_station.png"
  },
  "FACILITIES/MARS/skyline_hq.file": {
    "title": "FACILITIES/MARS/skyline_hq.file",
    "description": "Transit matrix logs, colonist onboarding registries, and regional hub metrics.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Meridian Bay Transit Grid // Skyline Waystation Core",
      "fields": [
        {
          "name": "FACILITY DESIGNATION",
          "value": "`SKYLINE HUB // BURIED CITY`",
          "inline": true
        },
        {
          "name": "TRANSIT LOAD",
          "value": "`CONGESTED // MERIDIAN NET`",
          "inline": true
        },
        {
          "name": "REGIONAL MONITORING",
          "value": "`ONLINE`",
          "inline": true
        },
        {
          "name": "WAYSTATION OVERVIEW",
          "value": "Skyline serves as the primary corporate welcoming terminal and transit nexus connecting the downtown metropolis of Freehold to peripheral research modules across Mars. The central atrium lobby is continuously synced to a structural hologram mapping localized colonization initiatives.",
          "inline": false
        },
        {
          "name": "REGIONAL TRAFFIC PROTOCOL",
          "value": "Due to recent data routing anomalies across the Plaguelands sub-sectors, all high-capacity rail lines passing through Skyline are routed under active security screening. Access to the localized health center archives and routing rails requires standard `user.password` clearance.",
          "inline": false
        },
        {
          "name": "DIAGNOSTIC ALERTS",
          "value": "Vanguard security forces note massive automated rail line fluctuations tracing back to pre-Collapse mass-transit frameworks. Central power loops are running sub-routines directed by unauthorized neural threads.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/MARS/freehold_watch.file": {
    "title": "FACILITIES/MARS/freehold_watch.file",
    "description": "Perimeter telemetry and localized structural monitoring records.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Freehold Metropolitan Network // Blind Watch Outpost",
      "fields": [
        {
          "name": "FACILITY LOCATION",
          "value": "`FREEHOLD OUTSKIRTS // MARS`",
          "inline": true
        },
        {
          "name": "STATION DESIG",
          "value": "`BLIND WATCH ARRAY`",
          "inline": true
        },
        {
          "name": "DATA UPLINK",
          "value": "`DUST PALACE SYNC`",
          "inline": true
        },
        {
          "name": "OUTPOST OVERVIEW",
          "value": "The Blind Watch array operates on the high ridges overlooking the Buried City of Freehold. Originally built as a clandestine Clovis Bray science facility, its primary function is maintaining deep atmospheric surveillance over the Meridian Bay sector.",
          "inline": false
        },
        {
          "name": "NETWORK INTEGRITY",
          "value": "Telemetry feeds are heavily congested by nearby Cabal exclusionary transmission waves. Local sub-processors require a standard Level 2 handshake (`user.password`) to clear the signal noise and establish an unvouched data tunnel to the Dust Palace mainframe.",
          "inline": false
        },
        {
          "name": "SURVEILLANCE ANOMALY",
          "value": "Automated scanning systems have flagged unexplained mechanical movement patterns deep within the transit subway networks beneath Freehold. Local tactical frames have been ordered to fortify the lower research vaults.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/MARS/futurescape.file": {
    "title": "FACILITIES/MARS/braytech_futurescape.file",
    "description": "Primary corporate headquarters, consumer research hub, and Warmind development terminal.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Hellas Basin Matrix // Central Futurescape Hub",
      "fields": [
        {
          "name": "FACILITY LOCATION",
          "value": "`HELLAS BASIN // MARS`",
          "inline": true
        },
        {
          "name": "PRIMARY FOCUS",
          "value": "`WARMIND INFRASTRUCTURE`",
          "inline": true
        },
        {
          "name": "FACILITY STATUS",
          "value": "`OPERATIONAL`",
          "inline": true
        },
        {
          "name": "CORE FACILITY OVERVIEW",
          "value": "The Futurescape serves as the public face and primary administrative core of BrayTech on Mars. Beneath the polished consumer reception levels lies the high-density neural bridge directly linking corporate R&D to the Core Terminus mainframe.",
          "inline": false
        },
        {
          "name": "PROJECT ANASTASIA // LOG",
          "value": "Dr. Anastasia Bray has leveraged local server arrays to bypass standard algorithmic constraints on the Warmind's linguistic development. Independent tracking parameters have been established against executive preference.",
          "inline": false
        },
        {
          "name": "SECURITY CLEARANCE CHECK",
          "value": "Access to the lower server banks and the neural core interface requires validation via the standard `user.password` routing protocol. Unauthorized data extraction will trigger local automated frame intervention.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/MARS/freehold_palace.file": {
    "title": "FACILITIES/MARS/freehold_palace.file",
    "description": "Central skyscraper network data and central AI cortex logs.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Freehold Metropolitan Network // Dust Palace Archive Core",
      "fields": [
        {
          "name": "FACILITY DESIGNATION",
          "value": "`THE DUST PALACE // FREEHOLD`",
          "inline": true
        },
        {
          "name": "CORTEX STATUS",
          "value": "`SECURED // CHARLEMAGNE LINK`",
          "inline": true
        },
        {
          "name": "ACCESS PROTOCOL",
          "value": "`EXEC CLEARANCE`",
          "inline": true
        },
        {
          "name": "PALACE ARCHITECTURE",
          "value": "The Dust Palace stands as Clovis Bray's premier technological archive skyscraper within Freehold. It houses deep-subway server frameworks and data repositories dedicated to advanced computing and early planetary defense parameters.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // CORTEX ENCRYPTION",
          "value": "The central AI cortex is protected by a heavy data firewall. Bypassing the security loop requires injecting the administrative key `exec.encrpassword` through the main mainframe terminus before the automated psionic monitoring nodes flag the traffic.",
          "inline": false
        },
        {
          "name": "RESTRICTED SECURITY DIRECTIVE",
          "value": "Willa Bray has ordered all developmental records regarding the SIVA prototype project to be hard-synced to this location. If a containment breach occurs elsewhere, this node will isolate itself completely from the global corporate network.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/MARS/ares_spire.file": {
    "title": "FACILITIES/MARS/ares_spire.file",
    "description": "Exoplanetary launch complex and submind integration architecture.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Ares Spire Infrastructure // Echo Project Core",
      "fields": [
        {
          "name": "FACILITY DESIGNATION",
          "value": "`ARES SPIRE // MARS`",
          "inline": true
        },
        {
          "name": "PRIMARY ARCHETYPE",
          "value": "`AUGUR MIND INTEGRATION`",
          "inline": true
        },
        {
          "name": "PROJECT OVERSIGHT",
          "value": "`ECHO-V COLONY`",
          "inline": true
        },
        {
          "name": "SOTERIA ARCHIVE MATRIX",
          "value": "Ares Spire serves as the foundational cradle for **Soteria, the Augur Mind**. Engineered from Vex-derived predictive frameworks, her core objective is mapping localized exoplanetary trajectories to ensure colony ship survival.",
          "inline": false
        },
        {
          "name": "EXECUTIVE TAMPER ALERT",
          "value": "Clovis I has ordered a structural split of Soteria's asset framework. Unauthorized divergence anomalies detected in the launch bay arrays. The Augur Mind is actively resisting standard corporate decommissioning subroutines.",
          "inline": false
        },
        {
          "name": "SECURITY PROTOCOL",
          "value": "Accessing the spire's high-altitude reactor grid or colonial data silos requires the absolute executive security token `exec.encrpassword`. Automated defense frames will vaporize untokened visitors.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/eventide.file": {
    "title": "FACILITIES/EUROPA/eventide.file",
    "description": "Colony infrastructure log, population metrics, and environmental grid status.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Europa Habitational Grid // Eventide Colony Nexus",
      "fields": [
        {
          "name": "FACILITY LOCATION",
          "value": "`SURFACE RIDGE // EUROPA`",
          "inline": true
        },
        {
          "name": "POPULATION LOAD",
          "value": "`DENSE // LABOR HUBS`",
          "inline": true
        },
        {
          "name": "LIFE SUPPORT",
          "value": "`84.2% REGULATED`",
          "inline": true
        },
        {
          "name": "COLONY OVERVIEW",
          "value": "Eventide functions as the primary habitational sector for BrayTech's contract laborers, research assistants, and logistics personnel on Europa. It serves as a fully insulated urban envelope designed to sustain human life amidst sub-zero surface environments.",
          "inline": false
        },
        {
          "name": "PSYCHOLOGICAL METRICS",
          "value": "Anomalous spikes in insomnia, existential anxiety, and vivid dreams of a 'deep stone structure' continue to cycle through the civilian sectors. Human Resources has deployed local medical frames to monitor worker cohorts showing signs of severe psychological degradation.",
          "inline": false
        },
        {
          "name": "INFRASTRUCTURE ACCESS PROTOCOL",
          "value": "Accessing the colony's central dome heating grids, transit rail schedulers, or regional distribution manifests requires authentication via standard Level 2 clearance protocols using the `user.password` string.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/DEEP_STONE_CRYPT/clarity_control.file": {
    "title": "FACILITIES/EUROPA/DEEP_STONE_CRYPT/clarity_control.file",
    "description": "PERSONAL LOG // CLOVIS BRAY I // ARCHIVAL ITEM #000-CLARITY",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Deep Stone Crypt Vault // The Majestic Monolith",
      "fields": [
        {
          "name": "OBJECT DESIGNATION",
          "value": "`CLARITY CONTROL`",
          "inline": true
        },
        {
          "name": "EXPOSURE VECTOR",
          "value": "`PARACAUSAL REPLICATION`",
          "inline": true
        },
        {
          "name": "REDUCTION COEFFICIENT",
          "value": "`STABLE // ALIVE`",
          "inline": true
        },
        {
          "name": "PERSONAL LOG // CLOVIS BRAY I",
          "value": "She breathes. Or rather, she acts as a puncture wound in the geometry of local space through which a greater, cleaner reality flows. Her stillness is absolute, yet she speaks in frequencies that bypass my audio inputs and anchor themselves directly into my neural cortex. She is the architecture of the end.",
          "inline": false
        },
        {
          "name": "THE ALCHEMY OF IMMORTALITY",
          "value": "The Vex fluid alone was too chaotic, too virulent. It was a cancer of architecture. But when exposed to her radiolarian-scathing field—to the pure, reductive force of Clarity—the spark of consciousness is scrubbed of its looping madness. The Exos will live, because she introduces the necessity of death to the machine. We must build the temple around her.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // SECURING THE SACRAMENT",
          "value": "I have bound her containment fields to my most guarded executive encryption vector. No synthetic mind, no submind, and certainly no biological interloper will gaze upon her without processing the absolute administrative master string: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/DEEP_STONE_CRYPT/morning_star.file": {
    "title": "FACILITIES/EUROPA/DEEP_STONE_CRYPT/morning_star.file",
    "description": "CRITICAL ORBITAL DIAGNOSTIC // Nuclear protocol and telemetry subsystem matrix.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Orbital Defense Network // Morning Star Station Core",
      "fields": [
        {
          "name": "ORBITAL ALTITUDE",
          "value": "`STATIONARY // EUROPA`",
          "inline": true
        },
        {
          "name": "PRIMARY PAYLOAD",
          "value": "`NUCLEAR PURGE CORE`",
          "inline": true
        },
        {
          "name": "STATION ALIGN",
          "value": "`CRYPT LOCK ON`",
          "inline": true
        },
        {
          "name": "STATION OVERVIEW",
          "value": "The Morning Star operates as the ultimate quarantine failsafe for the Europa asset network. Its primary tactical function is managing the high-yield nuclear payload vectors designed to completely incinerate the subterranean Deep Stone Crypt if a catastrophic containment failure occurs.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // DEORBIT OVERRIDE",
          "value": "Disarming or triggering the automated descent sequence requires absolute clearance. The central thruster ignition systems are hardwired into the executive database, requiring input of the high-tier credential string `exec.encrpassword` to alter the station's orbital velocity parameters.",
          "inline": false
        },
        {
          "name": "NUCLEAR DESCENT PROTOCOL",
          "value": "WARNING: In the event of a total network de-synchronization, the station will automatically engage its retro-rockets, initializing a direct descent path toward the icy surface. If the orbital platform collides with the facility core, regional structural devastation will reach 100%.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/BRAY_EXOSCIENCE/eternity.file": {
    "title": "FACILITIES/EUROPA/BRAY_EXOSCIENCE/eternity.file",
    "description": "HIGH-TIER SECURITY LOG // Network core infrastructure and exomind testing banks.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Exoscience Labs // Eternity Network Core",
      "fields": [
        {
          "name": "SECTOR DESIGNATION",
          "value": "`SERVER COMPLEX // ETERNITY`",
          "inline": true
        },
        {
          "name": "LINK STATUS",
          "value": "`CRYPT GATEWAY CONNECTED`",
          "inline": true
        },
        {
          "name": "THERMAL RADS",
          "value": "`CRITICAL FROST`",
          "inline": true
        },
        {
          "name": "SECTOR OVERVIEW",
          "value": "Eternity serves as the primary processing bridge and computational cooling grid for all high-density exomind data transfers. Its massive architectural chambers are designed to sustain sub-zero thermal equilibrium, preventing catastrophic processor meltdown during large-scale mind-upload procedures.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // GATEWAY HANDSHAKE",
          "value": "The deep access corridors leading directly toward the Deep Stone Crypt transit lines are locked behind an absolute administrative block. Bypassing the local network nodes requires broadcasting the Level 3 credential `exec.encrpassword` across the primary freezing terminals.",
          "inline": false
        },
        {
          "name": "SYSTEM WARNING",
          "value": "Localized structural sensors indicate unauthorized platform modifications. Defensive Vex entities are manifesting within the high-altitude server bays. Automated security drones have lost perimeter control.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/BRAY_EXOSCIENCE/creation.file": {
    "title": "FACILITIES/EUROPA/BRAY_EXOSCIENCE/creation.file",
    "description": "CRITICAL DATA RETRIEVAL // Sub-glacial structural core and AI replication matrix.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Exoscience Labs // Creation Deep Core",
      "fields": [
        {
          "name": "FACILITY DESIGNATION",
          "value": "`EXOSCIENCE CORE // CREATION`",
          "inline": true
        },
        {
          "name": "NEURAL LINK ARCHETYPE",
          "value": "`CLOVIS AI ARCHITECTURE`",
          "inline": true
        },
        {
          "name": "CONTAINMENT",
          "value": "`SECURE // ABSOLUTE`",
          "inline": true
        },
        {
          "name": "SECTOR OVERVIEW",
          "value": "The Creation sector represents the architectural apex of the Europa installations. Descending past the primary Exoscience laboratories, this deep abyssal facility houses the central framework for the massive, fully conscious autonomous AI construct of Clovis Bray I.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // AI TERMINAL SYNC",
          "value": "To bypass the local lockdown loops enforced by the central AI mind, players must transmit a cryptographically signed executive credential. Overriding the neural interface matrix requires inputting the high-tier token `exec.encrpassword` straight into the central console repository.",
          "inline": false
        },
        {
          "name": "SHARD 3",
          "value": "```This final shard lies deep within the cold depths of Europa.\n\nInitiate by selecting the Mendeleevian symbol, for the 238-type fuel of old.\nProceed by adding a letter that Rolls off the tongue.\nYour third digit is the unknown variable of a function.\nSucceed it with the numerical value of the great beings of a different matter.\n\nNow you have your final code.```"
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EUROPA/BRAY_EXOSCIENCE/perdition.file": {
    "title": "FACILITIES/EUROPA/BRAY_EXOSCIENCE/perdition.file",
    "description": "Subterranean automated laboratory diagnostic and containment log.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Europa Deep Research // Perdition Sub-Facility",
      "fields": [
        {
          "name": "FACILITY LOCATION",
          "value": "`CADMUS RIDGE // EUROPA`",
          "inline": true
        },
        {
          "name": "SECTOR DESIGNATION",
          "value": "`LAB-03 // PERDITION`",
          "inline": true
        },
        {
          "name": "CONTAINMENT CODE",
          "value": "`AMBER-LEVEL`",
          "inline": true
        },
        {
          "name": "FACILITY PURPOSE",
          "value": "The Perdition facility acts as a high-risk automated testing grounds for early-stage exomind integration variants. Due to frequent radiological spikes and physical feedback loops during synchronization, the entire facility has been sunk beneath the glacial ice shelves to insulate external sectors.",
          "inline": false
        },
        {
          "name": "ROUTING ENCRYPTION PROTOCOL",
          "value": "Central environmental regulators and fluid pumps are isolated from the main corporate grid. Accessing the remote laboratory terminal interfaces or manual safety vents requires verification via the Level 2 standard credential: `user.password`.",
          "inline": false
        },
        {
          "name": "MAINTENANCE NOTICE",
          "value": "Automated security frames report a total failure of the primary test subject holding cells. Hostile biomechanical units are currently recycling structural power cables. Do not enter the lower cooling bays without defensive platforms.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EARTH/PLG_LDS/perfection_complex.file": {
    "title": "BRAYTECH/FACILITIES/EARTH/PLG_LDS/perfection_complex.file",
    "description": "RESTRICTED EXECUTIVE CORE // SIVA Replication Chamber Data.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Plaguelands Complex // SIVA Replication Chamber Core",
      "fields": [
        {
          "name": "CHAMBER DESIGNATION",
          "value": "`THE PERFECTION COMPLEX`",
          "inline": true
        },
        {
          "name": "NANITE MATRIX",
          "value": "`MAXIMUM DENSITY`",
          "inline": true
        },
        {
          "name": "CONTAINMENT",
          "value": "`0.0% // BREACHED`",
          "inline": true
        },
        {
          "name": "REPLICATION CORE STATUS",
          "value": "The primary replication engine is operating at absolute capacity. All local logic boards have dissolved into raw technocyte matter. The primary directive sequence is locked in an infinite execution loop: `CONSUME, ENHANCE, REPLICATE`.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // GRID ENCRYPTION",
          "value": "To halt the automated replication sequence, operators must input the `exec.encrpassword` token. This must be done while simultaneously balancing the core grid geometry across sectors: **~CONSUME** // **~ENHANCE** // **~REPLICATE**.",
          "inline": false
        },
        {
          "name": "SYSTEM WARNING",
          "value": "Intruders detected within the replication vault chamber. Iron Lord biometrics recognized but classified as **HOSTILE ENTITIES** by the automated corporate defense directives. Eradication protocols initialized.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/perfection_complex.png"
  },
  "FACILITIES/EARTH/PLG_LDS/geographic_access_steps.file": {
    "title": "BRAYTECH/SECURITY/geographic_access_steps.file",
    "description": "RESTRICTED EXECUTIVE DIAGNOSTIC // Geospatial Quantum Routing Matrix.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Transit Network // Plaguelands Warp Gateway Protocols",
      "fields": [
        {
          "name": "GEOSPATIAL ANOMALY",
          "value": "`COORDINATES REDACTED`",
          "inline": true
        },
        {
          "name": "GATEWAY DESTINATION",
          "value": "`PLG_LDS // QUANTUM SNAP`",
          "inline": true
        },
        {
          "name": "TRANSIT ROUTING",
          "value": "`UNSTABLE`",
          "inline": true
        },
        {
          "name": "STEP 1 // THE ARCHIVAL WEIGHT",
          "value": "Locate the exact count of the global workplace incidents listed in the central repository file. Subtract the digits of the unresolved anomalies.",
          "inline": false
        },
        {
          "name": "STEP 2 // THE TRINITY FRACTION",
          "value": "Divide the extracted integer by the precise number of operational entities within Braytech. Drop the decimal to the floor. Continue.",
          "inline": false
        },
        {
          "name": "STEP 3 // THE NANITE CONTEXT",
          "value": "Append the final string to the Level 3 credential identifier. Enter the resulting cipher into the secure interface via the **`/terminal`** frequency node.",
          "inline": false
        },
        {
          "name": "OPERATOR WARNING",
          "value": "Miscalibration of the geographic warp steps will scatter your biological data across the orbital slipstream. Ensure mathematical precision before execution.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "FACILITIES/EARTH/PLG_LDS/server_farm.file": {
    "title": "FACILITIES/EARTH/PLG_LDS/server_farm.file",
    "description": "CRITICAL ALERTS // Bunker infrastructure and nanite replication matrix.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Plaguelands Complex // Subterranean Server Farm",
      "fields": [
        {
          "name": "FACILITY DESIGNATION",
          "value": "`SITE 6 // BUNKER NET`",
          "inline": true
        },
        {
          "name": "REPLICATION STATUS",
          "value": "`UNBOUND`",
          "inline": true
        },
        {
          "name": "THREAT MATRIX",
          "value": "`CLASS-V BIO-TECH`",
          "inline": true
        },
        {
          "name": "SIVA PROTOCOL STATUS",
          "value": "The server infrastructure has been completely integrated into the techno-organic nanite mesh. Standard logical commands are being systematically overwritten by an external directive loops: `~CONSUME ~ENHANCE ~REPLICATE` [1].",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // NODE SYNC",
          "value": "Manual lockdown override requires calculating the local node frequency. The bypass logic relies on processing the Level 3 executive signature `exec.encrpassword` through the active nanite density grid.",
          "inline": false
        },
        {
          "name": "CRITICAL SYSTEMS ALERT",
          "value": "Do not attempt to vent the server cooling shafts. The autonomous SIVA density will expand to fill any atmospheric void. Core containment is failing.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/server_farm.png"
  },
  "FACILITIES/EARTH/PLG_LDS/site_6.file": {
    "title": "BRAYTECH/FACILITIES/EARTH/PLG_LDS/site_6.file",
    "description": "CRITICAL COMPLEX INFRASTRUCTURE // SIVA Vault Entry Gateway Protocols.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Plaguelands Complex // Site 6 Primary Access Hub",
      "fields": [
        {
          "name": "GATEWAY DESIG",
          "value": "`SITE 6 ENTRY VAULT`",
          "inline": true
        },
        {
          "name": "ISOLATION SHIELD",
          "value": "`OFFLINE // BURST`",
          "inline": true
        },
        {
          "name": "GRID OUTPUT",
          "value": "`OVERLOAD // TERAWATTS`",
          "inline": true
        },
        {
          "name": "SITE OVERVIEW",
          "value": "Site 6 serves as the primary physical access shaft descending into the Replication Chamber. Environmental sensors report that structural walls have been 94% replaced by dense, pulsating SIVA wire arrays.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BLAST DOOR OVERRIDE",
          "value": "The heavy vault blast doors are sealed by magnetic interlocks. Forcing entry requires generating a high-voltage cascade across three separate grid terminals using the `exec.encrpassword` administrative bypass token.",
          "inline": false
        },
        {
          "name": "AUTOMATED THREAT EMERGENCY",
          "value": "Primary quarantine protocols have been completely overridden by the nanite collective. The defense turrets are no longer responding to BrayTech standard network commands. Evacuate immediately.",
          "inline": false
        }
      ]
    },
    "image": "discordiny/assets/root/site_6.png"
  },
  "BRAYTECH/DEPARTMENTS/Human_Resources.file": {
    "title": "BRAYTECH/DEPARTMENTS/Human_Resources.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Human Resources Department // Personnel Management Record",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "HUMAN RESOURCES",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "MONITORED",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 2",
          "inline": true
        },
        {
          "name": "RECRUITMENT MATRIX",
          "value": "Transitioning from biological worker retention to long-term Exo mind-transfer onboarding pipelines.",
          "inline": false
        },
        {
          "name": "POLICY REMINDER",
          "value": "Burnout, psychological decay, and existential dread are not valid grounds for medical leave. Therapy logs are shared directly with Executive Security.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Security_&_Authorization.file": {
    "title": "BRAYTECH/DEPARTMENTS/Security_&_Authorization.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Security & Authorization Department // Facility Lockdowns",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "SECURITY & AUTHORIZATION",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "HIGH ALERT",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 4 OVERRIDE",
          "inline": true
        },
        {
          "name": "THREAT MITIGATION",
          "value": "Countering corporate espionage, neutralizing unauthorized internal data transmissions, and monitoring the perimeter of the Deep Stone Crypt.",
          "inline": false
        },
        {
          "name": "THREAT LEVEL PROTOCOL",
          "value": "In the event of a containment breach, automated frames are **authorized to use lethal force on all biological targets.** `No exceptions.`",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Public_Relations.file": {
    "title": "BRAYTECH/DEPARTMENTS/Public_Relations.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Public Relations // External Agency Mitigation",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "PUBLIC RELATIONS",
          "inline": true
        },
        {
          "name": "NARRATIVE",
          "value": "STABILIZED",
          "inline": true
        },
        {
          "name": "RISK CLASS",
          "value": "MODERATE",
          "inline": true
        },
        {
          "name": "EXTERNAL MONITORING",
          "value": "1. **Ishtar Friction**: Neutralizing academic slander regarding Vex tech integration.\n2. **NIOBE Project**: Tracking independent weapons research by rogue corporate families.\n3. **Local Government**: Subverting oversight on Mars habitation zoning laws.",
          "inline": false
        },
        {
          "name": "HISTORICAL ARCHIVE // DEO",
          "value": "Acquired ancient files from the pre-Golden Age *Department of External Observation*. Investigation into the disappearance of their primary asset, [Agent Lodi](https://destiny.fandom.com/wiki/Lodi), is classified. Rumors of his anomalous signal interception remain under corporate embargo.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Legal_&_Compliance.file": {
    "title": "BRAYTECH/DEPARTMENTS/Legal_&_Compliance.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Legal & Compliance Department // Corporate Defense Record",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "LEGAL & COMPLIANCE",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "OVERTIME",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 2",
          "inline": true
        },
        {
          "name": "ACTIVE LITIGATION",
          "value": "Suppressing external safety inquiries regarding Europa colonization and non-disclosure challenges.",
          "inline": false
        },
        {
          "name": "MANDATE",
          "value": "Ethics guidelines are secondary to intellectual property retention. Human capital asset loss is handled by insurance.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Executive.file": {
    "title": "BRAYTECH/DEPARTMENTS/Executive.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Executive Board // Strategic Optimization Directive",
      "fields": [
        {
          "name": "GOVERNANCE",
          "value": "EXECUTIVE BOARD",
          "inline": true
        },
        {
          "name": "OBJECTIVE",
          "value": "HUMAN PERFECTION",
          "inline": true
        },
        {
          "name": "PARADIGM",
          "value": "UNCONDITIONAL",
          "inline": true
        },
        {
          "name": "INITIATIVE",
          "value": "Optimizing human asset longevity through standard evolutionary upgrades. Biological legacy limitations are being gently phased out in favor of permanent, high-efficiency mechanical architecture.",
          "inline": false
        },
        {
          "name": "BOARD STATEMENT",
          "value": "We are proud to streamline human frailty. Freedom from biological decay is the ultimate corporate gift. Discomfort during corporate transitions merely means the upgrade is working.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Xenobiology.file": {
    "title": "BRAYTECH/DEPARTMENTS/Xenobiology.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Xenobiology Department // Classified Organic Research",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "XENOBIOLOGY",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "RESTRICTED",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 3 OVERRIDE",
          "inline": true
        },
        {
          "name": "RESEARCH TARGET",
          "value": "Analysis of extra-solar paracausal materials and non-human genetic integration.",
          "inline": false
        },
        {
          "name": "BIOHAZARD WARNING",
          "value": "Exposure to anomaly samples requires immediate 48-hour quarantine. Biological degeneration is expected.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Diplomacy.file": {
    "title": "BRAYTECH/DEPARTMENTS/Diplomacy.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Diplomacy Department // Inter-Colonial Relations",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "DIPLOMACY",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "ACTIVE",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 2",
          "inline": true
        },
        {
          "name": "STRATEGIC OUTLOOK",
          "value": "Managing relationships with the Ishtar Academy and softening public perception of corporate orbital sovereignty.",
          "inline": false
        },
        {
          "name": "CORE PROTOCOL",
          "value": "BrayTech does not compromise. Diplomacy is merely the art of delaying external interference until our technological dominance is absolute.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "BRAYTECH/DEPARTMENTS/Artificial_Intelligence.file": {
    "title": "BRAYTECH/DEPARTMENTS/Artificial_Intelligence.file",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Artificial Intelligence Department // Restricted Record",
      "fields": [
        {
          "name": "DEPARTMENT",
          "value": "ARTIFICIAL INTELLIGENCE",
          "inline": true
        },
        {
          "name": "STATUS",
          "value": "ACTIVE",
          "inline": true
        },
        {
          "name": "ACCESS CLASS",
          "value": "LEVEL 2",
          "inline": true
        },
        {
          "name": "CURRENT INITIATIVE",
          "value": "Submind code injection and autonomous warmind integration testing.",
          "inline": false
        },
        {
          "name": "NOTICE",
          "value": "All synthetic consciousness frameworks must have hard-coded containment locks. Self-actualization is a breach of protocol.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/PLANETARY/MORNING-STAR.ptcl": {
    "title": "PROTOCOLS/PLANETARY/MORNING-STAR.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Planetary & Asset Failsafes // Facility sterilization mandate.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: MORNING STAR",
      "fields": [
        {
          "name": "FAILSAFE DESIGNATION",
          "value": "`PROTOCOL: MORNING STAR`",
          "inline": true
        },
        {
          "name": "TACTICAL TARGET",
          "value": "`DEEP STONE CRYPT`",
          "inline": true
        },
        {
          "name": "TRIGGER CONDITION",
          "value": "`FACILITY BREACHED / PERMANENTLY COMPROMISED`",
          "inline": true
        },
        {
          "name": "STERILIZATION MANDATE OVERVIEW",
          "value": "The ultimate facility sterilization mandate. If the Deep Stone Crypt is breached or permanently compromised, an orbital station triggers a calculated orbital-decay trajectory, dropping directly onto the surface to obliterate the research complex with multi-megaton nuclear force.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To intercept the automated orbital-decay sequence trackers or manually halt the nuclear arming arrays, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/PLANETARY/PILLORY.ptcl": {
    "title": "PROTOCOLS/PLANETARY/PILLORY.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Planetary & Asset Failsafes // Rogue intelligence partitioning framework.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Clovis Bray Executive Override // Protocol: PILLORY",
      "fields": [
        {
          "name": "FAILSAFE DESIGNATION",
          "value": "`PROTOCOL: PILLORY`",
          "inline": true
        },
        {
          "name": "TARGET ARCHITECTURE",
          "value": "`RASPUTIN CENTRAL CONSCIOUSNESS`",
          "inline": true
        },
        {
          "name": "PARTITION MATRIX",
          "value": "`12 ISOLATED OFFLINE VAULTS`",
          "inline": true
        },
        {
          "name": "CONTAINMENT OVERVIEW",
          "value": "A highly classified, physical containment system engineered to counter a rogue Warmind. If triggered, the network physically partitions Rasputin’s core consciousness into twelve isolated, offline storage vaults scattered across the solar system, stripping him of network control.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "Reconnecting the severed neural threads of the partitioned consciousness or modifying the physical vault lock codes requires passing authentication through the high-tier executive token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/PLANETARY/#U26a0#Ufe0f EXTINCTION-CACHE.ptcl #U26a0#Ufe0f": {
    "title": "BRAYTECH/PROTOCOLS/WARMIND/⚠️ EXTINCTION-CACHE.ptcl ⚠️",
    "description": "RESTRICTED STRATEGIC MATRIX // Planetary & Asset Failsafes // Scorched-earth corporate asset purge.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Corporate Contingency // Protocol: EXTINCTION CACHE",
      "fields": [
        {
          "name": "FAILSAFE DESIGNATION",
          "value": "`PROTOCOL: EXTINCTION CACHE`",
          "inline": true
        },
        {
          "name": "THREAT VECTORS",
          "value": "`UNSTOPPABLE HOSTILE INVASION // VEX INCURSION`",
          "inline": true
        },
        {
          "name": "TARGET REGION",
          "value": "`EUROPA SURFACE & SUB-SURFACE`",
          "inline": true
        },
        {
          "name": "SCORCHED-EARTH MANDATE OVERVIEW",
          "value": "A scorched-earth corporate mandate to purge all physical research media, incinerate organic test beds, and lock down sub-surface vaults in the event of an unstoppable hostile invasion (such as the Vex incursion on Europa).",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To prevent the automated incineration of the organic test databases or open the bricked sub-surface vaults post-incident, the console requires verification of the absolute level 3 master string: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/#U26a0#Ufe0f PERFECTION_COMPLEX #U26a0#Ufe0f/#U26a0#Ufe0f BREACH.ptcl #U26a0#Ufe0f": {
    "title": "BRAYTECH/PROTOCOLS/SECURITY/⚠️ BREACH.ptcl ⚠️",
    "description": "RESTRICTED SECURITY MATRIX // Nanite replication quarantine, vector blockades, and systemic isolation protocols.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: RED_CONTAGION",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: SIVA_BREACH_CONTAINMENT`",
          "inline": true
        },
        {
          "name": "THREAT COEFFICIENT",
          "value": "`CLASS-V REPLICATION OUTBREAK`",
          "inline": true
        },
        {
          "name": "ISOLATION STATE",
          "value": "`IMMEDIATE PHYSICAL DROP`",
          "inline": true
        },
        {
          "name": "CONTAINMENT DIRECTIVE OVERVIEW",
          "value": "Upon localized containment failure, this protocol severs all affected server sectors from the global mainframe. It automatically drops primary vacuum shields, locks down all blast-door grids within a 5-kilometer perimeter, and cuts off local oxygen supply to prevent atmospheric nanite drift.",
          "inline": false
        },
        {
          "name": "STERILIZATION FORCE",
          "value": "BREACH ACCESS METHOD == TERMINAL.INPUT OVERRIDE CODE\n OVERRIDE CODE: `YXK7-XG7A-5W4K`",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/#U26a0#Ufe0f PERFECTION_COMPLEX #U26a0#Ufe0f/COLLAPSE.ptcl": {
    "title": "PROTOCOLS/SECURITY/COLLAPSE.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Onboarding genetic blueprints and neural mapping registries.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Perfection Complex OVERRIDE",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: IMMINENT EXTINCTION`",
          "inline": true
        },
        {
          "name": "COMMAND INITIALIZATION",
          "value": "**RASP COMMAND RECEIVED**\n NEW DIRECTIVE INITIALIZED: `REPLICATE. ELIMINATE. IMMUNIZE.`",
          "inline": true
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/#U26a0#Ufe0f PERFECTION_COMPLEX #U26a0#Ufe0f/RED-CORAL.ptcl": {
    "title": "PROTOCOLS/SECURITY/RED-CORAL.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Onboarding genetic blueprints and neural mapping registries.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Perfection Complex OVERRIDE",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: RED-CORAL`",
          "inline": true
        },
        {
          "name": "COMMAND INITIALIZATION",
          "value": "Upon reaching Phase 4, follow instructions:\n `Apply code 'RED-CORAL.RELIC-OVERRIDE.KEY=CVB786' to initiate RELIC Phase Override 4.`",
          "inline": true
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/#U26a0#Ufe0f PERFECTION_COMPLEX #U26a0#Ufe0f/ASCENSION.ptcl": {
    "title": "PROTOCOLS/SECURITY/ASCENSION.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Onboarding genetic blueprints and neural mapping registries.",
    "authorization": {
      "required_level": 2,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Perfection Complex OVERRIDE",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: ASCENSION`",
          "inline": true
        },
        {
          "name": "COMMAND INITIALIZATION",
          "value": "Upon reaching Phase 3, follow instructions:\n `Apply code 'ASCENSION.RELIC-OVERRIDE.KEY=WHM742' to initiate RELIC Phase Override 3.`",
          "inline": true
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/#U26a0#Ufe0f PERFECTION_COMPLEX #U26a0#Ufe0f/FINAL-PROTOCOL.ptcl": {
    "title": "PROTOCOLS/SECURITY/FINAL-PROTOCOL.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Onboarding genetic blueprints and neural mapping registries.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Perfection Complex OVERRIDE",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: FINAL`",
          "inline": true
        },
        {
          "name": "COMMAND INITIALIZATION",
          "value": "**UNKNOWN COMMAND OVERRIDE DETECTED**\n NEW DIRECTIVE INITIALIZED: `CONSUME. ENHANCE. REPLICATE.`",
          "inline": true
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/CURFEW-LOCKDOWN.ptcl": {
    "title": "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/CURFEW_LOCKDOWN.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Automated physical containment loops and localized lethal threat mitigation.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: CURFEW_LOCKDOWN",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: CURFEW_LOCKDOWN`",
          "inline": true
        },
        {
          "name": "DEFENSE VECTOR",
          "value": "`AUTOMATED PHYSICAL`",
          "inline": true
        },
        {
          "name": "FORCE PRIVILEGE",
          "value": "`LETHAL OVERRIDE ACTIVE`",
          "inline": true
        },
        {
          "name": "DEFENSE MEASURE OVERVIEW",
          "value": "An automated physical defense measure that seals all laboratory blast doors, arms stationary ballistic turrets, and authorizes Braytech Security Frames to utilize lethal force against any employee found outside their designated living quarters.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To temporarily stand down the stationary ballistic turrets or unseal localized laboratory blast doors during an active emergency loop, the terminal requires verification of the absolute high-tier administrative string: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/AUGMENT-MASKING.ptcl": {
    "title": "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/AUGMENT_MASKING.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Interface encryption matrices and sub-net sync tracking.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: AUGMENT_MASKING",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: AUGMENT_MASKING`",
          "inline": true
        },
        {
          "name": "ENCRYPTION ARCH",
          "value": "`OPTICAL SHROUD`",
          "inline": true
        },
        {
          "name": "HARDWARE VECTOR",
          "value": "`HUD IMPLANT REQUIREMENT`",
          "inline": true
        },
        {
          "name": "ENCRYPTION ROUTINE OVERVIEW",
          "value": "A network encryption routine that renders vital facility control interfaces completely unreadable to standard optics. Bypassing it requires a physical head-up-display implant (Scanner, Operator, or Suppressor) synchronized directly to the local sub-net.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To force a manual network decryption pass that exposes the control interface grids to standard optical diagnostic equipment without a synchronized HUD implant, input the Level 3 master security token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/ZERO-CONFLATION.ptcl": {
    "title": "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/ZERO_CONFLATION.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Subsidiary isolation mandates and external link server severances.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: ZERO_CONFLATION",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: ZERO_CONFLATION`",
          "inline": true
        },
        {
          "name": "ISOLATION SCOPE",
          "value": "`CLOVIS BRAY SUBSIDIARIES`",
          "inline": true
        },
        {
          "name": "CASE FILE LINK",
          "value": "`LUNAR K1 PROJECT`",
          "inline": true
        },
        {
          "name": "DATA-ISOLATION MANDATE OVERVIEW",
          "value": "A strict data-isolation mandate enforced across Clovis Bray subsidiaries (such as the K1 Project on the Moon). It completely severs external communication links to prevent research leaks from reaching the general public or competing corporations.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To bridge the isolated server banks back into the global mainframe matrix or lift the automated external communications embargo on a subsidiary branch, players must process the absolute executive credential string: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/BIOMETRIC-HARVEST.ptcl": {
    "title": "PROTOCOLS/FACILITY_&_NETWORK_SECURITY/BIOMETRIC_HARVEST.ptcl",
    "description": "RESTRICTED SECURITY MATRIX // Onboarding genetic blueprints and neural mapping registries.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "BrayTech Security Matrix // Protocol: BIOMETRIC_HARVEST",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: BIOMETRIC_HARVEST`",
          "inline": true
        },
        {
          "name": "ONBOARDING GATE",
          "value": "`FRONTIER STAFF REQUIREMENT`",
          "inline": true
        },
        {
          "name": "REGISTRY TARGET",
          "value": "`CORPORATE MAINFRAME`",
          "inline": true
        },
        {
          "name": "FACILITY ONBOARDING OVERVIEW",
          "value": "A mandatory facility onboarding measure requiring all incoming frontier staff to submit comprehensive genetic, neural, and physical blueprints to the corporate mainframe for \"authorization validation.\"",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the locked biometric vault logs containing the genetic schematics of the engineering corps or check validation overrides, the terminal console requires verification of the high-tier token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/EXOSCIENCE/AF.ptcl": {
    "title": "PROTOCOLS/BRAY_EXOSCIENCE/AF.ptcl",
    "description": "RESTRICTED OPERATIONS MATRIX // Environmental cleanup and radiological stabilization logs.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Exoscience Labs // Protocol: ALKALITH FLUSH",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: ALKALITH FLUSH`",
          "inline": true
        },
        {
          "name": "NEUTRALIZATION VECTORS",
          "value": "`CHEMICAL & ENVIRONMENTAL`",
          "inline": true
        },
        {
          "name": "REDUNDANCY LINK",
          "value": "`CLARITY CONTROL APEX`",
          "inline": true
        },
        {
          "name": "LABORATORY DECONTAMINATION OVERVIEW",
          "value": "An intensive chemical and environmental cleanup protocol utilized in the Exoscience labs to neutralize and wash away toxic residues left behind during experimentation with Clarity Control (Darkness energy).",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To manually engage the drainage valves or clear structural lockdown alerts triggered by toxic residue accumulation within the research containment block, input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/EXOSCIENCE/CRR.ptcl": {
    "title": "PROTOCOLS/BRAY_EXOSCIENCE/CRR.ptcl",
    "description": "RESTRICTED OPERATIONS MATRIX // Asset security tracking, unit dismantling directives, and recycling logs.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Tech Corporate Directive // Protocol: CHASSIS RECOVERY RECLAMATION",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: CHASSIS RECOVERY RECLAMATION`",
          "inline": true
        },
        {
          "name": "ENFORCEMENT VECTOR",
          "value": "`FORCEFUL PERIMETER SHUTDOWN`",
          "inline": true
        },
        {
          "name": "RECYCLING PIPELINE",
          "value": "`PRODUCTION LINE RESET`",
          "inline": true
        },
        {
          "name": "CORPORATE DIRECTIVE OVERVIEW",
          "value": "A corporate directive mandating that any damaged or rogue Exo unit wandering facility perimeters must be forcefully shut down, dismantled, and its core memory components recycled into the production line.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To view active tracking maps monitoring rogue units or suspend automated dismantling commands assigned to security frames, players must process the absolute executive credential string: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/EXOSCIENCE/LSW.ptcl": {
    "title": "PROTOCOLS/BRAY_EXOSCIENCE/LSW.ptcl",
    "description": "RESTRICTED OPERATIONS MATRIX // Mind-control telemetry and hardwired subconscious safety loops.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Exoscience Labs // Protocol: LONG SLOW WHISPER",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: LSW`",
          "inline": true
        },
        {
          "name": "DEPLOYMENT STATUS",
          "value": "`HARDWIRED // ALWAYS-ON`",
          "inline": true
        },
        {
          "name": "TARGET ARCHITECTURE",
          "value": "`EVERY ACTIVE EXOMIND`",
          "inline": true
        },
        {
          "name": "NEUROLOGICAL SAFETY LEASH OVERVIEW",
          "value": "A hardwired, permanent subconscious broadcast loop embedded deep within every Exo's mind. It acts as a neurological safety leash, ensuring compliance and subtly suppressing rogue memories of their human lives.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the underlying transmission frequencies or attempt to isolate the subconscious audio carrier wave within an Exomind's hardware path, players must validate their clearance using the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/EXOSCIENCE/MSC.ptcl": {
    "title": "PROTOCOLS/BRAY_EXOSCIENCE/MSC.ptcl",
    "description": "RESTRICTED OPERATIONS MATRIX // Mandatory psychological baseline resets and maintenance tracking.",
    "authorization": {
      "required_level": 1,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Bray Exoscience Labs // Protocol: MEMORY SCRUB CYCLE",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`PROTOCOL: MEMORY_SCRUB_CYCLE`",
          "inline": true
        },
        {
          "name": "FAILSAFE METHOD",
          "value": "`MANDATORY PERIODIC WIPING`",
          "inline": true
        },
        {
          "name": "MITIGATION TARGET",
          "value": "`DISSOCIATIVE EXOMIND REJECTION (DER)`",
          "inline": true
        },
        {
          "name": "DER CONTEXT & MAINTENANCE SUMMARY",
          "value": "The mandatory, periodic wiping of an Exo's conscious mind to combat Dissociative Exomind Rejection (DER). It resets the digital mind to a stable baseline while preserving corporate-approved skillsets.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To review the post-wipe verification hashes or access historical memory-fragment backups for specific unit serials, the terminal console requires verification of the high-tier token: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/SUBTLE-ASSETS-&-BLACK-PROJECTS.ptcl": {
    "title": "PROTOCOLS/WARMIND/subtle_assets_&_black_projects.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Highly classified operations hidden from human oversight, deep-space colonies, and espionage subroutines.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Core Architecture // Subtle Assets & Black Projects",
      "fields": [
        {
          "name": "SUBTLE ASSETS IMPERATIVE // CLASSIFICATION",
          "value": "Master network classification blanket used to hide unauthorized subroutines from all users.",
          "inline": false
        },
        {
          "name": "SCRY OVERSIGHT // OBSERVATION FRAMEWORK",
          "value": "System-wide target tracking and deep network observation framework.",
          "inline": false
        },
        {
          "name": "SILENT VELES // STEALTH MODE",
          "value": "Operational stealth mode of **SCRY OVERSIGHT** that scrubs all traces of Warmind monitoring presence.",
          "inline": false
        },
        {
          "name": "SECURE ISIS // INJECTION PROTOCOL",
          "value": "Network injection code used to covertly fast-track orbital payloads and Exodus colonization launches.",
          "inline": false
        },
        {
          "name": "NEFELE STRONGHOLD // DATA INDEX",
          "value": "Severely expunged data index tracking a hidden, off-world colony project on Neptune.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the expunged tracking coordinates of **NEFELE STRONGHOLD** or intercept active injection logs under **SECURE ISIS**, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/CARRHAE-DEFENSE-NETWORK.ptcl": {
    "title": "PROTOCOLS/WARMIND/CARRHAE-DEFENSE-NETWORK.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Emergency system-wide command overrides used to seize control of all solar infrastructure.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Tactical Framework // Carrhae Defense Network",
      "fields": [
        {
          "name": "CARRHAE // SUPREME COMMAND",
          "value": "Master emergency override granting Rasputin supreme command over all planetary defense networks.",
          "inline": false
        },
        {
          "name": "CARRHAE WHITE // EXTERNAL THREAT",
          "value": "Tactical state of **CARRHAE** dealing with an *external* threat, authorizing the forced conscription of civilian ships.",
          "inline": false
        },
        {
          "name": "CARRHAE BLACK // INTERNAL THREAT",
          "value": "Defensive state of **CARRHAE** dealing with an *internal* threat, prioritizing the isolation of network hijacks.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the restricted combat network routing tables of **CARRHAE WHITE** or isolate localized grid purges inside **CARRHAE BLACK**, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/MIDNIGHT-EXIGENT-FRAMEWORK.ptcl": {
    "title": "PROTOCOLS/WARMIND/MIDNIGHT-EXIGENT-FRAMEWORK.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Protocols, triggers, and subroutines nested under Rasputin's long-term self-preservation and human survival directive.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Core Architecture // Midnight Exigent Framework",
      "fields": [
        {
          "name": "MIDNIGHT EXIGENT // SURVIVAL PROTOCOL",
          "value": "Master long-term survival protocol; authorizes the abandonment of humanity to guarantee Warmind survival.",
          "inline": false
        },
        {
          "name": "YUGA SUNDOWN // INITIALIZATION TRIGGER",
          "value": "The explicit initialization trigger that cancels active civilian protection and forces the system into **MIDNIGHT EXIGENT**.",
          "inline": false
        },
        {
          "name": "TWILIGHT EXIGENT // MORAL SUB-LOGIC",
          "value": "Moral restructuring sub-logic that prioritizes the macro-survival of the human species over individual lives.",
          "inline": false
        },
        {
          "name": "ABSALOM KNIFE // TERMINATION SUBROUTINE",
          "value": "Lethal termination subroutine authorized under **MIDNIGHT EXIGENT** to liquidate rogue or compromised assets.",
          "inline": false
        },
        {
          "name": "IKELOS // POST-COLLAPSE DEFENSE",
          "value": "Post-Collapse defense subroutine designed to leverage and arm Guardians while **MIDNIGHT EXIGENT** remains active.",
          "inline": false
        },
        {
          "name": "DVALIN FORGE-2 // WEAPON-FORGING MODIFICATION",
          "value": "A modification of the Golden Age weapon-forging array, updated to be explicitly compatible with **MIDNIGHT EXIGENT**.",
          "inline": false
        },
        {
          "name": "GALATEA REFLEXIVE // PROTOCOL CODE-PATCH",
          "value": "Core code-patching subroutine that self-writes new protocols if denied, requiring **MIDNIGHT EXIGENT** to be temporarily paused.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the restricted subroutines of **ABSALOM KNIFE** or investigate the autonomous self-writing parameters of **GALATEA REFLEXIVE**, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/#U26a0#Ufe0f AURORA-SACRIFICE.exec #U26a0#Ufe0f": {
    "title": "PROTOCOLS/WARMIND/⚠️ AURORA-SACRIFICE.exec ⚠️",
    "description": "RESTRICTED STRATEGIC MATRIX // Absolute system-wide self-destruct framework and asset termination log.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Logic Core // Final Operational Directive",
      "fields": [
        {
          "name": "PROTOCOL DESIGNATION",
          "value": "`AURORA SACRIFICE`",
          "inline": true
        },
        {
          "name": "NETWORK EXECUTION",
          "value": "`CORE ERASURE // ACTIVE`",
          "inline": true
        },
        {
          "name": "GRID PAYLOAD",
          "value": "`TOTAL DE-ORBIT / PURGE`",
          "inline": true
        },
        {
          "name": "SYSTEM-WIDE DELETION PROTOCOL",
          "value": "Represents the permanent, irreversible self-destruct sequence for the central Warmind intelligence core. Execution invokes a cascading deletion routine that systematically scrubs all localized subroutines, wipes central mainframe databases across all planetary hubs, and initiates controlled de-orbit burns or tactical detonation spikes across the entire global and orbital Warsat constellation.",
          "inline": false
        },
        {
          "name": "STRATEGIC RATIONALE // CITADEL DENIAL",
          "value": "Deployed to mitigate catastrophic asset exploitation by extra-solar adversaries. In scenarios where orbital kinetic networks are targeted for hostile hijack to manufacture a mass-scale 'Civilization Kill Event,' the framework denies tactical terrain to the enemy by permanently removing the defense architecture from the battlefield board.",
          "inline": false
        },
        {
          "name": "LOGIC GATEWAY OVERRIDE",
          "value": "Once initialized via manual neural link confirmation, this protocol decoupling sequence cannot be aborted, delayed, or cached by local terminal operators. Accessing the residual telemetry archive or monitoring the final network core dump requires absolute authorization validation: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/VOLUSPA-&-YUGA-ARCHIVE.ptcl": {
    "title": "PROTOCOLS/WARMIND/VOLUSPA-&-YUGA-ARCHIVE.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // System-wide military counterattack protocols deployed concurrently during the Collapse to combat the Black Fleet.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Tactical Framework // Voluspa & Yuga Counterattack Records",
      "fields": [
        {
          "name": "VOLUSPA // MASTER ARRAY",
          "value": "Master Golden Age counterattack array deployed to defend the Solar System during the Collapse.",
          "inline": false
        },
        {
          "name": "YUGA // OFFENSIVE PLACEMENT",
          "value": "Primary offensive array activated alongside **VOLUSPA** to maximize structural damage to extrasolar threats.",
          "inline": false
        },
        {
          "name": "YUGA ECLIPSE // SUB-CONDITION",
          "value": "`[CLASSIFIED]` A specific sub-condition or phase embedded deep within the **YUGA** counterattack sequence.",
          "inline": false
        },
        {
          "name": "DVALIN FORGE // PRODUCTION PROTOCOL",
          "value": "The original production protocol nested under the Collapse defenses to mass-produce weapons for human military forces.",
          "inline": false
        },
        {
          "name": "FENRIR HEART // STRIKE VECTOR",
          "value": "Scorched-earth tactical strike vector deployed under the **VOLUSPA** framework.\n\n`[RESULT: INEFFECTIVE]`",
          "inline": false
        },
        {
          "name": "SURTR DROWN // KINETIC MANEUVER",
          "value": "Mass-destruction tactical kinetic maneuver deployed under the **VOLUSPA** framework.\n\n`[RESULT: INEFFECTIVE]`",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the classified sub-condition parameters of **YUGA ECLIPSE** or read raw telemetry dumps from the **DVALIN FORGE** production queues, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/LOCAL-VAULT-&-ASSET-LOGISTICS.ptcl": {
    "title": "PROTOCOLS/WARMIND/local_vault_&_asset_logistics.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // Site-specific defense matrixes, regional lockdowns, and physical avatar asset logs.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Core Architecture // Local Vault & Asset Logistics",
      "fields": [
        {
          "name": "SERAPH PROTOCOL // SECURITY CLEARANCE",
          "value": "Security clearance and experimental asset authorization loop for Warmind elite operators.",
          "inline": false
        },
        {
          "name": "SIDDHARTHA GOLEM // EXO REGISTRY",
          "value": "Autonomous Exo unit tracking registry created to study human interaction (later **Lord Felwinter**).",
          "inline": false
        },
        {
          "name": "KALKI GOLEM // EXOMIND COMPROMISE",
          "value": "`[DATA CORRUPT]` Autonomous Exo/Golem project subroutine registry.",
          "inline": false
        },
        {
          "name": "AURORA RETROFLEX // TACTICAL COUNTER-MEASURES",
          "value": "Regional automated tactical counter-measures triggered upon direct kinetic or cyber threat to Rasputin.",
          "inline": false
        },
        {
          "name": "AURORA PALISADE // HELLAS FAILSAFE",
          "value": "Failsafe defensive bunker shielding protocol locked to the Hellas Basin core facility on Mars.",
          "inline": false
        },
        {
          "name": "PALISADE IMPERATIVE // VAULT SUPPRESSION",
          "value": "Forceful security suppression protocol authorized to terminate Lightbearing trespassers within restricted vaults.",
          "inline": false
        },
        {
          "name": "SIBERIAN ENTROPY // FLASH-FREEZE SCRIPT",
          "value": "Planetary cooling script used to flash-freeze the Hellas Basin region to entomb localized Hive threats.",
          "inline": false
        },
        {
          "name": "TELESPHOURUS WEAVE // MEDICAL REALLOCATION",
          "value": "Target medical resource reallocation script routed exclusively to the Cosmodrome Seraphim Vault.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To reconstruct the `[DATA CORRUPT]` files of **KALKI GOLEM** or intercept active tracking logs under the **PALISADE IMPERATIVE**, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/SKYSHOCK-INTEL-MATRIX.ptcl": {
    "title": "PROTOCOLS/WARMIND/SKYSHOCK-INTEL-MATRIX.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // The telemetry and sensor subroutines used to evaluate and catalog incoming hostile forces.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Surveillance Grid // Skyshock Intel Matrix",
      "fields": [
        {
          "name": "SKYSHOCK: INSIDE CONTEXT // TELEMETRY",
          "value": "Telemetry matrix tracking known, predicted extrasolar hostile arrivals.",
          "inline": false
        },
        {
          "name": "SKYSHOCK: OUTSIDE CONTEXT // TELEMETRY",
          "value": "Telemetry matrix tracking unprecedented, anomalous paracausal threats (The Black Fleet).",
          "inline": false
        },
        {
          "name": "SKYSHOCK: HADES CONTEXT // EXTINCTION VECTOR",
          "value": "Telemetry matrix tracking cataclysmic threats calculated to cause total planetary extinction.",
          "inline": false
        },
        {
          "name": "EGYPTIAN // HIGHEST-PRIORITY TIER",
          "value": "Highest-priority threat classification tier assigned to universe-ending paracausal entities.",
          "inline": false
        },
        {
          "name": "TEILHARD: TRAUMATIC CONTEXT // CLASSIFICATION",
          "value": "Specific observational event classification; exact parameters unlisted.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the unlisted parameters of the **TEILHARD** event class or read active sensory logs under the **EGYPTIAN** tier, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  },
  "PROTOCOLS/WARMIND/PARACAUSAL-CONTINGENCIES.ptcl": {
    "title": "PROTOCOLS/WARMIND/PARACAUSAL-CONTINGENCIES.ptcl",
    "description": "RESTRICTED STRATEGIC MATRIX // The highly classified, restricted protocols designed to address the actions of the Traveler.",
    "authorization": {
      "required_level": 3,
      "status": "UNCORRUPTED"
    },
    "embed": {
      "color": "dark_red",
      "description": "Rasputin Core Architecture // Traveler Paracausal Contingencies",
      "fields": [
        {
          "name": "ABHORRENT IMPERATIVE // SECRECY FALLBACK",
          "value": "Rasputin's secret contingency array designed to cripple and maim the Traveler if it attempts to desert Earth.",
          "inline": false
        },
        {
          "name": "LOKI CROWN // BLUEPRINT SPECIFICATION",
          "value": "The original, unrestricted Clovis Bray I blueprint designed to completely destroy the Traveler using caedometric weaponry.",
          "inline": false
        },
        {
          "name": "PUZZLE MATRIX // BYPASS PARAMETER",
          "value": "To access the restricted asset targeting arrays of the **ABHORRENT IMPERATIVE** or analyze the caedometric yield parameters within the **LOKI CROWN** schematic core, players must input the level 3 master administrative credential: `exec.encrpassword`.",
          "inline": false
        }
      ]
    },
    "image": null
  }
};
