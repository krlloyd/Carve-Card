import { createFileRoute } from "@tanstack/react-router";
import { CarveApp } from "@/components/carve-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CarveApp />;
}
