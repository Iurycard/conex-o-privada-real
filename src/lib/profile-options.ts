export type AccountType =
  | "Casal (Ele/Ela)"
  | "Casal (Ela/Ela)"
  | "Casal (Ele/Ele)"
  | "Mulher Solteira"
  | "Homem Solteiro"
  | "Travesti";

export const accountTypes: AccountType[] = [
  "Casal (Ele/Ela)",
  "Casal (Ela/Ela)",
  "Casal (Ele/Ele)",
  "Mulher Solteira",
  "Homem Solteiro",
  "Travesti",
];

export const sexualOrientationOptions = [
  { value: "heterossexual", label: "Heterossexual" },
  { value: "homossexual", label: "Homossexual" },
  { value: "bissexual", label: "Bissexual" },
  { value: "pansexual", label: "Pansexual" },
  { value: "outros", label: "Outros" },
];