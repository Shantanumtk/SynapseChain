// Thin wrapper around the FastAPI backend
const BASE = "/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function upload(path, formData) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export const api = {
  evaluateNFT:      (body) => post("/nft/evaluate", body),
  negotiateLicense: (body) => post("/license/negotiate", body),
  revokeLicense:    (body) => post("/license/revoke", body),
  matchBounty:      (body) => post("/bounty/match", body),
  agentStatus:      ()     => get("/agent/status"),
  health:           ()     => get("/health"),
  uploadFile:       (fd)   => upload("/nft/upload", fd),
};
