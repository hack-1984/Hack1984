"use client";

// Google OAuth lands here. Supabase reads the ?code= from the URL while it loads
// the session; then we go on to the ideas list (or back to login if it failed).
import { useEffect } from "react";
import { Session } from "@/session";

export default function AuthCallback() {
  useEffect(() => {
    Session.ready().then(() => {
      window.location.replace(Session.getSession() ? "/sessions" : "/login");
    });
  }, []);
  return null;
}
