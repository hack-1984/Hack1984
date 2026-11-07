import type { Metadata } from "next";
import LoginScreen from "@/screens/login/LoginScreen";

export const metadata: Metadata = { title: "Log in · Sprout" };

export default function Page() {
  return <LoginScreen />;
}
