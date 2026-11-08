import type { Metadata } from "next";
import ProjectsScreen from "@/screens/projects/ProjectsScreen";

export const metadata: Metadata = { title: "Your ideas · Sprout" };

export default function Page() {
  return <ProjectsScreen />;
}
