import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function InvitePage() {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  // Prefill code from query string (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qsCode = params.get("code");
    if (qsCode && !code) {
      setCode(qsCode.toUpperCase());
    }
  }, [code]);

  const validateMutation = useMutation({
    mutationFn: async (inviteCode) => {
      const res = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired invite code");
      }
      return data;
    },
    onError: (e) => setError(e.message),
    onSuccess: () => {
      setError(null);
      setStep(2);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign up");
      }
      return data;
    },
    onError: (e) => setError(e.message),
    onSuccess: () => {
      setError(null);
      setStep(3);
    },
  });

  const handleValidate = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    validateMutation.mutate(code.trim().toUpperCase());
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    signupMutation.mutate({
      name,
      email,
      password,
      inviteCode: code.trim().toUpperCase(),
    });
  };

  const content = useMemo(() => {
    if (step === 1) {
      return (
        <form
          onSubmit={handleValidate}
          className="w-full max-w-[420px] mx-auto bg-[#111111] rounded-xl p-6 border border-[#222]"
        >
          <h1 className="text-white text-2xl font-semibold mb-2">
            Enter your invite code
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-4">
            You received a code from a founder. Enter it to start.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8‑CHAR CODE"
            className="w-full mb-3 px-4 py-3 rounded-md bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#8FAEA2]"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={validateMutation.isPending || !code}
            className="w-full py-3 rounded-md bg-[#8FAEA2] text-black font-semibold disabled:opacity-50"
          >
            {validateMutation.isPending ? "Checking..." : "Continue"}
          </button>
        </form>
      );
    }

    if (step === 2) {
      return (
        <form
          onSubmit={handleSignup}
          className="w-full max-w-[520px] mx-auto bg-[#111111] rounded-xl p-6 border border-[#222]"
        >
          <h1 className="text-white text-2xl font-semibold mb-1">
            Create your account
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-4">
            We'll send a verification link to your email.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 rounded-md bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#8FAEA2]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-md bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#8FAEA2]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full px-4 py-3 rounded-md bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#8FAEA2]"
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <button
            type="submit"
            disabled={signupMutation.isPending}
            className="mt-4 w-full py-3 rounded-md bg-[#8FAEA2] text-black font-semibold disabled:opacity-50"
          >
            {signupMutation.isPending ? "Creating..." : "Create account"}
          </button>

          <p className="text-[#9CA3AF] text-xs mt-3">
            Using code: <span className="text-white font-mono">{code}</span>
          </p>
        </form>
      );
    }

    return (
      <div className="w-full max-w-[520px] mx-auto bg-[#111111] rounded-xl p-6 border border-[#222]">
        <h1 className="text-white text-2xl font-semibold mb-2">
          Check your email
        </h1>
        <p className="text-[#9CA3AF] text-sm mb-4">
          We sent a verification link to{" "}
          <span className="text-white">{email}</span>. Click it to verify and
          finish setup.
        </p>
        <p className="text-[#9CA3AF] text-xs">
          After verifying, open the app to sign in and create your card.
        </p>
      </div>
    );
  }, [
    step,
    code,
    error,
    name,
    email,
    password,
    signupMutation.isPending,
    validateMutation.isPending,
  ]);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0B] flex items-center justify-center p-4">
      {content}
    </div>
  );
}
