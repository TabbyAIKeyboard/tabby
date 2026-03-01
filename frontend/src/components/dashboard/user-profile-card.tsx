"use client";

import useUser from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function UserProfileCard() {
  const { data: user, isFetching } = useUser();

  const imageUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0];
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (isFetching) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <Skeleton className="h-20 w-20 rounded-full mb-4" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Centered avatar and name */}
      <div className="flex flex-col items-center text-center mb-6">
        <Avatar className="h-20 w-20 mb-4">
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt={displayName || "User"} />
          ) : (
            <AvatarImage
              src={`https://avatar.vercel.sh/${user?.email}?text=${displayName?.[0]?.toUpperCase() || "U"}`}
              alt="avatar"
            />
          )}
          <AvatarFallback className="text-2xl bg-muted text-muted-foreground font-medium">
            {displayName?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-xl">{displayName || "User"}</h3>
        <p className="text-sm text-muted-foreground">Welcome back!</p>
      </div>

      {/* Info rows - clean, no icons */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium truncate max-w-[180px]">{user?.email}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">User ID</span>
          <span className="text-sm font-mono text-muted-foreground">
            {user?.id?.slice(0, 8)}...
          </span>
        </div>

        {createdAt && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Member since</span>
            <span className="text-sm">{createdAt}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
