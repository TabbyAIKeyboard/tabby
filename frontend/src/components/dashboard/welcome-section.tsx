"use client";

import useUser from "@/hooks/use-user";

export function WelcomeSection() {
  const { data: user } = useUser();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) {
    greeting = "Good morning";
  } else if (currentHour < 17) {
    greeting = "Good afternoon";
  }

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
        <h1 className="text-2xl font-bold">
          {greeting}, <span className="text-foreground">{displayName}</span>!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your AI assistant activity.
        </p>
      </div>
    </div>
  );
}
