export type CategoryType = "income" | "expense";
export type TransactionSource = "manual" | "import";
export type ImportFormatKey = "jcb" | "debit" | "rakuten" | "vpass";
export type ImportSourceType = "csv" | "pdf";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  parent_id: string | null;
  import_keywords: string[] | null;
  default_key: string | null;
  created_at: string;
};

export type ImportSource = {
  id: string;
  user_id: string;
  name: string;
  format_key: ImportFormatKey;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: CategoryType;
  category_id: string | null;
  description: string | null;
  memo: string | null;
  source: TransactionSource;
  import_source_id: string | null;
  sort_order: number;
  created_at: string;
};

export type ImportBatch = {
  id: string;
  user_id: string;
  import_source_id: string;
  file_name: string;
  source_type: ImportSourceType;
  imported_at: string;
  matched_count: number;
  created_count: number;
  duplicate_count: number;
};

export type StatementEntry = {
  id: string;
  user_id: string;
  import_source_id: string;
  transaction_id: string;
  entry_key: string;
  fingerprint: string;
  occurrence: number;
  external_id: string | null;
  date: string;
  amount: number;
  type: CategoryType;
  description: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
        Relationships: [];
      };
      import_sources: {
        Row: ImportSource;
        Insert: Partial<ImportSource>;
        Update: Partial<ImportSource>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Partial<Transaction>;
        Update: Partial<Transaction>;
        Relationships: [];
      };
      import_batches: {
        Row: ImportBatch;
        Insert: Partial<ImportBatch>;
        Update: Partial<ImportBatch>;
        Relationships: [];
      };
      statement_entries: {
        Row: StatementEntry;
        Insert: Partial<StatementEntry>;
        Update: Partial<StatementEntry>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
