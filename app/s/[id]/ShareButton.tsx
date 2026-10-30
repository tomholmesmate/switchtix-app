"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} · SwitchTix`, text: "I was there.", url });
        return;
      } catch {
        // user closed the share sheet; fall back to copying
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="btn" onClick={share} type="button">
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
