import type { Metadata } from "next";
import NewIdeaScreen from "@/screens/new-idea/NewIdeaScreen";

export const metadata: Metadata = { title: "Plant a new seed · Sprout" };

export default function Page() {
  return <NewIdeaScreen />;
}
