import { createHash } from "node:crypto";
import { normalizePayee } from "./normalize";

/**
 * 日付・金額・種別・正規化した明細名から、内容が同じ明細をまとめるためのフィンガープリントを算出する。
 */
export function computeFingerprint(
  date: string,
  amount: number,
  type: "income" | "expense",
  description: string,
): string {
  const normalizedDescription = normalizePayee(description);
  const key = `${date}|${amount}|${type}|${normalizedDescription}`;
  return createHash("sha256").update(key).digest("hex");
}

/**
 * 同じ明細エントリーを再登録しないための永続的な一意キーを算出する。
 * カード会社固有の取引ID(externalId)があればそれを優先し、なければフィンガープリントと
 * 出現番号(occurrence)から生成する。
 */
export function computeEntryKey(params: {
  importSourceId: string;
  fingerprint: string;
  occurrence: number;
  externalId?: string;
}): string {
  const key = params.externalId
    ? `${params.importSourceId}|${params.externalId}`
    : `${params.importSourceId}|${params.fingerprint}|${params.occurrence}`;
  return createHash("sha256").update(key).digest("hex");
}
