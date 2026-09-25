import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import type { Profile } from "@/context/profiles-context";

export function AvatarOrb({
  profile,
  size = 44,
  ring = true,
  profileId,
  clickable = false,
}: {
  profile: Pick<Profile, "id" | "nick" | "hue" | "vip"> & { avatar?: string | null };
  size?: number;
  ring?: boolean;
  profileId?: string;
  clickable?: boolean;
}) {
  const targetId = profileId ?? profile.id;
  const inner = (
    <span
     className="relative block overflow-hidden rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, hsl(${profile.hue} 70% 42%), hsl(${profile.hue + 30} 55% 16%))`,
      }}
    >
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt={`Ilustração de perfil de ${profile.nick}`}
          loading="lazy"
          className=" w-full h-full object-cover rounded-full block"
/>
      ) : (
        <span className="w-full h-full w-full items-center justify-center font-display text-sm font-semibold text-foreground/80 flex">
        profile.nick.slice(0, 2).toUpperCase()
        </span>
      )}
    </span>
  );

  const wrapped = ring ? (
    <span
      className={`inline-flex shrink-0 items-center self-start justify-center rounded-full p-[2px] ${
        profile.vip ? "bg-gradient-gold" : "bg-surface-2"
      }`}
    >
      <span className="block rounded-full bg-background p-[2px]">
        {inner}
        </span>
    </span>
  ) : (
    inner
  );

  if (!clickable || !targetId) return wrapped;

  return (
    <Link to="/perfil/$id" params={{ id: targetId }} className="inline-flex shrink-0" aria-label={`Ver perfil de ${profile.nick}`}>
      {wrapped}
    </Link>
  );
}

export function ProfileNameLink({
  profile,
  className = "",
  children,
}: {
  profile: Pick<Profile, "id" | "nick">;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      to="/perfil/$id"
      params={{ id: profile.id }}
      className={className}
      aria-label={`Ver perfil de ${profile.nick}`}
    >
      {children ?? profile.nick}
    </Link>
  );
}

export function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-semibold text-gold-foreground ${className}`}
    >
      <Crown className="h-3 w-3" /> VIP
    </span>
  );
}

export function TypeBadge({ type, className = "" }: { type: string; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground ${className}`}
    >
      {type}
    </span>
  );
}

export function MediaBlock({
  hue,
  label,
  src,
  alt,
  className = "",
}: {
  hue: number;
  label?: string;
  src?: string | null;
  alt?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 55% 22%), hsl(${hue + 40} 45% 8%) 65%, hsl(${hue - 25} 60% 14%))`,
      }}
    >
      {src && (
        <img
          src={src}
          alt={alt ?? "Ilustração editorial"}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
      {label && (
        <span className="absolute bottom-2 left-3 text-[11px] font-medium text-foreground/70">{label}</span>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pb-4 pt-6 md:px-0">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
