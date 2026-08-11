import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-xs",
} as const;

type AvatarSize = keyof typeof SIZE_CLASSES;

function initialsOf(name: string | null | undefined, email: string | undefined) {
  const label = (name ?? email ?? "?").trim();
  const parts = label.split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.charAt(0).toUpperCase();
}

export function Avatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  email?: string | undefined;
  avatarUrl: string | null | undefined;
  size?: AvatarSize;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name ?? email ?? "Usuario"}
        className={cn("shrink-0 rounded-full border border-outline-variant object-cover", SIZE_CLASSES[size], className)}
        src={avatarUrl}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-data-mono font-medium text-primary",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initialsOf(name, email)}
    </span>
  );
}

export function AvatarStack({
  members,
  max = 3,
  size = "sm",
}: {
  members: { user: { id: string; email: string; name: string | null; avatarUrl: string | null } }[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((member) => (
        <Avatar
          avatarUrl={member.user.avatarUrl}
          className="-ml-1 first:ml-0 ring-2 ring-surface-container-lowest"
          email={member.user.email}
          key={member.user.id}
          name={member.user.name}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "-ml-1 flex items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-data-mono font-medium text-on-surface-variant ring-2 ring-surface-container-lowest",
            SIZE_CLASSES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
