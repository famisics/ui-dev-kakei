import { normalizePayee } from "./normalize";

export type GenreDictionaryEntry = {
  genre: string;
  keywords: string[];
};

/** keywords を事前に normalizePayee で正規化した辞書。行ごとに繰り返し正規化しないための形。 */
export type NormalizedGenreDictionaryEntry = {
  genre: string;
  keywords: string[];
};

/** 辞書のキーワードを一度だけ正規化する。取込行のループの外で1回呼ぶ。 */
export function normalizeDictionary(
  dictionary: GenreDictionaryEntry[],
): NormalizedGenreDictionaryEntry[] {
  return dictionary.map(({ genre, keywords }) => ({
    genre,
    keywords: keywords.map(normalizePayee).filter(Boolean),
  }));
}

/**
 * ジャンル辞書によるキーワード部分一致でのジャンル自動判定。定義順で先勝ち。
 * dictionary は normalizeDictionary で事前正規化済みのものを渡す。
 */
export function resolveGenre(
  description: string,
  dictionary: NormalizedGenreDictionaryEntry[],
): string | undefined {
  const target = normalizePayee(description);
  for (const { genre, keywords } of dictionary) {
    for (const keyword of keywords) {
      if (target.includes(keyword)) return genre;
    }
  }
  return undefined;
}
