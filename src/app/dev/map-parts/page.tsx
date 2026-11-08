import { notFound } from "next/navigation";
import MapParts from "@/screens/idea-map/dev/MapParts";

// Dev-only gallery of the map's parts in every state, for design review by screenshot.
// Not part of the product: it 404s in a production build.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MapParts />;
}
