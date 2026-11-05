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

export function createRun(markdown) {
  return request("/api/runs", {
    method: "POST",
    body: JSON.stringify({ markdown }),
  });
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
