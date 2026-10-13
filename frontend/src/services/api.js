let csrfToken = "";
export class ApiError extends Error {
  constructor(message, code, fields = {}, status = 0) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}
export async function api(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Could not reach CampusFest. Check your connection and try again. If a registration was submitted, contact its organizer before resubmitting.",
      "NETWORK",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      "The server returned an unreadable response. Please try again.",
      "RESPONSE",
      {},
      response.status,
    );
  }
  if (!response.ok || !result.ok)
    throw new ApiError(
      result.error?.message || "The request could not be completed.",
      result.error?.code,
      result.error?.fieldErrors,
      response.status,
    );
  if (result.data?.csrfToken) csrfToken = result.data.csrfToken;
  return result.data;
}
export const post = (path, body = {}) => api(path, { method: "POST", body });
export function saveText(filename, content) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
