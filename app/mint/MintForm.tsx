"use client";

import { useState } from "react";
import { createStub } from "./actions";
import type { Deal } from "@/lib/types";

/** Shrinks a phone photo to at most 1600px wide JPEG so uploads are small and fast. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read image"))), "image/jpeg", 0.85),
  );
}

export default function MintForm({ deal }: { deal: Deal | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const small = await shrink(file);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("That photo couldn’t be read. Try a JPG or PNG.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.delete("photo_raw");
    if (photo) form.set("photo", photo, "stub.jpg");
    const result = await createStub(form); // redirects on success
    if (result?.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel">
      {deal && <input type="hidden" name="deal_id" value={deal.id} />}

      <label htmlFor="photo_raw">Stub photo</label>
      <input id="photo_raw" name="photo_raw" type="file" accept="image/*" onChange={onPhoto} />
      {preview && <img className="preview" src={preview} alt="Stub preview" />}

      <label htmlFor="event_name">Event *</label>
      <input id="event_name" name="event_name" required defaultValue={deal?.event_name} placeholder="Warriors vs. Lakers" />

      <div className="row2">
        <div>
          <label htmlFor="event_date">Date</label>
          <input id="event_date" name="event_date" type="date" defaultValue={deal?.event_date ?? ""} />
        </div>
        <div>
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" defaultValue={deal?.venue ?? ""} placeholder="Chase Center" />
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="section">Section</label>
          <input id="section" name="section" />
        </div>
        <div>
          <label htmlFor="row_label">Row</label>
          <input id="row_label" name="row_label" />
        </div>
        <div>
          <label htmlFor="seat">Seat</label>
          <input id="seat" name="seat" />
        </div>
      </div>

      <label htmlFor="went_with">Who you went with</label>
      <input id="went_with" name="went_with" placeholder="Dad, Sarah, the whole team…" />

      <label htmlFor="note">What you want to remember</label>
      <textarea id="note" name="note" maxLength={500} placeholder="The encore. The rain. The ride home." />

      {error && <div className="notice bad">{error}</div>}
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? "Minting your stub…" : "Mint it"}
      </button>
      <p className="muted small">Minting happens on a free test network during the beta. Nothing here costs or is worth money.</p>
    </form>
  );
}
