import { Crown } from "lucide-react";
import type { Profile } from "@/context/profiles-context";

export function AvatarOrb({
  profile,
  size = 44,
  ring = true,
}: {
  profile: Pick<Profile, "nick" | "hue" | "vip"> & { avatar?: string | null };
  size?: number;
  ring?: boolean;
}) {
  const inner = (
    <span
      className="grid place-items-center overflow-hidden rounded-full font-display text-sm font-semibold text-foreground"
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
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        profile.nick.slice(0, 2).toUpperCase()
      )}
    </span>
  );

  if (!ring) return inner;

  return (
    <span
      className={`inline-grid place-items-center rounded-full p-[2px] ${
        profile.vip ? "bg-gradient-gold" : "bg-surface-2"
      }`}
    >
      <span className="rounded-full bg-background p-[2px]">{inner}</span>
    </span>
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
