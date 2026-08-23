"use server";

import { revalidatePath } from "next/cache";
import type {
  Category,
  ImportFormatKey,
  ImportSource,
  ImportSourceType,
} from "@/features/kakei/db/types";
import type { CategoryDictionaryEntry } from "@/features/kakei/import/category-dictionary";
import {
  normalizeDictionary,
  resolveCategory,
} from "@/features/kakei/import/category-dictionary";
import { IMPORT_DATE_RE } from "@/features/kakei/import/date-rank";
import {
  computeEntryKey,
  computeFingerprint,
} from "@/features/kakei/import/hash";
import type { ManualTransactionCandidate } from "@/features/kakei/import/matching";
import {
  findCandidates,
  mergeSnapshotFiles,
} from "@/features/kakei/import/matching";
import { parseDebit } from "@/features/kakei/import/parsers/debit";
import { parseJcb } from "@/features/kakei/import/parsers/jcb";
import { parseRakuten } from "@/features/kakei/import/parsers/rakuten";
import { parseVpass } from "@/features/kakei/import/parsers/vpass";
import type { CardParser } from "@/features/kakei/import/types";
import { fetchMinSortOrderByDate } from "@/features/kakei/lib/sort-order";
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
  revalidatePath("/import-sources");
}

export async function updateImportSource(
  id: string,
  input: { name: string },
): Promise<void> {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase
    .from("import_sources")
    .update({ name: input.name })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/import-sources");
}

export async function deleteImportSource(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedUserId();

  const { error: entriesError } = await supabase
    .from("statement_entries")
    .delete()
    .eq("user_id", userId)
    .eq("import_source_id", id);
  if (entriesError) throw entriesError;

  const { error: transactionsError } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("import_source_id", id);
  if (transactionsError) throw transactionsError;

  const { error } = await supabase
    .from("import_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/import-sources");
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
    return { status: "error", message: "カード名を入力してください。" };
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

export async function updateImportSourceFromForm(
  _prevState: ImportSourceFormState,
  formData: FormData,
): Promise<ImportSourceFormState> {
  const id = formData.get("id");
  const name = formData.get("name");
  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", message: "不正なリクエストです。" };
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return { status: "error", message: "カード名を入力してください。" };
  }
  try {
    await updateImportSource(id, { name: name.trim() });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "更新に失敗しました。",
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
  fileName: string;
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
  fileNames: string[];
  importSourceId: string;
};

function buildDictionary(categories: Category[]): CategoryDictionaryEntry[] {
  return categories
    .filter((c) => c.import_keywords && c.import_keywords.length > 0)
    .map((c) => ({ category: c.id, keywords: c.import_keywords as string[] }));
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
  files: { buffer: Buffer; fileName: string }[],
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
  if (sourceError || !source) throw new Error("カードが見つかりません");
  if (categoriesError) throw categoriesError;

  const parsedFiles = await Promise.all(
    files.map(async (file) => {
      let parsed: Awaited<ReturnType<CardParser>>;
      try {
        parsed = await PARSERS[source.format_key](file.buffer);
      } catch (error) {
        throw new Error(
          `${file.fileName}の読み取りに失敗しました（${
            error instanceof Error ? error.message : "不明なエラー"
          }）。`,
        );
      }
      return {
        fileName: file.fileName,
        rows: parsed.map((tx) => ({
          ...tx,
          fingerprint: computeFingerprint(
            tx.date,
            tx.amount,
            tx.type,
            tx.description,
          ),
        })),
      };
    }),
  );
  const withOccurrence = mergeSnapshotFiles(parsedFiles);

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
      fileName: row.fileName,
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
          resolveCategory(row.description, dictionariesByType[row.type]) ??
          null,
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
    fileNames: files.map((f) => f.fileName),
    importSourceId,
  };
}

export type ConfirmImportRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  occurrence: number;
  /** ファイル全体での同日内の新しさランク（0が最新）。`computeDateRanks` で算出する。 */
  rank: number;
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

export type ConfirmImportBatchResult = {
  matchedCount: number;
  createdCount: number;
  duplicateCount: number;
};

export async function confirmImportBatch(
  importSourceId: string,
  rows: ConfirmImportRow[],
): Promise<ConfirmImportBatchResult> {
  const { supabase, userId } = await getAuthedUserId();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);
  if (categoriesError) throw categoriesError;
  const validCategoryIds = new Set(categories.map((c) => c.id));

  const validRows = rows.filter(
    (row) =>
      IMPORT_DATE_RE.test(row.date) &&
      Number.isFinite(row.amount) &&
      row.amount > 0 &&
      (row.type === "income" || row.type === "expense"),
  );

  const rowKeys = new Map(
    validRows.map((row) => {
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
      return [row, { fingerprint, entryKey }] as const;
    }),
  );

  let existingEntryKeys = new Set<string>();
  if (rowKeys.size > 0) {
    const { data: existingEntries, error: existingEntriesError } =
      await supabase
        .from("statement_entries")
        .select("entry_key")
        .eq("user_id", userId)
        .eq("import_source_id", importSourceId)
        .in(
          "entry_key",
          Array.from(rowKeys.values(), ({ entryKey }) => entryKey),
        );
    if (existingEntriesError) throw existingEntriesError;
    existingEntryKeys = new Set(existingEntries.map((e) => e.entry_key));
  }

  const unregisteredRows = validRows.filter((row) => {
    const keys = rowKeys.get(row);
    if (!keys) throw new Error("行に対応するentry_keyが見つかりませんでした。");
    return !existingEntryKeys.has(keys.entryKey);
  });
  const preDuplicateCount = validRows.length - unregisteredRows.length;

  const linkTransactionIds = unregisteredRows
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

  type ResolvedRow = {
    row: ConfirmImportRow;
    kind: "link" | "create";
    transactionId: string | null;
  };

  const resolvedRows: ResolvedRow[] = [];
  const descriptionBackfills: { transactionId: string; description: string }[] =
    [];

  for (const row of unregisteredRows) {
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
          descriptionBackfills.push({
            transactionId: candidate.id,
            description: row.description,
          });
        }
        alreadyLinkedIds.add(candidate.id);
        resolvedRows.push({ row, kind: "link", transactionId: candidate.id });
        continue;
      }
    }
    resolvedRows.push({ row, kind: "create", transactionId: null });
  }

  await Promise.all(
    descriptionBackfills.map(async (backfill) => {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ description: backfill.description })
        .eq("id", backfill.transactionId)
        .eq("user_id", userId);
      if (updateError) throw updateError;
    }),
  );

  const toCreate = resolvedRows.filter((r) => r.kind === "create");
  if (toCreate.length > 0) {
    const { data: createdRows, error: createError } = await supabase
      .from("transactions")
      .insert(
        toCreate.map(({ row }) => ({
          user_id: userId,
          date: row.date,
          amount: row.amount,
          type: row.type,
          category_id:
            row.action.kind === "create" &&
            row.action.categoryId &&
            validCategoryIds.has(row.action.categoryId)
              ? row.action.categoryId
              : null,
          description: row.description,
          source: "import",
          import_source_id: importSourceId,
        })),
      )
      .select("id");
    if (createError) throw createError;
    if (createdRows.length !== toCreate.length) {
      throw new Error("取引の作成件数が一致しませんでした。");
    }
    toCreate.forEach((resolved, index) => {
      resolved.transactionId = createdRows[index].id;
    });

    const minSortOrderByDate = await fetchMinSortOrderByDate(
      supabase,
      userId,
      toCreate.map(({ row }) => row.date),
    );
    await Promise.all(
      toCreate.map(async ({ row, transactionId }) => {
        const base = minSortOrderByDate.get(row.date) ?? 0;
        const { error } = await supabase
          .from("transactions")
          .update({ sort_order: base - 1 - row.rank })
          .eq("id", transactionId as string)
          .eq("user_id", userId);
        if (error) throw error;
      }),
    );
  }

  const entries = resolvedRows.map(({ row, kind, transactionId }) => {
    const keys = rowKeys.get(row);
    if (!keys) throw new Error("行に対応するentry_keyが見つかりませんでした。");
    const { fingerprint, entryKey } = keys;
    return {
      kind,
      entry: {
        user_id: userId,
        import_source_id: importSourceId,
        transaction_id: transactionId as string,
        entry_key: entryKey,
        fingerprint,
        occurrence: row.occurrence,
        date: row.date,
        amount: row.amount,
        type: row.type,
        description: row.description,
      },
    };
  });

  let matchedCount = 0;
  let createdCount = 0;
  let duplicateCount = rows.length - validRows.length + preDuplicateCount;

  if (entries.length > 0) {
    const { data: insertedEntries, error: entriesError } = await supabase
      .from("statement_entries")
      .upsert(
        entries.map((e) => e.entry),
        {
          onConflict: "user_id,import_source_id,entry_key",
          ignoreDuplicates: true,
        },
      )
      .select("entry_key");
    if (entriesError) throw entriesError;
    const insertedKeys = new Set(insertedEntries.map((e) => e.entry_key));
    for (const { kind, entry } of entries) {
      if (!insertedKeys.has(entry.entry_key)) {
        duplicateCount++;
        continue;
      }
      if (kind === "link") matchedCount++;
      else createdCount++;
    }
  }

  return { matchedCount, createdCount, duplicateCount };
}

export async function finalizeImportBatch(
  importSourceId: string,
  fileName: string,
  totals: ConfirmImportBatchResult,
): Promise<void> {
  const { supabase, userId } = await getAuthedUserId();

  const { data: source, error: sourceError } = await supabase
    .from("import_sources")
    .select("*")
    .eq("id", importSourceId)
    .eq("user_id", userId)
    .single();
  if (sourceError || !source) throw new Error("カードが見つかりません");

  const { error: batchError } = await supabase.from("import_batches").insert({
    user_id: userId,
    import_source_id: importSourceId,
    file_name: fileName,
    source_type: SOURCE_TYPE_BY_FORMAT[source.format_key],
    matched_count: totals.matchedCount,
    created_count: totals.createdCount,
    duplicate_count: totals.duplicateCount,
  });
  if (batchError) throw batchError;
}

export async function completeImport(
  importSourceId: string,
): Promise<{ reclassifiedCount: number }> {
  const { supabase, userId } = await getAuthedUserId();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);
  if (categoriesError) throw categoriesError;

  const reclassifiedCount = await reclassifyUncategorizedImports(
    supabase,
    userId,
    importSourceId,
    categories,
  );

  revalidatePath("/");
  return { reclassifiedCount };
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
    const categoryId = resolveCategory(
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
  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (typeof importSourceId !== "string" || importSourceId.length === 0) {
    return { status: "error", message: "カードを選択してください。" };
  }
  if (files.length === 0) {
    return { status: "error", message: "ファイルを選択してください。" };
  }
  try {
    const buffers = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        fileName: file.name,
      })),
    );
    const result = await previewImport(importSourceId, buffers);
    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "取り込みに失敗しました。",
    };
  }
}
