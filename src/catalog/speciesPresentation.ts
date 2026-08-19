export const SPECIES_CATEGORY_LABELS = Object.freeze({
  fish: "魚類",
  gelatinous_plankton: "ゼラチン質生物",
  squid: "イカ類",
  octopus: "タコ類",
  crab: "カニ類",
  shrimp: "エビ類",
  other_invertebrate: "その他の無脊椎動物",
} as const);

export type SpeciesCategory = keyof typeof SPECIES_CATEGORY_LABELS;

export function getSpeciesCategoryLabel(category: string): string {
  return SPECIES_CATEGORY_LABELS[category as SpeciesCategory] ??
    SPECIES_CATEGORY_LABELS.other_invertebrate;
}

export function getUnknownSpeciesLabel(category: string): string {
  return `未同定 / ${getSpeciesCategoryLabel(category)}`;
}

export type JapaneseNameStatus = "established" | "localized";

export function getJapaneseNameStatusLabel(status: JapaneseNameStatus): string {
  return status === "established"
    ? "和名"
    : "ゲーム内呼称 / 標準和名未確認";
}
