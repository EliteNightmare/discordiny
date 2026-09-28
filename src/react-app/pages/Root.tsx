import {
  Fragment,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import "./Root.css";
import {
  ROOT_DIRECTORY_ASSETS,
  ROOT_FILES,
  ROOT_LAYOUT,
} from "./rootData";

type NavNode = {
  directories: readonly {
    name: string;
    node: NavNode;
  }[];
  files: readonly string[];
};

type RootLogin = {
  name: string;
  username: string;
  password: string;
  level: number;
};

type RootField = {
  name?: unknown;
  value?: unknown;
  inline?: unknown;
};

type RootRecord = {
  title?: unknown;
  description?: unknown;
  image?: unknown;
  authorization?: {
    required_level?: unknown;
    status?: unknown;
  };
  embed?: {
    description?: unknown;
    fields?: RootField[];
  };
};

const LOGINS: RootLogin[] = [
  {
    name: "ADMIN",
    username: "admin",
    password: "admin",
    level: 1,
  },
  {
    name: "WILHELMINA",
    username: "wlhlm.bray",
    password: "XJ57-4BA6-QSM9",
    level: 2,
  },
  {
    name: "CLOVIS",
    username: "The Lord of Logic, King of Code",
    password:
      "Tell yourself a story... Let the story twist in unlikely directions",
    level: 3,
  },
];

const DENIED_STATUSES = new Set([
  "denied",
  "unauthorized",
  "blocked",
  "revoked",
  "forbidden",
  "disabled",
]);

function normalizeLookupKey(value: string) {
  return value
    .replace(/#U26a0#Ufe0f/g, "⚠️")
    .toLocaleLowerCase();
}

function getRecord(path: string): RootRecord | null {
  const exact = ROOT_FILES[path] as RootRecord | undefined;

  if (exact) {
    return exact;
  }

  const normalized = normalizeLookupKey(path);
  const matchingKey = Object.keys(ROOT_FILES).find(
    (candidate) => normalizeLookupKey(candidate) === normalized,
  );

  return matchingKey
    ? (ROOT_FILES[matchingKey] as RootRecord)
    : null;
}

function getNode(parts: string[]): NavNode | null {
  let node = ROOT_LAYOUT as unknown as NavNode;

  for (const part of parts) {
    const next = node.directories.find(
      (directory) => directory.name === part,
    );

    if (!next) {
      return null;
    }

    node = next.node;
  }

  return node;
}

function clampAuthorizationLevel(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(3, Math.trunc(value)));
  }

  const text = String(value ?? "1").trim();
  const digits = text.match(/\d+/)?.[0];
  const parsed = digits ? Number.parseInt(digits, 10) : 1;

  return Math.max(1, Math.min(3, parsed || 1));
}

function authorizationStatus(record: RootRecord | null) {
  const value = String(
    record?.authorization?.status ?? "AUTHORIZED",
  ).trim();

  return value || "AUTHORIZED";
}

function authorizationAllowed(record: RootRecord | null) {
  return !DENIED_STATUSES.has(
    authorizationStatus(record).toLocaleLowerCase(),
  );
}

function assetUrl(value: unknown) {
  if (!value) {
    return null;
  }

  const normalized = String(value)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const marker = "assets/root/";
  const index = normalized.toLocaleLowerCase().indexOf(marker);

  if (index >= 0) {
    return `/assets/root/${normalized.slice(index + marker.length)}`;
  }

  if (!normalized.includes("/")) {
    return `/assets/root/${normalized}`;
  }

  return null;
}

function directoryAsset(path: string[]) {
  const key = path.join("/");
  return (
    ROOT_DIRECTORY_ASSETS[key] ??
    ROOT_DIRECTORY_ASSETS[""] ??
    "/assets/root/root.gif"
  );
}

function renderInline(value: string): ReactNode[] {
  const pattern =
    /(\|\|[^|]+\|\||\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*)/g;
  const pieces = value.split(pattern);

  return pieces.map((piece, index) => {
    if (piece.startsWith("||") && piece.endsWith("||")) {
      return (
        <span className="root-spoiler" key={index}>
          {piece.slice(2, -2)}
        </span>
      );
    }

    if (piece.startsWith("**") && piece.endsWith("**")) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }

    if (piece.startsWith("~~") && piece.endsWith("~~")) {
      return <s key={index}>{piece.slice(2, -2)}</s>;
    }

    if (piece.startsWith("`") && piece.endsWith("`")) {
      return <code key={index}>{piece.slice(1, -1)}</code>;
    }

    if (piece.startsWith("*") && piece.endsWith("*")) {
      return <em key={index}>{piece.slice(1, -1)}</em>;
    }

    return <Fragment key={index}>{piece}</Fragment>;
  });
}

function RootText({ value }: { value: string }) {
  const chunks = value.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {chunks.map((chunk, chunkIndex) => {
        if (chunk.startsWith("```") && chunk.endsWith("```")) {
          const code = chunk
            .slice(3, -3)
            .replace(/^text\r?\n/i, "")
            .replace(/^\r?\n/, "")
            .replace(/\r?\n$/, "");

          return <pre key={chunkIndex}>{code}</pre>;
        }

        return chunk.split(/\r?\n/).map((line, lineIndex) => (
          <div
            className="root-line"
            key={`${chunkIndex}-${lineIndex}`}
          >
            {line ? renderInline(line) : "\u00a0"}
          </div>
        ));
      })}
    </>
  );
}

function RootChrome() {
  return (
    <div className="root-browserbar" aria-hidden="true">
      <span className="root-browser-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="root-browser-title">*@3t@mainframe</span>
    </div>
  );
}

function RootLoginScreen({
  username,
  password,
  error,
  setUsername,
  setPassword,
  submit,
}: {
  username: string;
  password: string;
  error: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="root-shell">
      <RootChrome />

      <section className="root-login">
        <div className="root-terminal-marker" aria-hidden="true">
          ▮
        </div>

        <form onSubmit={submit}>
          <div className="root-login-heading">ROOT ACCESS TERMINAL</div>
          <div className="root-login-subheading">
            AUTHORIZED INITIALIZATION NODE
          </div>

          <label>
            LOGIN
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label>
            PASSWORD
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="submit">============= ROOT =============</button>

          {error ? <p>{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default function Root() {
  const [login, setLogin] = useState<RootLogin | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [file, setFile] = useState<string | null>(null);

  const node = useMemo(() => getNode(path), [path]);
  const logicalPath = file ? [...path, file].join("/") : null;
  const record = logicalPath ? getRecord(logicalPath) : null;
  const requiredLevel = clampAuthorizationLevel(
    record?.authorization?.required_level,
  );
  const allowed = Boolean(
    login &&
      record &&
      login.level >= requiredLevel &&
      authorizationAllowed(record),
  );
  const fileImage = assetUrl(record?.image);
  const currentDirectoryImage = directoryAsset(path);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = LOGINS.find(
      (candidate) =>
        candidate.username === username.trim() &&
        candidate.password === password.trim(),
    );

    if (!found) {
      setError("AUTHENTICATION FAILURE // INVALID ROOT CREDENTIALS");
      return;
    }

    setLogin(found);
    setError("");
    setPath([]);
    setFile(null);
  }

  function openDirectory(name: string) {
    setPath((current) => [...current, name]);
    setFile(null);
  }

  function goBack() {
    if (file) {
      setFile(null);
      return;
    }

    setPath((current) => current.slice(0, -1));
  }

  function logout() {
    setLogin(null);
    setUsername("");
    setPassword("");
    setError("");
    setPath([]);
    setFile(null);
  }

  if (!login) {
    return (
      <RootLoginScreen
        username={username}
        password={password}
        error={error}
        setUsername={setUsername}
        setPassword={setPassword}
        submit={submit}
      />
    );
  }

  if (!node) {
    return (
      <main className="root-shell">
        <RootChrome />
        <section className="root-fatal">
          <div>ROOT // FILESYSTEM ERROR</div>
          <p>DIRECTORY INDEX CORRUPTED.</p>
          <button
            className="root-link"
            type="button"
            onClick={() => {
              setPath([]);
              setFile(null);
            }}
          >
            [RETURN TO ROOT]
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="root-shell">
      <RootChrome />

      <div className="root-stage">
        <div className="root-terminal-marker" aria-hidden="true">
          ▮
        </div>

        <header className="root-session">
          <span>ROOT://{path.join("/") || "MAINFRAME"}</span>
          <span>
            AUTHENTICATED // {login.name} // LEVEL {login.level}
          </span>
        </header>

        {file ? (
          <section className="root-file">
            <nav className="root-file-nav">
              <button
                className="root-link root-back"
                type="button"
                onClick={goBack}
              >
                [..] RETURN TO DIRECTORY
              </button>
            </nav>

            <div className="root-pathline">
              ROOT/{logicalPath}
            </div>

            {!record ? (
              <div className="root-denied">
                <strong>ROOT // FILE ERROR</strong>
                <br />
                REQUESTED RESOURCE COULD NOT BE LOCATED OR PARSED.
              </div>
            ) : !authorizationAllowed(record) ? (
              <div className="root-denied">
                <strong>ACCESS DENIED</strong>
                <br />
                RESOURCE AUTHORIZATION STATUS: {authorizationStatus(record)}
              </div>
            ) : login.level < requiredLevel ? (
              <div className="root-denied">
                <strong>ACCESS DENIED</strong>
                <br />
                INSUFFICIENT AUTHORIZATION LEVEL.
                <br />
                REQUIRED: LEVEL {requiredLevel}
                <br />
                SESSION: LEVEL {login.level}
              </div>
            ) : allowed ? (
              <>
                <div className="root-file-status">
                  STATUS: {authorizationStatus(record)} // LEVEL {requiredLevel}
                </div>

                {record.title ? (
                  <h1>{String(record.title)}</h1>
                ) : null}

                {record.description ? (
                  <div className="root-copy root-description">
                    <RootText value={String(record.description)} />
                  </div>
                ) : null}

                {record.embed?.description ? (
                  <div className="root-copy root-embed-description">
                    <RootText
                      value={String(record.embed.description)}
                    />
                  </div>
                ) : null}

                {fileImage ? (
                  <img
                    className="root-file-image"
                    src={fileImage}
                    alt=""
                  />
                ) : null}

                <div className="root-fields">
                  {(record.embed?.fields ?? []).map(
                    (field, index) => (
                      <article
                        className={
                          field.inline
                            ? "root-field root-field-inline"
                            : "root-field"
                        }
                        key={`${String(field.name ?? "FIELD")}-${index}`}
                      >
                        {field.name ? (
                          <h2>{String(field.name)}</h2>
                        ) : null}
                        <div className="root-copy">
                          <RootText value={String(field.value ?? "")} />
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </>
            ) : null}
          </section>
        ) : (
          <section className="root-directory">
            <div className="root-directory-head">
              <div>
                <div className="root-pathline">
                  {path.length
                    ? `ROOT DIRECTORY // ${path[path.length - 1].toLocaleUpperCase()}`
                    : "ROOT SYSTEM FILESPACE."}
                </div>

                <div className="root-directory-controls">
                  {path.length ? (
                    <button
                      className="root-link root-back"
                      type="button"
                      onClick={goBack}
                    >
                      [..] PARENT DIRECTORY
                    </button>
                  ) : (
                    <button
                      className="root-link root-back"
                      type="button"
                      onClick={logout}
                    >
                      [X] LOGOUT
                    </button>
                  )}
                </div>
              </div>

              <img
                className="root-directory-image"
                src={currentDirectoryImage}
                alt=""
              />
            </div>

            <div className="root-list" role="navigation">
              {node.directories.map((directory) => (
                <button
                  className="root-link root-dir"
                  key={directory.name}
                  type="button"
                  onClick={() => openDirectory(directory.name)}
                >
                  <span className="root-kind">[DIR]</span>{" "}
                  {directory.name}/
                </button>
              ))}

              {node.files.map((filename) => {
                const candidatePath = [...path, filename].join("/");
                const candidate = getRecord(candidatePath);
                const level = clampAuthorizationLevel(
                  candidate?.authorization?.required_level,
                );
                const statusAllowed = authorizationAllowed(candidate);
                const locked =
                  !candidate || !statusAllowed || level > login.level;

                return (
                  <button
                    className={`root-link root-entry${
                      locked ? " root-locked" : ""
                    }`}
                    key={filename}
                    type="button"
                    onClick={() => setFile(filename)}
                  >
                    <span className="root-kind">[FILE]</span>{" "}
                    {filename}
                    {!candidate ? (
                      <span className="root-lock-note"> [MISSING]</span>
                    ) : !statusAllowed ? (
                      <span className="root-lock-note"> [DENIED]</span>
                    ) : level > login.level ? (
                      <span className="root-lock-note"> [LVL {level}]</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <footer>
          BRAYTECH ROOT NETWORK // SESSION ACTIVE // AUTHORIZATION LEVEL {login.level}
        </footer>
      </div>
    </main>
  );
}
