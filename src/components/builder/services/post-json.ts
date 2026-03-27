import { AnyRecord } from "../core/types";

export async function postJson(url: string, body: AnyRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let payload: AnyRecord | null = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (payload?.error) {
      throw new Error(payload.error);
    }

    if (raw && /<!doctype html>|<html/i.test(raw)) {
      throw new Error(
        "Server API mengembalikan HTML error. Restart dev server dan bersihkan cache .next, lalu coba connect lagi."
      );
    }

    throw new Error(`Request gagal (${response.status}).`);
  }

  return payload ?? {};
}

