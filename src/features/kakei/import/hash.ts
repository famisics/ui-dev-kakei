import { createHash } from "node:crypto";
import { normalizePayee } from "./normalize";

/**
 * インポート取引の重複判定ハッシュを算出する。すべてのパーサーはこの関数を通して
 * import_hash を生成し、正規化ロジックを重複させない。
 */
export function computeImportHash(
  importSourceId: string,
  date: string,
  amount: number,
  description: string,
): string {
  const normalizedDescription = normalizePayee(description);
  const key = `${importSourceId}|${date}|${amount}|${normalizedDescription}`;
  return createHash("sha256").update(key).digest("hex");
}
