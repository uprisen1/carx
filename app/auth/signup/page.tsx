"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/supabase/types";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // The profile row is created by a database trigger using this metadata
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Something went wrong.");
      return;
    }

    // If email confirmation is on, there's no session until they confirm
    if (!data.session) {
      setNotice("Account created. Check your email to confirm, then log in.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          required
          placeholder="Full name"
          className="border rounded px-3 py-2 w-full"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="border rounded px-3 py-2 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Password"
          className="border rounded px-3 py-2 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          {(["buyer", "private_seller", "dealer"] as Role[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 border rounded px-2 py-2 text-sm capitalize ${
                role === r ? "bg-black text-white" : "bg-white"
              }`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {notice && <p className="text-green-700 text-sm">{notice}</p>}

        <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg w-full">
          Sign up
        </button>
      </form>
    </main>
  );
}
