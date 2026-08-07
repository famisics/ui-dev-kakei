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
import {
  computeEntryKey,
  computeFingerprint,
} from "@/features/kakei/import/hash";
import type { ManualTransactionCandidate } from "@/features/kakei/import/matching";
import {
  assignOccurrences,
  findCandidates,
} from "@/features/kakei/import/matching";
import { parseDebit } from "@/features/kakei/import/parsers/debit";
import { parseJcb } from "@/features/kakei/import/parsers/jcb";
import { parseRakuten } from "@/features/kakei/import/parsers/rakuten";
import { parseVpass } from "@/features/kakei/import/parsers/vpass";
import type { CardParser } from "@/features/kakei/import/types";
import { fetchMinSortOrderByDate } from "@/features/kakei/lib/sort-order";
import { getAuthedUserId } from "@/lib/supabase/auth";
import { POSTGRES_ERROR_CODE } from "@/lib/supabase/postgres-errors";

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

export type ImportRowStatus = "registered" | "link" | "new" | "ambiguous";

export type ImportPreviewRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  fingerprint: string;
  occurrence: number;
  status: ImportRowStatus;
  linkedTransactionId: string | null;
  candidates: ManualTransactionCandidate[];
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  registeredCount: number;
  linkCount: number;
  newCount: number;
  ambiguousCount: number;
  decreasedFingerprintCount: number;
  fileName: string;
  importSourceId: string;
};

function buildDictionary(categories: Category[]): GenreDictionaryEntry[] {
  return categories
    .filter((c) => c.import_keywords && c.import_keywords.length > 0)
    .map((c) => ({ genre: c.id, keywords: c.import_keywords as string[] }));
}

async function fetchUnlinkedManualTransactions(
  supabase: Awaited<ReturnType<typeof getAuthedUserId>>["supabase"],
  userId: string,
): Promise<ManualTransactionCandidate[]> {
  const [
    { data: manual, error: manualError },
    { data: linked, error: linkedError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, amount, type, description, memo")
      .eq("user_id", userId)
      .eq("source", "manual"),
    supabase
      .from("statement_entries")
      .select("transaction_id")
      .eq("user_id", userId),
  ]);
  if (manualError) throw manualError;
  if (linkedError) throw linkedError;
  const linkedIds = new Set(linked.map((e) => e.transaction_id));
  return manual.filter((t) => !linkedIds.has(t.id));
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

  const withFingerprint = parsed.map((tx) => ({
    ...tx,
    fingerprint: computeFingerprint(
      tx.date,
      tx.amount,
      tx.type,
      tx.description,
    ),
  }));
  const withOccurrence = assignOccurrences(withFingerprint);

  const { data: existingEntries, error: existingError } = await supabase
    .from("statement_entries")
    .select("fingerprint")
    .eq("user_id", userId)
    .eq("import_source_id", importSourceId);
  if (existingError) throw existingError;
  const existingCounts = new Map<string, number>();
  for (const entry of existingEntries) {
    existingCounts.set(
      entry.fingerprint,
      (existingCounts.get(entry.fingerprint) ?? 0) + 1,
    );
  }

  const fileCounts = new Map<string, number>();
  for (const row of withOccurrence) {
    fileCounts.set(row.fingerprint, row.occurrence);
  }
  let decreasedFingerprintCount = 0;
  for (const [fingerprint, n] of fileCounts) {
    const m = existingCounts.get(fingerprint) ?? 0;
    if (n < m) decreasedFingerprintCount++;
  }

  const unlinkedManual = await fetchUnlinkedManualTransactions(
    supabase,
    userId,
  );

  const dictionariesByType = {
    income: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "income")),
    ),
    expense: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "expense")),
    ),
  };

  const usedManualIds = new Set<string>();
  const rows: ImportPreviewRow[] = [];
  for (const row of withOccurrence) {
    const base = {
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      fingerprint: row.fingerprint,
      occurrence: row.occurrence,
    };

    const m = existingCounts.get(row.fingerprint) ?? 0;
    if (row.occurrence <= m) {
      rows.push({
        ...base,
        categoryId: null,
        status: "registered",
        linkedTransactionId: null,
        candidates: [],
      });
      continue;
    }

    const candidatePool = unlinkedManual.filter(
      (t) => !usedManualIds.has(t.id),
    );
    const match = findCandidates(row, candidatePool);
    if (match.kind === "link") {
      usedManualIds.add(match.transactionId);
      rows.push({
        ...base,
        categoryId: null,
        status: "link",
        linkedTransactionId: match.transactionId,
        candidates: [],
      });
    } else if (match.kind === "ambiguous") {
      rows.push({
        ...base,
        categoryId: null,
        status: "ambiguous",
        linkedTransactionId: null,
        candidates: match.candidates,
      });
    } else {
      rows.push({
        ...base,
        categoryId:
          resolveGenre(row.description, dictionariesByType[row.type]) ?? null,
        status: "new",
        linkedTransactionId: null,
        candidates: [],
      });
    }
  }

  return {
    rows,
    registeredCount: rows.filter((r) => r.status === "registered").length,
    linkCount: rows.filter((r) => r.status === "link").length,
    newCount: rows.filter((r) => r.status === "new").length,
    ambiguousCount: rows.filter((r) => r.status === "ambiguous").length,
    decreasedFingerprintCount,
    fileName,
    importSourceId,
  };
}

export type ConfirmImportRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  occurrence: number;
  action:
    | { kind: "link"; transactionId: string }
    | { kind: "create"; categoryId: string | null };
};

export type ConfirmImportResult = {
  matchedCount: number;
  createdCount: number;
  duplicateCount: number;
  reclassifiedCount: number;
};

const IMPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 明細内での日付の並び順（昇順/降順）を判定し、同じ日付の行の中で
 * どれが「一番最新」かを示すランク（0が最新）を行インデックスごとに返す。
 * カード会社ごとにファイル内の並び順（新→旧か旧→新か）が異なるため、
 * 先頭行と末尾行の日付を比較して都度判定する。
 */
function computeDateRanks(rows: { date: string }[]): number[] {
  const validDates = rows
    .map((row) => row.date)
    .filter((date) => IMPORT_DATE_RE.test(date));
  const ascending =
    validDates.length >= 2 &&
    validDates[0] <= validDates[validDates.length - 1];

  const ranks = new Array<number>(rows.length).fill(0);
  const countByDate = new Map<string, number>();
  const indices = ascending ? [...rows.keys()].reverse() : [...rows.keys()];
  for (const index of indices) {
    const date = rows[index].date;
    if (!IMPORT_DATE_RE.test(date)) continue;
    const rank = countByDate.get(date) ?? 0;
    ranks[index] = rank;
    countByDate.set(date, rank + 1);
  }
  return ranks;
}

export async function confirmImport(
  importSourceId: string,
  fileName: string,
  rows: ConfirmImportRow[],
  registeredCount: number,
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
    supabase.from("categories").select("*").eq("user_id", userId),
  ]);
  if (sourceError || !source) throw new Error("取込元が見つかりません");
  if (categoriesError) throw categoriesError;
  const validCategoryIds = new Set(categories.map((c) => c.id));

  const linkTransactionIds = rows
    .filter((row) => row.action.kind === "link")
    .map(
      (row) =>
        (row.action as { kind: "link"; transactionId: string }).transactionId,
    );

  let candidatesById = new Map<
    string,
    {
      id: string;
      date: string;
      amount: number;
      type: string;
      description: string | null;
    }
  >();
  let alreadyLinkedIds = new Set<string>();
  if (linkTransactionIds.length > 0) {
    const [
      { data: candidates, error: candidatesError },
      { data: linked, error: linkedError },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, date, amount, type, description")
        .eq("user_id", userId)
        .eq("source", "manual")
        .in("id", linkTransactionIds),
      supabase
        .from("statement_entries")
        .select("transaction_id")
        .eq("user_id", userId)
        .in("transaction_id", linkTransactionIds),
    ]);
    if (candidatesError) throw candidatesError;
    if (linkedError) throw linkedError;
    candidatesById = new Map(candidates.map((c) => [c.id, c]));
    alreadyLinkedIds = new Set(linked.map((e) => e.transaction_id));
  }

  let matchedCount = 0;
  let createdCount = 0;
  let duplicateCount = registeredCount;
  const dateRanks = computeDateRanks(rows);
  const createdSortAssignments: {
    transactionId: string;
    date: string;
    rank: number;
  }[] = [];

  for (const [index, row] of rows.entries()) {
    if (!IMPORT_DATE_RE.test(row.date)) continue;
    if (!Number.isFinite(row.amount) || row.amount <= 0) continue;
    if (row.type !== "income" && row.type !== "expense") continue;

    const fingerprint = computeFingerprint(
      row.date,
      row.amount,
      row.type,
      row.description,
    );
    const entryKey = computeEntryKey({
      importSourceId,
      fingerprint,
      occurrence: row.occurrence,
    });

    let transactionId: string | null = null;

    if (row.action.kind === "link") {
      const candidate = candidatesById.get(row.action.transactionId);
      const isValidCandidate =
        candidate &&
        candidate.date === row.date &&
        candidate.amount === row.amount &&
        candidate.type === row.type &&
        !alreadyLinkedIds.has(candidate.id);

      if (isValidCandidate && candidate) {
        if (!candidate.description) {
          const { error: updateError } = await supabase
            .from("transactions")
            .update({ description: row.description })
            .eq("id", candidate.id)
            .eq("user_id", userId);
          if (updateError) throw updateError;
        }
        transactionId = candidate.id;
        alreadyLinkedIds.add(candidate.id);
      }
    }

    if (!transactionId) {
      const categoryId =
        row.action.kind === "create" &&
        row.action.categoryId &&
        validCategoryIds.has(row.action.categoryId)
          ? row.action.categoryId
          : null;
      const { data: created, error: createError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          date: row.date,
          amount: row.amount,
          type: row.type,
          category_id: categoryId,
          description: row.description,
          source: "import",
          import_source_id: importSourceId,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      transactionId = created.id;
      createdSortAssignments.push({
        transactionId,
        date: row.date,
        rank: dateRanks[index],
      });
    }

    const { error: entryError } = await supabase
      .from("statement_entries")
      .insert({
        user_id: userId,
        import_source_id: importSourceId,
        transaction_id: transactionId,
        entry_key: entryKey,
        fingerprint,
        occurrence: row.occurrence,
        date: row.date,
        amount: row.amount,
        type: row.type,
        description: row.description,
      });
    if (entryError) {
      if (entryError.code === POSTGRES_ERROR_CODE.UNIQUE_VIOLATION) {
        duplicateCount++;
        continue;
      }
      throw entryError;
    }

    if (row.action.kind === "link") {
      matchedCount++;
    } else {
      createdCount++;
    }
  }

  if (createdSortAssignments.length > 0) {
    const minSortOrderByDate = await fetchMinSortOrderByDate(
      supabase,
      userId,
      createdSortAssignments.map((assignment) => assignment.date),
    );
    await Promise.all(
      createdSortAssignments.map(async ({ transactionId, date, rank }) => {
        const base = minSortOrderByDate.get(date) ?? 0;
        const { error } = await supabase
          .from("transactions")
          .update({ sort_order: base - 1 - rank })
          .eq("id", transactionId)
          .eq("user_id", userId);
        if (error) throw error;
      }),
    );
  }

  const { error: batchError } = await supabase.from("import_batches").insert({
    user_id: userId,
    import_source_id: importSourceId,
    file_name: fileName,
    source_type: SOURCE_TYPE_BY_FORMAT[source.format_key],
    matched_count: matchedCount,
    created_count: createdCount,
    duplicate_count: duplicateCount,
  });
  if (batchError) throw batchError;

  const reclassifiedCount = await reclassifyUncategorizedImports(
    supabase,
    userId,
    importSourceId,
    categories,
  );

  revalidatePath("/");
  return { matchedCount, createdCount, duplicateCount, reclassifiedCount };
}

/**
 * 同じ取込元を再取込みした際、辞書が更新されて未分類の過去分が分類できるようになっているものを遡って分類する。
 * ユーザーが手動で外した（category_id を null に戻した）ものと区別できないため、未分類のもののみ対象にする。
 */
async function reclassifyUncategorizedImports(
  supabase: Awaited<ReturnType<typeof getAuthedUserId>>["supabase"],
  userId: string,
  importSourceId: string,
  categories: Category[],
): Promise<number> {
  const dictionariesByType = {
    income: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "income")),
    ),
    expense: normalizeDictionary(
      buildDictionary(categories.filter((c) => c.type === "expense")),
    ),
  };

  const { data: uncategorized, error: uncategorizedError } = await supabase
    .from("transactions")
    .select("id, type, description")
    .eq("user_id", userId)
    .eq("import_source_id", importSourceId)
    .is("category_id", null);
  if (uncategorizedError) throw uncategorizedError;

  let reclassifiedCount = 0;
  for (const transaction of uncategorized) {
    if (!transaction.description) continue;
    const categoryId = resolveGenre(
      transaction.description,
      dictionariesByType[transaction.type],
    );
    if (!categoryId) continue;
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ category_id: categoryId })
      .eq("id", transaction.id)
      .eq("user_id", userId)
      .is("category_id", null);
    if (updateError) throw updateError;
    reclassifiedCount++;
  }
  return reclassifiedCount;
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
