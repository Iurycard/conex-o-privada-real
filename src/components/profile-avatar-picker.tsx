import { useEffect, useId, useState } from "react";
import { Camera } from "lucide-react";

type ProfileAvatarPickerProps = {
  avatarUrl?: string | null;
  nick: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export function ProfileAvatarPicker({
  avatarUrl,
  nick,
  file,
  onFileChange,
  disabled = false,
}: ProfileAvatarPickerProps) {
  const inputId = useId();
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imageUrl = fileUrl ?? avatarUrl;

  return (
    <section className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-lg font-semibold text-primary-glow">
        {imageUrl ? (
          <img src={imageUrl} alt={`Imagem de perfil de ${nick || "usuário"}`} className="h-full w-full object-cover" />
        ) : (
          <span>{nick.trim().slice(0, 2).toUpperCase() || "?"}</span>
        )}
        <label
          htmlFor={inputId}
          className={`absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
          aria-label={imageUrl ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        >
          <Camera className="h-4 w-4" />
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
      <div>
        <p className="text-sm font-semibold">Foto de perfil</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {file ? file.name : "Escolha uma foto. Você também pode adicionar depois."}
        </p>
      </div>
    </section>
  );
}
