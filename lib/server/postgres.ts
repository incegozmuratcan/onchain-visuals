import "server-only";
import crypto from "crypto";
import net from "net";
import tls from "tls";

type QueryParam = string | number | boolean | null | undefined;
type Field = { name: string };

type PgState = {
  socket: net.Socket | tls.TLSSocket;
  buffer: Buffer;
  parameters: Record<string, string>;
};

export type QueryResult<T extends Record<string, any> = Record<string, any>> = {
  rows: T[];
  rowCount: number;
};

function int32(n: number) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n, 0);
  return b;
}

function cstr(value: string) {
  return Buffer.from(`${value}\0`);
}

function saslEscape(value: string) {
  return value.replace(/=/g, "=3D").replace(/,/g, "=2C");
}

function hi(password: string, salt: Buffer, iterations: number) {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}

function hmac(key: Buffer, text: string) {
  return crypto.createHmac("sha256", key).update(text).digest();
}

function sha256(input: Buffer) {
  return crypto.createHash("sha256").update(input).digest();
}

function xor(a: Buffer, b: Buffer) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

async function readMessage(state: PgState): Promise<{ type: string; body: Buffer }> {
  while (state.buffer.length < 5) state.buffer = Buffer.concat([state.buffer, await readChunk(state.socket)]);
  const type = state.buffer.subarray(0, 1).toString("utf8");
  const length = state.buffer.readInt32BE(1);
  while (state.buffer.length < 1 + length) state.buffer = Buffer.concat([state.buffer, await readChunk(state.socket)]);
  const body = state.buffer.subarray(5, 1 + length);
  state.buffer = state.buffer.subarray(1 + length);
  return { type, body };
}

function readChunk(socket: net.Socket | tls.TLSSocket): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => cleanup(() => resolve(chunk));
    const onError = (error: Error) => cleanup(() => reject(error));
    const onEnd = () => cleanup(() => reject(new Error("Postgres connection ended unexpectedly")));
    const cleanup = (done: () => void) => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("end", onEnd);
      done();
    };
    socket.once("data", onData);
    socket.once("error", onError);
    socket.once("end", onEnd);
  });
}

function send(socket: net.Socket | tls.TLSSocket, type: string | null, body: Buffer) {
  const length = int32(body.length + 4);
  socket.write(type ? Buffer.concat([Buffer.from(type), length, body]) : Buffer.concat([length, body]));
}

function parseError(body: Buffer) {
  const text = body.toString("utf8");
  const message = text.match(/M([^\0]+)/)?.[1] ?? text;
  return new Error(`Postgres error: ${message}`);
}

function parseSasl(text: string) {
  return Object.fromEntries(text.split(",").map((part) => [part.slice(0, 1), part.slice(2)]));
}

async function connect() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "");
  const host = url.hostname;
  const port = Number(url.port || 5432);
  const ssl = url.searchParams.get("sslmode") !== "disable";
  const rawSocket = await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect({ host, port }, () => resolve(socket));
    socket.once("error", reject);
  });

  let socket: net.Socket | tls.TLSSocket = rawSocket;
  if (ssl) {
    rawSocket.write(Buffer.concat([int32(8), int32(80877103)]));
    const answer = await readChunk(rawSocket);
    if (answer.subarray(0, 1).toString("utf8") !== "S") throw new Error("Postgres server refused SSL");
    socket = tls.connect({ socket: rawSocket, servername: host });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
  }

  const state: PgState = { socket, buffer: Buffer.alloc(0), parameters: {} };
  const startupPairs = ["user", user, "database", database, "client_encoding", "UTF8"];
  send(socket, null, Buffer.concat([int32(196608), ...startupPairs.flatMap((pair) => [cstr(pair)]), Buffer.from("\0")]));

  let clientFirstBare = "";
  let serverFirst = "";
  const nonce = crypto.randomBytes(18).toString("base64");

  while (true) {
    const msg = await readMessage(state);
    if (msg.type === "R") {
      const code = msg.body.readInt32BE(0);
      if (code === 0) continue;
      if (code === 3) send(socket, "p", cstr(password));
      else if (code === 5) {
        const salt = msg.body.subarray(4, 8);
        const digest = crypto.createHash("md5").update(Buffer.concat([Buffer.from(password + user), salt])).digest("hex");
        send(socket, "p", cstr(`md5${digest}`));
      } else if (code === 10) {
        clientFirstBare = `n=${saslEscape(user)},r=${nonce}`;
        const payload = Buffer.from(`SCRAM-SHA-256\0\0\0\0${"n,,"}${clientFirstBare}`);
        payload.writeInt32BE(Buffer.byteLength(`n,,${clientFirstBare}`), "SCRAM-SHA-256\0".length);
        send(socket, "p", payload);
      } else if (code === 11) {
        serverFirst = msg.body.subarray(4).toString("utf8");
        const attrs = parseSasl(serverFirst);
        const saltedPassword = hi(password, Buffer.from(attrs.s, "base64"), Number(attrs.i));
        const clientKey = hmac(saltedPassword, "Client Key");
        const storedKey = sha256(clientKey);
        const clientFinalWithoutProof = `c=biws,r=${attrs.r}`;
        const authMessage = `${clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
        const proof = xor(clientKey, hmac(storedKey, authMessage)).toString("base64");
        send(socket, "p", Buffer.from(`${clientFinalWithoutProof},p=${proof}`));
      } else if (code === 12) continue;
      else throw new Error(`Unsupported Postgres authentication method: ${code}`);
    } else if (msg.type === "S") {
      const parts = msg.body.toString("utf8").split("\0");
      state.parameters[parts[0]] = parts[1];
    } else if (msg.type === "E") throw parseError(msg.body);
    else if (msg.type === "Z") return state;
  }
}

function sqlValue(value: QueryParam) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function interpolate(text: string, params: QueryParam[]) {
  return text.replace(/\$(\d+)/g, (_, index) => sqlValue(params[Number(index) - 1]));
}

function readCString(body: Buffer, offset: number) {
  const end = body.indexOf(0, offset);
  return { value: body.subarray(offset, end).toString("utf8"), offset: end + 1 };
}

export async function query<T extends Record<string, any> = Record<string, any>>(text: string, params: QueryParam[] = []): Promise<QueryResult<T>> {
  const state = await connect();
  if (!state) return { rows: [], rowCount: 0 };
  const rows: T[] = [];
  let fields: Field[] = [];
  let rowCount = 0;
  try {
    send(state.socket, "Q", cstr(interpolate(text, params)));
    while (true) {
      const msg = await readMessage(state);
      if (msg.type === "T") {
        const count = msg.body.readInt16BE(0);
        fields = [];
        let offset = 2;
        for (let i = 0; i < count; i += 1) {
          const name = readCString(msg.body, offset);
          fields.push({ name: name.value });
          offset = name.offset + 18;
        }
      } else if (msg.type === "D") {
        const count = msg.body.readInt16BE(0);
        let offset = 2;
        const row: Record<string, any> = {};
        for (let i = 0; i < count; i += 1) {
          const len = msg.body.readInt32BE(offset);
          offset += 4;
          row[fields[i]?.name ?? String(i)] = len === -1 ? null : msg.body.subarray(offset, offset + len).toString("utf8");
          if (len > -1) offset += len;
        }
        rows.push(row as T);
      } else if (msg.type === "C") {
        const command = msg.body.toString("utf8");
        rowCount = Number(command.trim().split(" ").at(-1)) || rows.length;
      } else if (msg.type === "E") throw parseError(msg.body);
      else if (msg.type === "Z") return { rows, rowCount };
    }
  } finally {
    state.socket.end();
  }
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}
