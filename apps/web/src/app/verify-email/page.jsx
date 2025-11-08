import React, { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to verify email");
        }
        setStatus("success");
        setMessage("Email verified! You can now sign in and create your card.");
      } catch (e) {
        console.error(e);
        setStatus("error");
        setMessage(e.message);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0B] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] mx-auto bg-[#111111] rounded-xl p-6 border border-[#222] text-center">
        <h1 className="text-white text-2xl font-semibold mb-2">Verify Email</h1>
        <p className={`text-sm mb-4 ${status === 'error' ? 'text-red-400' : 'text-[#9CA3AF]'}`}>{message}</p>
        <div className="flex gap-2 justify-center">
          <a href="/invite" className="text-[#8FAEA2] underline">Back to Invite</a>
        </div>
      </div>
    </div>
  );
}
