import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vagas/$jobId")({
  component: () => <Outlet />,
});
