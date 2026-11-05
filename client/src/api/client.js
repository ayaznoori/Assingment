const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.error || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export function getHealth() {
  return request("/api/health");
}

export function listRuns() {
  return request("/api/runs");
}

export function getRun(id) {
  return request(`/api/runs/${id}`);
}

/** Starts async generation; returns immediately with run id (HTTP 202). */
export async function startRun(markdown) {
  const res = await fetch(`${BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown }),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (res.status !== 202 && !res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  if (!data?._id) {
    throw new Error("Invalid server response");
  }
  return data;
}

export function updateQuestion(runId, questionId, payload) {
  return request(`/api/runs/${runId}/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function exportRun(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}/export`, { method: "POST" });
  const text = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(text);
      throw new Error(j.error || "Export failed");
    } catch {
      throw new Error(text || "Export failed");
    }
  }
  return text;
}
