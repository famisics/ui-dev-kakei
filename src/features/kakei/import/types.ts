export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  externalId?: string;
};

export type CardParser = (
  fileBuffer: Buffer,
) => ParsedTransaction[] | Promise<ParsedTransaction[]>;
