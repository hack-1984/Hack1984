import type { Metadata } from "next";
import IdeaMapScreen from "@/screens/idea-map/IdeaMapScreen";

export const metadata: Metadata = { title: "Idea map · Sprout" };

// Reads ?id= (a saved idea) or ?new=1 (the probe). See src/screens/idea-map/logic.js.
export default function Page() {
  return <IdeaMapScreen />;
}
