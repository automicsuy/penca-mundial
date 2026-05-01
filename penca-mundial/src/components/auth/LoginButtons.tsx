"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoginButtonsProps {
  redirectTo?: string;
}

export function LoginButtons({ redirectTo = "/dashboard" }: LoginButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  async function signInWith(provider: "google" | "azure" | "apple") {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        ...(provider === "azure" && {
          scopes: "email profile openid",
          queryParams: { prompt: "select_account" },
        }),
      },
    });

    if (error) {
      console.error("Auth error:", error);
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        variant="outline"
        size="lg"
        className="w-full relative font-medium"
        onClick={() => signInWith("google")}
        disabled={!!loading}
      >
        {loading === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <GoogleIcon className="mr-2" />
        )}
        Continuar con Google
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full relative font-medium"
        onClick={() => signInWith("azure")}
        disabled={!!loading}
      >
        {loading === "azure" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <MicrosoftIcon className="mr-2" />
        )}
        Continuar con Microsoft
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full relative font-medium"
        onClick={() => signInWith("apple")}
        disabled={!!loading}
      >
        {loading === "apple" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <AppleIcon className="mr-2" />
        )}
        Continuar con Apple
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0h8.571v8.571H0V0z" fill="#F25022" />
      <path d="M9.429 0H18v8.571H9.429V0z" fill="#7FBA00" />
      <path d="M0 9.429h8.571V18H0V9.429z" fill="#00A4EF" />
      <path d="M9.429 9.429H18V18H9.429V9.429z" fill="#FFB900" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.555 2.16c.828-.994 1.389-2.376 1.235-3.76-1.194.048-2.638.795-3.49 1.79C9.507 1.164 8.87 2.576 9.046 3.93c1.305.1 2.637-.667 3.509-1.77zM13.77 4.17c-1.937-.116-3.585 1.1-4.51 1.1-.924 0-2.337-1.04-3.87-1.012-1.994.028-3.843 1.16-4.861 2.952-2.086 3.594-.543 8.914 1.48 11.832.993 1.449 2.178 3.055 3.736 2.998 1.48-.057 2.05-.963 3.845-.963 1.794 0 2.307.963 3.872.935 1.622-.028 2.643-1.449 3.636-2.9 1.137-1.648 1.604-3.252 1.633-3.337-.029-.015-3.12-1.196-3.149-4.76-.028-2.982 2.432-4.415 2.544-4.487-1.395-2.066-3.57-2.288-4.356-2.359z" />
    </svg>
  );
}
