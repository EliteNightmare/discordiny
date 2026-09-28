import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import "./Root.css";
import { ROOT_FILES, ROOT_LAYOUT } from "./rootData";

const API = "https://discordiny.com";
const TERMINAL_URL = "https://terminal.discordiny.com/";
const HOME_URL = "https://discordiny.com/";

const ROOT_ASSET_MODULES = import.meta.glob(
  "../assets/root/**/*.{png,jpg,jpeg,gif,webp,svg}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

type NavNode = {
  directories: readonly { name: string; node: NavNode }[];
  files: readonly string[];
};

type MutableNavNode = {
  directories: { name: string; node: MutableNavNode }[];
  files: string[];
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
  images?: unknown[];
  authorization?: {
    required_level?: unknown;
    status?: unknown;
  };
  embed?: {
    description?: unknown;
    fields?: RootField[];
  };
};

type AccountUser = {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

type RootStatus = {
  authenticated: boolean;
  isAdmin: boolean;
  savedAuthorizationLevel: number;
  user?: AccountUser;
};

type DynamicDirectory = {
  id: number;
  path: string;
};

type DynamicFile = {
  id: number;
  directory_path: string;
  filename: string;
  title: string;
  description: string;
  embed_description: string;
  authorization_level: number;
  authorization_status: string;
  fields_json: string;
  images_json: string;
};

type AdminDraft = {
  id: number | null;
  directoryPath: string;
  filename: string;
  title: string;
  description: string;
  embedDescription: string;
  authorizationLevel: number;
  authorizationStatus: string;
  fieldsText: string;
  imagesText: string;
};

const LOGINS: RootLogin[] = [
  { name: "ADMIN", username: "admin", password: "admin", level: 1 },
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

const EMPTY_DRAFT: AdminDraft = {
  id: null,
  directoryPath: "",
  filename: "",
  title: "",
  description: "",
  embedDescription: "",
  authorizationLevel: 1,
  authorizationStatus: "AUTHORIZED",
  fieldsText: "[]",
  imagesText: "",
};

function cloneNode(node: NavNode): MutableNavNode {
  return {
    directories: node.directories.map((entry) => ({
      name: entry.name,
      node: cloneNode(entry.node),
    })),
    files: [...node.files],
  };
}

function ensureDirectory(root: MutableNavNode, path: string) {
  let node = root;
  const parts = path.split("/").filter(Boolean);

  for (const part of parts) {
    let entry = node.directories.find((item) => item.name === part);
    if (!entry) {
      entry = {
        name: part,
        node: { directories: [], files: [] },
      };
      node.directories.push(entry);
    }
    node = entry.node;
  }

  return node;
}

function buildRuntimeTree(
  directories: DynamicDirectory[],
  files: DynamicFile[],
) {
  const root = cloneNode(ROOT_LAYOUT as unknown as NavNode);

  for (const directory of directories) {
    ensureDirectory(root, directory.path);
  }

  for (const file of files) {
    const node = ensureDirectory(root, file.directory_path);
    if (!node.files.includes(file.filename)) {
      node.files.push(file.filename);
    }
  }

  return root;
}


function getStaticNode(parts: string[]): NavNode | null {
  let node = ROOT_LAYOUT as unknown as NavNode;

  for (const part of parts) {
    const next = node.directories.find(
      (directory) => directory.name === part,
    );
    if (!next) return null;
    node = next.node;
  }

  return node;
}

function rootRecordToDraft(
  logicalPath: string,
  record: RootRecord,
): AdminDraft {
  const parts = logicalPath.split("/");
  const filename = parts.pop() ?? "";
  const directoryPath = parts.join("/");

  const imageValues: unknown[] = [];
  if (record.image) imageValues.push(record.image);
  if (Array.isArray(record.images)) imageValues.push(...record.images);

  if (
    logicalPath === "PERSONNEL/C.-BRAY-I.id" &&
    !imageValues.some(
      (value) =>
        normalizeRootAssetPath(value)?.toLocaleLowerCase() ===
        "clovisbarcode.png",
    )
  ) {
    imageValues.push("clovisbarcode.png");
  }

  return {
    id: null,
    directoryPath,
    filename,
    title: String(record.title ?? ""),
    description: String(record.description ?? ""),
    embedDescription: String(record.embed?.description ?? ""),
    authorizationLevel: clampAuthorizationLevel(
      record.authorization?.required_level,
    ),
    authorizationStatus: authorizationStatus(record),
    fieldsText: JSON.stringify(record.embed?.fields ?? [], null, 2),
    imagesText: imageValues
      .map((value) => normalizeRootAssetPath(value))
      .filter((value): value is string => Boolean(value))
      .join("\\n"),
  };
}

function getNode(root: NavNode, parts: string[]): NavNode | null {
  let node = root;
  for (const part of parts) {
    const next = node.directories.find((directory) => directory.name === part);
    if (!next) return null;
    node = next.node;
  }
  return node;
}

function normalizeLookupKey(value: string) {
  return value.replace(/#U26a0#Ufe0f/g, "⚠️").toLocaleLowerCase();
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dynamicRecord(file: DynamicFile): RootRecord {
  const images = parseJsonArray(file.images_json);
  return {
    title: file.title,
    description: file.description,
    images,
    authorization: {
      required_level: file.authorization_level,
      status: file.authorization_status,
    },
    embed: {
      description: file.embed_description,
      fields: parseJsonArray(file.fields_json) as RootField[],
    },
  };
}

function getRecord(
  path: string,
  dynamicFiles: DynamicFile[],
): RootRecord | null {
  const normalized = normalizeLookupKey(path);
  const live = dynamicFiles.find(
    (file) =>
      normalizeLookupKey(
        [file.directory_path, file.filename].filter(Boolean).join("/"),
      ) === normalized,
  );

  if (live) return dynamicRecord(live);

  const exact = ROOT_FILES[path] as RootRecord | undefined;
  if (exact) return exact;

  const matchingKey = Object.keys(ROOT_FILES).find(
    (candidate) => normalizeLookupKey(candidate) === normalized,
  );

  return matchingKey ? (ROOT_FILES[matchingKey] as RootRecord) : null;
}

function clampAuthorizationLevel(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(3, Math.trunc(value)));
  }
  const digits = String(value ?? "1").match(/\d+/)?.[0];
  return Math.max(1, Math.min(3, Number.parseInt(digits ?? "1", 10) || 1));
}

function authorizationStatus(record: RootRecord | null) {
  return String(record?.authorization?.status ?? "AUTHORIZED").trim() ||
    "AUTHORIZED";
}

function authorizationAllowed(record: RootRecord | null) {
  return !DENIED_STATUSES.has(
    authorizationStatus(record).toLocaleLowerCase(),
  );
}

function normalizeRootAssetPath(value: unknown) {
  if (!value) return null;

  let normalized = String(value)
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!normalized) return null;

  const lower = normalized.toLocaleLowerCase();
  const discordinyMarker = "discordiny/assets/root/";
  const discordinyIndex = lower.indexOf(discordinyMarker);

  if (discordinyIndex >= 0) {
    normalized = normalized.slice(
      discordinyIndex + discordinyMarker.length,
    );
  } else {
    const rootMarker = "assets/root/";
    const rootIndex = lower.indexOf(rootMarker);
    if (rootIndex >= 0) {
      normalized = normalized.slice(rootIndex + rootMarker.length);
    }
  }

  return normalized.replace(/^\/+/, "");
}

function assetUrl(value: unknown) {
  const relativePath = normalizeRootAssetPath(value);
  if (!relativePath) return null;

  const wanted = `../assets/root/${relativePath}`.toLocaleLowerCase();
  const key = Object.keys(ROOT_ASSET_MODULES).find(
    (candidate) => candidate.toLocaleLowerCase() === wanted,
  );

  return key ? ROOT_ASSET_MODULES[key] : null;
}

function recordImages(record: RootRecord | null, logicalPath: string | null) {
  const values: unknown[] = [];

  if (record?.image) values.push(record.image);
  if (Array.isArray(record?.images)) values.push(...record.images);

  if (logicalPath === "PERSONNEL/C.-BRAY-I.id") {
    values.push("clovisbarcode.png");
  }

  return values
    .map(assetUrl)
    .filter((value): value is string => Boolean(value));
}

function renderInline(value: string): ReactNode[] {
  const pattern =
    /(\|\|[^|]+\|\||\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*)/g;

  return value.split(pattern).map((piece, index) => {
    if (piece.startsWith("||") && piece.endsWith("||")) {
      return <span className="root-spoiler" key={index}>{piece.slice(2, -2)}</span>;
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
          <div className="root-line" key={`${chunkIndex}-${lineIndex}`}>
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
      <span className="root-browser-dots"><i /><i /><i /></span>
      <span className="root-browser-title">*@3t@mainframe</span>
    </div>
  );
}

function RootNoise() {
  const rows = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const seed = (index * 7919 + 31337).toString(16).toUpperCase();
        return `${index % 3 === 0 ? "BRAY://" : "0x"}${seed} :: ${
          index % 4 === 0 ? "SIVA.NODE" : index % 4 === 1 ? "MEMORY" : index % 4 === 2 ? "AUTH" : "PACKET"
        } // ${((index * 73) % 997).toString().padStart(3, "0")}`;
      }),
    [],
  );

  return (
    <div className="root-noise" aria-hidden="true">
      <div>{rows.map((row, index) => <span key={index}>{row}</span>)}</div>
    </div>
  );
}

function avatarUrl(user: AccountUser) {
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=64`
    : null;
}

function RootTopActions({
  status,
  onAdmin,
}: {
  status: RootStatus;
  onAdmin: () => void;
}) {
  const user = status.user;
  const avatar = user ? avatarUrl(user) : null;

  return (
    <div className="root-top-actions">
      {status.isAdmin ? (
        <button type="button" onClick={onAdmin}>ROOT ADMIN</button>
      ) : null}
      <a href={TERMINAL_URL}>TERMINAL</a>
      <a href={HOME_URL}>DISCORDINY</a>

      {status.authenticated && user ? (
        <a className="root-account" href={`${API}/account`}>
          {avatar ? <img src={avatar} alt="" /> : null}
          <span>{user.global_name || user.username || "Account"}</span>
        </a>
      ) : (
        <a className="root-account" href={`${API}/api/auth/login`}>
          ACCOUNT LOGIN
        </a>
      )}
    </div>
  );
}

function FilePreview({
  record,
  logicalPath,
}: {
  record: RootRecord;
  logicalPath: string;
}) {
  const images = recordImages(record, logicalPath);

  return (
    <div className="root-preview-body">
      <div className="root-file-status">
        STATUS: {authorizationStatus(record)} // LEVEL{" "}
        {clampAuthorizationLevel(record.authorization?.required_level)}
      </div>

      {record.title ? <h1>{String(record.title)}</h1> : null}

      {record.description ? (
        <div className="root-copy root-description">
          <RootText value={String(record.description)} />
        </div>
      ) : null}

      {record.embed?.description ? (
        <div className="root-copy root-embed-description">
          <RootText value={String(record.embed.description)} />
        </div>
      ) : null}

      {images.map((src, index) => (
        <img
          className="root-file-image"
          src={src}
          alt=""
          draggable
          key={`${src}-${index}`}
        />
      ))}

      <div className="root-fields">
        {(record.embed?.fields ?? []).map((field, index) => (
          <article
            className={field.inline ? "root-field root-field-inline" : "root-field"}
            key={`${String(field.name ?? "FIELD")}-${index}`}
          >
            {field.name ? <h2>{String(field.name)}</h2> : null}
            <div className="root-copy">
              <RootText value={String(field.value ?? "")} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({
  directories,
  files,
  reload,
  close,
}: {
  directories: DynamicDirectory[];
  files: DynamicFile[];
  reload: () => Promise<void>;
  close: () => void;
}) {
  const [selectedPath, setSelectedPath] = useState("");
  const [draft, setDraft] = useState<AdminDraft>(EMPTY_DRAFT);
  const [newDirectory, setNewDirectory] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(true);

  const childDirectories = useMemo(() => {
    const prefix = selectedPath ? `${selectedPath}/` : "";
    const names = new Set<string>();

    const staticNode = getStaticNode(
      selectedPath.split("/").filter(Boolean),
    );

    for (const directory of staticNode?.directories ?? []) {
      names.add(directory.name);
    }

    for (const row of directories) {
      if (!row.path.startsWith(prefix)) continue;
      const rest = row.path.slice(prefix.length);
      if (rest && !rest.includes("/")) names.add(rest);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [directories, selectedPath]);

  const childFiles = useMemo(() => {
    const staticNode = getStaticNode(
      selectedPath.split("/").filter(Boolean),
    );

    const names = new Set<string>(staticNode?.files ?? []);
    for (const file of files) {
      if (file.directory_path === selectedPath) {
        names.add(file.filename);
      }
    }

    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((filename) => {
        const live = files.find(
          (file) =>
            file.directory_path === selectedPath &&
            file.filename === filename,
        );

        return {
          filename,
          live: live ?? null,
          isStatic: Boolean(
            staticNode?.files.includes(filename),
          ),
        };
      });
  }, [files, selectedPath]);

  const previewRecord = useMemo<RootRecord>(() => {
    let fields: RootField[] = [];
    try {
      const parsed = JSON.parse(draft.fieldsText || "[]");
      if (Array.isArray(parsed)) fields = parsed;
    } catch {
      fields = [];
    }

    const images = draft.imagesText
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      title: draft.title,
      description: draft.description,
      images,
      authorization: {
        required_level: draft.authorizationLevel,
        status: draft.authorizationStatus,
      },
      embed: {
        description: draft.embedDescription,
        fields,
      },
    };
  }, [draft]);

  function editFile(file: DynamicFile) {
    setDraft({
      id: file.id,
      directoryPath: file.directory_path,
      filename: file.filename,
      title: file.title,
      description: file.description,
      embedDescription: file.embed_description,
      authorizationLevel: file.authorization_level,
      authorizationStatus: file.authorization_status,
      fieldsText: JSON.stringify(parseJsonArray(file.fields_json), null, 2),
      imagesText: parseJsonArray(file.images_json).map(String).join("\n"),
    });
    setPreview(true);
    setMessage("");
  }


  function editExplorerFile(entry: {
    filename: string;
    live: DynamicFile | null;
    isStatic: boolean;
  }) {
    if (entry.live) {
      editFile(entry.live);
      return;
    }

    const logicalPath = [selectedPath, entry.filename]
      .filter(Boolean)
      .join("/");
    const record = getRecord(logicalPath, []);

    if (!record) {
      setMessage(`STATIC FILE COULD NOT BE LOADED // ${logicalPath}`);
      return;
    }

    setDraft(rootRecordToDraft(logicalPath, record));
    setPreview(true);
    setMessage(
      "STATIC ROOT FILE LOADED // SAVE TO CREATE AN EDITABLE LIVE OVERRIDE",
    );
  }

  async function request(path: string, init: RequestInit) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "ROOT ADMIN REQUEST FAILED");
    }
    return data;
  }

  async function createDirectory() {
    const name = newDirectory.trim();
    if (!name) return;
    const path = [selectedPath, name].filter(Boolean).join("/");

    try {
      await request("/api/root/admin/directories", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      setNewDirectory("");
      setMessage(`DIRECTORY CREATED // ${path}`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DIRECTORY CREATE FAILED");
    }
  }

  async function deleteCurrentDirectory() {
    if (!selectedPath) return;
    if (!window.confirm(`Delete ${selectedPath} and all live files below it?`)) return;

    try {
      await request("/api/root/admin/directories", {
        method: "DELETE",
        body: JSON.stringify({ path: selectedPath }),
      });
      const parent = selectedPath.split("/").slice(0, -1).join("/");
      setSelectedPath(parent);
      setDraft(EMPTY_DRAFT);
      setMessage("DIRECTORY DELETED");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DIRECTORY DELETE FAILED");
    }
  }

  async function saveFile() {
    let fields: unknown[] = [];
    try {
      const parsed = JSON.parse(draft.fieldsText || "[]");
      if (!Array.isArray(parsed)) throw new Error();
      fields = parsed;
    } catch {
      setMessage("FIELDS MUST BE A VALID JSON ARRAY");
      return;
    }

    const payload = {
      directoryPath: draft.directoryPath,
      filename: draft.filename,
      title: draft.title,
      description: draft.description,
      embedDescription: draft.embedDescription,
      authorizationLevel: draft.authorizationLevel,
      authorizationStatus: draft.authorizationStatus,
      fields,
      images: draft.imagesText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    };

    try {
      await request(
        draft.id
          ? `/api/root/admin/files/${draft.id}`
          : "/api/root/admin/files",
        {
          method: draft.id ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setMessage(
        draft.id
          ? "FILE UPDATED"
          : "FILE SAVED // LIVE OVERRIDE NOW ACTIVE",
      );
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "FILE SAVE FAILED");
    }
  }

  async function deleteFile() {
    if (!draft.id) return;
    if (!window.confirm(`Delete ${draft.filename}?`)) return;

    try {
      await request(`/api/root/admin/files/${draft.id}`, {
        method: "DELETE",
      });
      setDraft(EMPTY_DRAFT);
      setMessage("FILE DELETED");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "FILE DELETE FAILED");
    }
  }

  const previewPath = [draft.directoryPath, draft.filename]
    .filter(Boolean)
    .join("/");

  return (
    <div className="root-admin-overlay">
      <section className="root-admin">
        <header>
          <div>
            <strong>ROOT ADMIN // FILESYSTEM EDITOR</strong>
            <span>
              DISCORDINY USER ID 1 // STATIC + LIVE ROOT FILESYSTEM
            </span>
          </div>
          <button type="button" onClick={close}>[CLOSE]</button>
        </header>

        <div className="root-admin-grid">
          <aside className="root-admin-explorer">
            <div className="root-admin-path">
              ROOT/{selectedPath || ""}
            </div>

            {selectedPath ? (
              <button
                type="button"
                onClick={() =>
                  setSelectedPath(
                    selectedPath.split("/").slice(0, -1).join("/"),
                  )
                }
              >
                [..] PARENT
              </button>
            ) : null}

            {childDirectories.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() =>
                  setSelectedPath(
                    [selectedPath, name].filter(Boolean).join("/"),
                  )
                }
              >
                [DIR] {name}/
              </button>
            ))}

            {childFiles.map((entry) => (
              <button
                type="button"
                key={entry.filename}
                onClick={() => editExplorerFile(entry)}
              >
                [FILE] {entry.filename}
                {entry.live
                  ? " [LIVE]"
                  : entry.isStatic
                    ? " [STATIC]"
                    : ""}
              </button>
            ))}

            <div className="root-admin-create-dir">
              <input
                value={newDirectory}
                onChange={(event) => setNewDirectory(event.target.value)}
                placeholder="new_directory"
              />
              <button type="button" onClick={createDirectory}>+ DIR</button>
            </div>

            {selectedPath ? (
              <button
                className="root-admin-danger"
                type="button"
                onClick={deleteCurrentDirectory}
              >
                DELETE CURRENT DIRECTORY
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...EMPTY_DRAFT,
                  directoryPath: selectedPath,
                })
              }
            >
              + NEW FILE HERE
            </button>
          </aside>

          <section className="root-admin-editor">
            <div className="root-admin-editor-head">
              <strong>{draft.id ? `EDIT FILE #${draft.id}` : "NEW FILE"}</strong>
              <button type="button" onClick={() => setPreview((value) => !value)}>
                {preview ? "HIDE PREVIEW" : "SHOW PREVIEW"}
              </button>
            </div>

            <div className="root-admin-form">
              <label>
                DIRECTORY PATH
                <input
                  value={draft.directoryPath}
                  onChange={(event) =>
                    setDraft({ ...draft, directoryPath: event.target.value })
                  }
                  placeholder="PERSONNEL or FACILITIES/EUROPA"
                />
              </label>

              <label>
                FILENAME
                <input
                  value={draft.filename}
                  onChange={(event) =>
                    setDraft({ ...draft, filename: event.target.value })
                  }
                  placeholder="new_file.txt"
                />
              </label>

              <label>
                TITLE
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </label>

              <div className="root-admin-row">
                <label>
                  AUTHORIZATION LEVEL
                  <select
                    value={draft.authorizationLevel}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        authorizationLevel: Number(event.target.value),
                      })
                    }
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>

                <label>
                  AUTHORIZATION STATUS
                  <input
                    value={draft.authorizationStatus}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        authorizationStatus: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                DESCRIPTION
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  rows={6}
                />
              </label>

              <label>
                EMBED DESCRIPTION
                <textarea
                  value={draft.embedDescription}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      embedDescription: event.target.value,
                    })
                  }
                  rows={5}
                />
              </label>

              <label>
                FIELDS JSON
                <textarea
                  value={draft.fieldsText}
                  onChange={(event) =>
                    setDraft({ ...draft, fieldsText: event.target.value })
                  }
                  rows={8}
                  spellCheck={false}
                  placeholder='[{"name":"FIELD","value":"TEXT","inline":false}]'
                />
              </label>

              <label>
                IMAGE PATHS — ONE PER LINE
                <textarea
                  value={draft.imagesText}
                  onChange={(event) =>
                    setDraft({ ...draft, imagesText: event.target.value })
                  }
                  rows={5}
                  spellCheck={false}
                  placeholder={"ids/clovisbrayI.png\nclovisbarcode.png"}
                />
                <small>
                  Paths resolve from src/react-app/assets/root/. Use ids/name.png
                  or name.png. Images remain normal browser images and can be
                  right-clicked/saved.
                </small>
              </label>

              <div className="root-admin-actions">
                <button type="button" onClick={saveFile}>
                  {draft.id ? "SAVE CHANGES" : "CREATE FILE"}
                </button>
                {draft.id ? (
                  <button
                    className="root-admin-danger"
                    type="button"
                    onClick={deleteFile}
                  >
                    DELETE FILE
                  </button>
                ) : null}
              </div>

              {message ? <div className="root-admin-message">{message}</div> : null}
            </div>
          </section>

          {preview ? (
            <section className="root-admin-preview root-file">
              <div className="root-pathline">
                PREVIEW // ROOT/{previewPath || "UNTITLED"}
              </div>
              <FilePreview
                record={previewRecord}
                logicalPath={previewPath}
              />
            </section>
          ) : null}
        </div>
      </section>
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
  status,
  onAdmin,
  onResume,
}: {
  username: string;
  password: string;
  error: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  status: RootStatus;
  onAdmin: () => void;
  onResume: () => void | Promise<void>;
}) {
  return (
    <main className="root-shell">
      <RootChrome />
      <RootTopActions status={status} onAdmin={onAdmin} />
      <RootNoise />

      <section className="root-login">
        <div className="root-terminal-marker" aria-hidden="true">▮</div>

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

          {status.authenticated && status.savedAuthorizationLevel > 0 ? (
            <button
              className="root-resume"
              type="button"
              onClick={onResume}
            >
              [ INSTANT LOGIN // AUTHORIZATION LEVEL{" "}
              {status.savedAuthorizationLevel} ]
            </button>
          ) : null}

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
  const [status, setStatus] = useState<RootStatus>({
    authenticated: false,
    isAdmin: false,
    savedAuthorizationLevel: 0,
  });
  const [directories, setDirectories] = useState<DynamicDirectory[]>([]);
  const [dynamicFiles, setDynamicFiles] = useState<DynamicFile[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);

  const reloadLiveContent = useCallback(async () => {
    const response = await fetch(`${API}/api/root/content`, {
      credentials: "include",
    });

    if (!response.ok) return;
    const data = await response.json();

    setDirectories(Array.isArray(data.directories) ? data.directories : []);
    setDynamicFiles(Array.isArray(data.files) ? data.files : []);
  }, []);

  useEffect(() => {
    void reloadLiveContent();

    void fetch(`${API}/api/root/status`, {
      credentials: "include",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        setStatus({
          authenticated: Boolean(data.authenticated),
          isAdmin: Boolean(data.isAdmin),
          savedAuthorizationLevel: Math.max(
            0,
            Math.min(3, Number(data.savedAuthorizationLevel) || 0),
          ),
          user: data.user,
        });
      })
      .catch(() => {
        setStatus({
          authenticated: false,
          isAdmin: false,
          savedAuthorizationLevel: 0,
        });
      });
  }, [reloadLiveContent]);

  const runtimeTree = useMemo(
    () => buildRuntimeTree(directories, dynamicFiles),
    [directories, dynamicFiles],
  );

  const node = useMemo(
    () => getNode(runtimeTree, path),
    [runtimeTree, path],
  );

  const logicalPath = file ? [...path, file].join("/") : null;
  const record = logicalPath
    ? getRecord(logicalPath, dynamicFiles)
    : null;
  const requiredLevel = clampAuthorizationLevel(
    record?.authorization?.required_level,
  );
  const allowed = Boolean(
    login &&
      record &&
      login.level >= requiredLevel &&
      authorizationAllowed(record),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!status.authenticated) {
      setError("DISCORDINY ACCOUNT LOGIN REQUIRED BEFORE ROOT AUTHORIZATION");
      return;
    }

    try {
      const response = await fetch(`${API}/api/root/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "AUTHENTICATION FAILURE // INVALID ROOT CREDENTIALS",
        );
        return;
      }

      const level = Math.max(
        1,
        Math.min(3, Number(data.authorizationLevel) || 1),
      );

      const found =
        LOGINS.find((candidate) => candidate.level === level) ??
        LOGINS[0];

      setLogin({
        ...found,
        name: String(data.name || found.name),
        level,
      });

      setStatus((current) => ({
        ...current,
        savedAuthorizationLevel: Math.max(
          current.savedAuthorizationLevel,
          Number(data.savedAuthorizationLevel) || level,
        ),
      }));

      setPath([]);
      setFile(null);
    } catch {
      setError("ROOT AUTHORIZATION SERVICE UNAVAILABLE");
    }
  }

  async function resumeSavedAuthorization() {
    setError("");

    try {
      const response = await fetch(`${API}/api/root/resume`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setError(data.error || "SAVED ROOT AUTHORIZATION UNAVAILABLE");
        return;
      }

      const level = Math.max(
        1,
        Math.min(3, Number(data.authorizationLevel) || 1),
      );

      const found =
        LOGINS.find((candidate) => candidate.level === level) ??
        LOGINS[0];

      setLogin({
        ...found,
        name: String(data.name || found.name),
        level,
      });

      setPath([]);
      setFile(null);
    } catch {
      setError("ROOT AUTHORIZATION SERVICE UNAVAILABLE");
    }
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

  const openAdmin = () => {
    if (status.isAdmin) setAdminOpen(true);
  };

  if (!login) {
    return (
      <>
        <RootLoginScreen
          username={username}
          password={password}
          error={error}
          setUsername={setUsername}
          setPassword={setPassword}
          submit={submit}
          status={status}
          onAdmin={openAdmin}
          onResume={resumeSavedAuthorization}
        />
        {adminOpen && status.isAdmin ? (
          <AdminPanel
            directories={directories}
            files={dynamicFiles}
            reload={reloadLiveContent}
            close={() => setAdminOpen(false)}
          />
        ) : null}
      </>
    );
  }

  if (!node) {
    return (
      <main className="root-shell">
        <RootChrome />
        <RootTopActions status={status} onAdmin={openAdmin} />
        <RootNoise />
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
      <RootTopActions status={status} onAdmin={openAdmin} />
      <RootNoise />

      <div className="root-stage">
        <div className="root-terminal-marker" aria-hidden="true">▮</div>

        <header className="root-session">
          <span>ROOT://{path.join("/") || "MAINFRAME"}</span>
          <span>AUTHENTICATED // {login.name} // LEVEL {login.level}</span>
        </header>

        {file ? (
          <section className="root-file">
            <nav className="root-file-nav">
              <button className="root-link root-back" type="button" onClick={goBack}>
                [..] RETURN TO DIRECTORY
              </button>
            </nav>

            <div className="root-pathline">ROOT/{logicalPath}</div>

            {!record ? (
              <div className="root-denied">
                <strong>ROOT // FILE ERROR</strong><br />
                REQUESTED RESOURCE COULD NOT BE LOCATED OR PARSED.
              </div>
            ) : !authorizationAllowed(record) ? (
              <div className="root-denied">
                <strong>ACCESS DENIED</strong><br />
                RESOURCE AUTHORIZATION STATUS: {authorizationStatus(record)}
              </div>
            ) : login.level < requiredLevel ? (
              <div className="root-denied">
                <strong>ACCESS DENIED</strong><br />
                INSUFFICIENT AUTHORIZATION LEVEL.<br />
                REQUIRED: LEVEL {requiredLevel}<br />
                SESSION: LEVEL {login.level}
              </div>
            ) : allowed ? (
              <FilePreview record={record} logicalPath={logicalPath ?? ""} />
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
                    <button className="root-link root-back" type="button" onClick={goBack}>
                      [..] PARENT DIRECTORY
                    </button>
                  ) : (
                    <button className="root-link root-back" type="button" onClick={logout}>
                      [X] LOGOUT
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="root-list" role="navigation">
              {node.directories.map((directory) => (
                <button
                  className="root-link root-dir"
                  key={directory.name}
                  type="button"
                  onClick={() => openDirectory(directory.name)}
                >
                  <span className="root-kind">[DIR]</span> {directory.name}/
                </button>
              ))}

              {node.files.map((filename) => {
                const candidatePath = [...path, filename].join("/");
                const candidate = getRecord(candidatePath, dynamicFiles);
                const level = clampAuthorizationLevel(
                  candidate?.authorization?.required_level,
                );
                const statusAllowed = authorizationAllowed(candidate);
                const locked =
                  !candidate || !statusAllowed || level > login.level;

                return (
                  <button
                    className={`root-link root-entry${locked ? " root-locked" : ""}`}
                    key={filename}
                    type="button"
                    onClick={() => setFile(filename)}
                  >
                    <span className="root-kind">[FILE]</span> {filename}
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

      {adminOpen && status.isAdmin ? (
        <AdminPanel
          directories={directories}
          files={dynamicFiles}
          reload={reloadLiveContent}
          close={() => setAdminOpen(false)}
        />
      ) : null}
    </main>
  );
}
