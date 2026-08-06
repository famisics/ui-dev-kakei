const SMALL_KANA = "ァィゥェォッャュョヮ";
const LARGE_KANA = "アイウエオツヤユヨワ";

/**
 * 支払先名の表記揺れを畳み込む正規化（NFKC正規化・大文字化・空白除去・
 * 長音符/ハイフン類除去・ひらがな→カタカナ変換・小書きカタカナ→大書き変換）。
 * ジャンル辞書のキーワード部分一致・重複判定ハッシュの両方で使う。
 */
export function normalizePayee(description: string): string {
  return description
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[ー・･‐‑‒–—―−-]/g, "")
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(
      /[ァィゥェォッャュョヮ]/g,
      (c) => LARGE_KANA[SMALL_KANA.indexOf(c)],
    );
}
