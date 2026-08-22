"use client";

import { Upload } from "lucide-react";
import {
  type DragEvent,
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ConfirmImportBatchResult,
  type ConfirmImportResult,
  type ConfirmImportRow,
  completeImport,
  confirmImportBatch,
  finalizeImportBatch,
  type ImportPreviewFormState,
  previewImportFromForm,
} from "@/features/kakei/actions/import";
import type { Category, ImportSource } from "@/features/kakei/db/types";
import { computeDateRanks } from "@/features/kakei/import/date-rank";
import { formatYen } from "@/features/kakei/lib/format";
import { withToast } from "@/features/kakei/lib/toast-action";

const initialState: ImportPreviewFormState = { status: "idle" };

const STATUS_LABEL: Record<string, string> = {
  registered: "登録済み",
  link: "紐付け予定",
  new: "新規作成予定",
  ambiguous: "要確認",
};

const NEW_TRANSACTION_VALUE = "__new__";
const CONFIRM_CHUNK_SIZE = 10;

export function ImportUploader({
  importSources,
  categories,
}: {
  importSources: ImportSource[];
  categories: Category[];
}) {
  const [sourceId, setSourceId] = useState(importSources[0]?.id ?? "");
  const [state, formAction, isPending] = useActionState(
    withToast(previewImportFromForm, {
      loading: "プレビューを作成しています…",
      success: "プレビューを作成しました。",
      error: "プレビューの作成に失敗しました。",
    }),
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmed, setConfirmed] = useState<ConfirmImportResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<number, string>>({});

  function resetPreviewResult() {
    setConfirmed(null);
    setResolutions({});
  }

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const unresolvedAmbiguousCount = useMemo(() => {
    if (!state.result) return 0;
    return state.result.rows.filter(
      (row, index) => row.status === "ambiguous" && !resolutions[index],
    ).length;
  }, [state.result, resolutions]);

  const importableCount = state.result
    ? state.result.linkCount +
      state.result.newCount +
      state.result.ambiguousCount
    : 0;

  async function handleConfirm() {
    if (state.status !== "success" || !state.result) return;
    const { importSourceId, fileNames: resultFileNames } = state.result;
    setConfirming(true);
    try {
      const rowsWithoutRank: (Omit<ConfirmImportRow, "rank"> & {
        fileName: string;
      })[] = [];
      state.result.rows.forEach((row, index) => {
        if (row.status === "registered") return;
        const common = {
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          occurrence: row.occurrence,
          fileName: row.fileName,
        };
        const action: ConfirmImportRow["action"] | undefined =
          row.status === "link" && row.linkedTransactionId
            ? { kind: "link", transactionId: row.linkedTransactionId }
            : row.status === "new"
              ? { kind: "create", categoryId: row.categoryId }
              : row.status === "ambiguous" && resolutions[index]
                ? resolutions[index] === NEW_TRANSACTION_VALUE
                  ? { kind: "create", categoryId: row.categoryId }
                  : { kind: "link", transactionId: resolutions[index] }
                : undefined;
        if (action) rowsWithoutRank.push({ ...common, action });
      });
      const ranks = computeDateRanks(rowsWithoutRank);
      const rows = rowsWithoutRank.map((row, index) => ({
        ...row,
        rank: ranks[index],
      }));

      const rowsByFile = new Map<string, ConfirmImportRow[]>();
      for (const { fileName, ...row } of rows) {
        const bucket = rowsByFile.get(fileName) ?? [];
        bucket.push(row);
        rowsByFile.set(fileName, bucket);
      }
      const registeredCountByFile = new Map<string, number>();
      for (const row of state.result.rows) {
        if (row.status !== "registered") continue;
        registeredCountByFile.set(
          row.fileName,
          (registeredCountByFile.get(row.fileName) ?? 0) + 1,
        );
      }

      const total = rows.length;
      const toastId = toast.loading(
        total > 0 ? `取り込み中… (0/${total}件)` : "取り込んでいます…",
      );
      const grandTotals: ConfirmImportBatchResult = {
        matchedCount: 0,
        createdCount: 0,
        duplicateCount: 0,
      };
      let processed = 0;
      let filesCompleted = 0;
      let reclassifiedCount = 0;
      try {
        for (const fileName of resultFileNames) {
          const fileRows = rowsByFile.get(fileName) ?? [];
          const fileTotals: ConfirmImportBatchResult = {
            matchedCount: 0,
            createdCount: 0,
            duplicateCount: registeredCountByFile.get(fileName) ?? 0,
          };
          for (let i = 0; i < fileRows.length; i += CONFIRM_CHUNK_SIZE) {
            const chunk = fileRows.slice(i, i + CONFIRM_CHUNK_SIZE);
            const batchResult = await confirmImportBatch(importSourceId, chunk);
            fileTotals.matchedCount += batchResult.matchedCount;
            fileTotals.createdCount += batchResult.createdCount;
            fileTotals.duplicateCount += batchResult.duplicateCount;
            processed += chunk.length;
            toast.loading(`取り込み中… (${processed}/${total}件)`, {
              id: toastId,
            });
          }
          await finalizeImportBatch(importSourceId, fileName, fileTotals);
          grandTotals.matchedCount += fileTotals.matchedCount;
          grandTotals.createdCount += fileTotals.createdCount;
          grandTotals.duplicateCount += fileTotals.duplicateCount;
          filesCompleted++;
        }
      } catch (error) {
        toast.error(
          `${filesCompleted}/${resultFileNames.length}ファイル、${processed}件まで取り込み済みです。以降の処理は中断しました（${
            error instanceof Error ? error.message : "取り込みに失敗しました。"
          }）。`,
          { id: toastId },
        );
        return;
      } finally {
        if (filesCompleted > 0) {
          try {
            const completed = await completeImport(importSourceId);
            reclassifiedCount = completed.reclassifiedCount;
          } catch {
            // 再分類・再検証の失敗は取り込み結果自体には影響しないため無視する
          }
        }
      }

      const result: ConfirmImportResult = { ...grandTotals, reclassifiedCount };
      toast.success(
        `紐付け${result.matchedCount}件、新規作成${result.createdCount}件を取り込みました。`,
        { id: toastId },
      );
      setConfirmed(result);
    } finally {
      setConfirming(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length === 0 || !fileInputRef.current || isPending) return;

    const files = new DataTransfer();
    for (const file of droppedFiles) files.items.add(file);
    fileInputRef.current.files = files.files;
    setFileNames(droppedFiles.map((f) => f.name));
    resetPreviewResult();
    formRef.current?.requestSubmit();
  }

  if (importSources.length === 0) {
    return (
      <Card size="sm">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            カードがまだありません。上の「カードを追加」から登録してください。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>ファイルを選択</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-3"
            onSubmit={() => {
              setFileNames([]);
              resetPreviewResult();
            }}
          >
            <div className="flex flex-col gap-2 sm:max-w-64">
              <Label htmlFor="importSourceId">カード</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger id="importSourceId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {importSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="importSourceId" value={sourceId} />
            </div>

            <Label
              htmlFor="file"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.contains(event.relatedTarget)
                ) {
                  return;
                }
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-accent"
                  : "border-border hover:border-ring hover:bg-accent/50"
              }`}
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="font-medium">
                {isDragging
                  ? "ここにドロップ"
                  : "CSV・PDFファイルをドラッグ＆ドロップ（複数選択可）"}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {fileNames.length > 0
                  ? fileNames.join("、")
                  : "クリックしてファイルを選択することもできます"}
              </span>
            </Label>
            <input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept=".csv,.pdf"
              multiple
              required
              className="sr-only"
              onChange={(event) =>
                setFileNames(
                  Array.from(event.currentTarget.files ?? []).map(
                    (f) => f.name,
                  ),
                )
              }
            />
            <Button
              type="submit"
              disabled={isPending || fileNames.length === 0}
            >
              {isPending ? "プレビュー中..." : "プレビュー"}
            </Button>
          </form>
          {state.status === "error" && (
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
      </Card>

      {state.status === "success" && state.result && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>プレビュー</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">
                紐付け予定 {state.result.linkCount}件
              </Badge>
              <Badge variant="outline">
                新規作成予定 {state.result.newCount}件
              </Badge>
              <Badge variant="outline">
                要確認 {state.result.ambiguousCount}件
              </Badge>
              <Badge variant="outline">
                登録済み {state.result.registeredCount}件
              </Badge>
            </div>

            {state.result.decreasedFingerprintCount > 0 && (
              <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                前回までに登録済みの明細が、今回のファイルには一部含まれていません（
                {state.result.decreasedFingerprintCount}
                件）。既存の取引・明細は削除されません。
              </p>
            )}

            {state.result.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ファイルから取引を読み取れませんでした。カードのフォーマットが正しいか確認してください。
              </p>
            ) : importableCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                すべて登録済みのため、新規に取り込む取引はありません。「この内容で取り込む」を押すと、過去に未分類だったものの再分類のみ確認します。
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.result.rows.map((row, index) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: プレビュー結果は再取得ごとに全置換される
                    key={index}
                    className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="tnum text-muted-foreground">
                          {row.date}
                        </span>
                        <span>{row.description}</span>
                        <span className="text-muted-foreground">
                          {row.categoryId
                            ? (categoryById.get(row.categoryId)?.name ??
                              "未分類")
                            : "未分類"}
                        </span>
                        <Badge variant="outline">
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </div>
                      <span className="mf-num tnum text-sm">
                        {row.type === "income" ? "+" : "-"}
                        {formatYen(row.amount)}
                      </span>
                    </div>
                    {row.status === "ambiguous" && (
                      <div className="flex flex-col gap-1 sm:max-w-96">
                        <Select
                          value={resolutions[index] ?? ""}
                          onValueChange={(value) =>
                            setResolutions((prev) => ({
                              ...prev,
                              [index]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="紐付ける取引を選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.candidates.map((candidate) => (
                              <SelectItem
                                key={candidate.id}
                                value={candidate.id}
                              >
                                {candidate.description ||
                                  candidate.memo ||
                                  "(内容なし)"}
                              </SelectItem>
                            ))}
                            <SelectItem value={NEW_TRANSACTION_VALUE}>
                              新規取引として作成する
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {confirmed ? (
              <p className="text-sm text-muted-foreground">
                紐付け {confirmed.matchedCount}件、新規作成{" "}
                {confirmed.createdCount}
                件を取り込みました（登録済みスキップ {confirmed.duplicateCount}
                件）。
                {confirmed.reclassifiedCount > 0 &&
                  ` 過去に未分類だった${confirmed.reclassifiedCount}件をカテゴリ分けしました。`}
              </p>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={
                  confirming ||
                  state.result.rows.length === 0 ||
                  unresolvedAmbiguousCount > 0
                }
                className="self-start"
              >
                この内容で取り込む
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
