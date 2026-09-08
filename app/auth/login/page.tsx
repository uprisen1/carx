"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={handleLogin} className="space-y-4">
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
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg w-full">
          Log in
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        No account?{" "}
        <Link href="/auth/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
