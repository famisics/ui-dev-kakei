import { normalizePayee } from "./normalize";

export type CategoryDictionaryEntry = {
  category: string;
  keywords: string[];
};

/** keywords を事前に normalizePayee で正規化した辞書。行ごとに繰り返し正規化しないための形。 */
export type NormalizedCategoryDictionaryEntry = {
  category: string;
  keywords: string[];
};

/** 辞書のキーワードを一度だけ正規化する。取込行のループの外で1回呼ぶ。 */
export function normalizeDictionary(
  dictionary: CategoryDictionaryEntry[],
): NormalizedCategoryDictionaryEntry[] {
  return dictionary.map(({ category, keywords }) => ({
    category,
    keywords: keywords.map(normalizePayee).filter(Boolean),
  }));
}

/**
 * カテゴリ辞書によるキーワード部分一致でのカテゴリ自動判定。定義順で先勝ち。
 * dictionary は normalizeDictionary で事前正規化済みのものを渡す。
 */
export function resolveCategory(
  description: string,
  dictionary: NormalizedCategoryDictionaryEntry[],
): string | undefined {
  const target = normalizePayee(description);
  for (const { category, keywords } of dictionary) {
    for (const keyword of keywords) {
      if (target.includes(keyword)) return category;
    }
  }
  return undefined;
}
