"use server";

import { revalidatePath } from "next/cache";
import type {
  Category,
  ImportFormatKey,
  ImportSource,
  ImportSourceType,
} from "@/features/kakei/db/types";
import type { GenreDictionaryEntry } from "@/features/kakei/import/genre-dictionary";
import {
  normalizeDictionary,
  resolveGenre,
} from "@/features/kakei/import/genre-dictionary";
import { computeImportHash } from "@/features/kakei/import/hash";
import { parseDebit } from "@/features/kakei/import/parsers/debit";
import { parseJcb } from "@/features/kakei/import/parsers/jcb";
import { parseRakuten } from "@/features/kakei/import/parsers/rakuten";
import { parseVpass } from "@/features/kakei/import/parsers/vpass";
import type { CardParser } from "@/features/kakei/import/types";
import { getAuthedUserId } from "@/lib/supabase/auth";

const PARSERS: Record<ImportFormatKey, CardParser> = {
  jcb: parseJcb,
  debit: parseDebit,
  rakuten: parseRakuten,
  vpass: parseVpass,
};

const SOURCE_TYPE_BY_FORMAT: Record<ImportFormatKey, ImportSourceType> = {
  jcb: "csv",
  debit: "csv",
  vpass: "csv",
  rakuten: "pdf",
};

export async function listImportSources(): Promise<ImportSource[]> {
  const { supabase, userId } = await getAuthedUserId();
  const { data, error } = await supabase
    .from("import_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createImportSource(input: {
  name: string;
  formatKey: ImportFormatKey;
}) {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase.from("import_sources").insert({
    user_id: userId,
    name: input.name,
    format_key: input.formatKey,
  });
  if (error) throw error;
  revalidatePath("/");
}

export type ImportSourceFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const IMPORT_FORMAT_KEYS: ImportFormatKey[] = [
  "jcb",
  "debit",
  "rakuten",
  "vpass",
];

export async function createImportSourceFromForm(
  _prevState: ImportSourceFormState,
  formData: FormData,
): Promise<ImportSourceFormState> {
  const name = formData.get("name");
  const formatKey = formData.get("formatKey");
  if (typeof name !== "string" || name.trim().length === 0) {
    return { status: "error", message: "取込元名を入力してください。" };
  }
  if (
    typeof formatKey !== "string" ||
    !IMPORT_FORMAT_KEYS.includes(formatKey as ImportFormatKey)
  ) {
    return { status: "error", message: "フォーマットを選択してください。" };
  }
  try {
    await createImportSource({
      name: name.trim(),
      formatKey: formatKey as ImportFormatKey,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "作成に失敗しました。",
    };
  }
  return { status: "success" };
}

export type ImportPreviewRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  hash: string;
  isDuplicate: boolean;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  newCount: number;
  duplicateCount: number;
  fileName: string;
  importSourceId: string;
};

function buildDictionary(categories: Category[]): GenreDictionaryEntry[] {
  return categories
    .filter((c) => c.import_keywords && c.import_keywords.length > 0)
    .map((c) => ({ genre: c.id, keywords: c.import_keywords as string[] }));
}

export async function previewImport(
  importSourceId: string,
  fileBuffer: Buffer,
  fileName: string,
): Promise<ImportPreviewResult> {
  const { supabase, userId } = await getAuthedUserId();

  const [
    { data: source, error: sourceError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("import_sources")
      .select("*")
      .eq("id", importSourceId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);
  if (sourceError || !source) throw new Error("取込元が見つかりません");
  if (categoriesError) throw categoriesError;

  const parsed = await PARSERS[source.format_key](fileBuffer);

  const dictionariesByType = {
    income: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "income")),
    ),
    expense: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "expense")),
    ),
  };

  const hashes = parsed.map((tx) =>
    computeImportHash(importSourceId, tx.date, tx.amount, tx.description),
  );

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("import_hash")
    .eq("user_id", userId)
    .in("import_hash", hashes);
  if (existingError) throw existingError;
  const existingHashes = new Set(existing.map((t) => t.import_hash));

  const seenInFile = new Set<string>();
  const rows: ImportPreviewRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const tx = parsed[i];
    const hash = hashes[i];
    const isDuplicate = existingHashes.has(hash) || seenInFile.has(hash);
    seenInFile.add(hash);
    rows.push({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      categoryId:
        resolveGenre(tx.description, dictionariesByType[tx.type]) ?? null,
      hash,
      isDuplicate,
    });
  }

  const newCount = rows.filter((r) => !r.isDuplicate).length;
  return {
    rows,
    newCount,
    duplicateCount: rows.length - newCount,
    fileName,
    importSourceId,
  };
}

export type ConfirmImportRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
};

export type ConfirmImportResult = {
  insertedCount: number;
  skippedCount: number;
};

export async function confirmImport(
  importSourceId: string,
  fileName: string,
  rows: ConfirmImportRow[],
  previewDuplicateCount: number,
): Promise<ConfirmImportResult> {
  const { supabase, userId } = await getAuthedUserId();

  const [
    { data: source, error: sourceError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("import_sources")
      .select("*")
      .eq("id", importSourceId)
      .eq("user_id", userId)
      .single(),
    supabase.from("categories").select("id").eq("user_id", userId),
  ]);
  if (sourceError || !source) throw new Error("取込元が見つかりません");
  if (categoriesError) throw categoriesError;
  const validCategoryIds = new Set(categories.map((c) => c.id));

  const seenHashes = new Set<string>();
  const toInsert: {
    user_id: string;
    date: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    description: string;
    source: "import";
    import_source_id: string;
    import_hash: string;
  }[] = [];

  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    if (!Number.isFinite(row.amount) || row.amount <= 0) continue;
    if (row.type !== "income" && row.type !== "expense") continue;
    const hash = computeImportHash(
      importSourceId,
      row.date,
      row.amount,
      row.description,
    );
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    toInsert.push({
      user_id: userId,
      date: row.date,
      amount: row.amount,
      type: row.type,
      category_id:
        row.categoryId && validCategoryIds.has(row.categoryId)
          ? row.categoryId
          : null,
      description: row.description,
      source: "import",
      import_source_id: importSourceId,
      import_hash: hash,
    });
  }

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(toInsert, { ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    insertedCount = data.length;
  }

  const skippedCount =
    Math.max(previewDuplicateCount, 0) + (toInsert.length - insertedCount);

  const { error: batchError } = await supabase.from("import_batches").insert({
    user_id: userId,
    import_source_id: importSourceId,
    file_name: fileName,
    source_type: SOURCE_TYPE_BY_FORMAT[source.format_key],
    inserted_count: insertedCount,
    skipped_count: skippedCount,
  });
  if (batchError) throw batchError;

  revalidatePath("/");
  return { insertedCount, skippedCount };
}

export type ImportPreviewFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  result?: ImportPreviewResult;
};

export async function previewImportFromForm(
  _prevState: ImportPreviewFormState,
  formData: FormData,
): Promise<ImportPreviewFormState> {
  const importSourceId = formData.get("importSourceId");
  const file = formData.get("file");
  if (typeof importSourceId !== "string" || importSourceId.length === 0) {
    return { status: "error", message: "取込元を選択してください。" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "ファイルを選択してください。" };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await previewImport(importSourceId, buffer, file.name);
    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "取り込みに失敗しました。",
    };
  }
}
