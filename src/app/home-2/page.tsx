import type { Metadata } from "next";
import { HomeTwoPage } from "@/components/home2/home-two-page";

export const metadata: Metadata = {
  title: "Mizan Home 2 - Cinematic Legal Workspace",
  description:
    "An image-led, scroll-driven landing experience for Mizan's AI-powered legal workspace."
};

export default function HomeTwoRoute() {
  return <HomeTwoPage />;
}
