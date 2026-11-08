import type { Metadata } from "next";
import IdeaMapScreen from "@/screens/idea-map/IdeaMapScreen";

export const metadata: Metadata = { title: "Idea map · Sprout" };

// Canned "Pantry" data from the design (see src/screens/idea-map/logic.js) until the data model lands.
export default function Page() {
  return <IdeaMapScreen />;
}
