import { z } from 'zod';

/**
 * Contracts between the LLM and deterministic code.
 *
 * The model only ever produces data matching these schemas. Amounts stay as
 * decimal strings here on purpose: conversion to integer minor units happens in
 * validation.ts with string arithmetic, never via parseFloat.
 */

export const ExtractedRowSchema = z.strictObject({
  date: z.string().describe('Transaction date exactly as ISO YYYY-MM-DD'),
  amount: z
    .string()
    .describe('Absolute amount as a plain decimal string, e.g. "1245.50". No currency symbol, no sign.'),
  merchant: z.string().describe('Merchant, payee or narration, trimmed'),
  direction: z.enum(['debit', 'credit']).describe('debit = money out of the account, credit = money in'),
  balance_after: z
    .string()
    .nullable()
    .describe('Running balance printed on this row as a decimal string, or null if the document has no balance column'),
});

export const ExtractionSchema = z.strictObject({
  document_type: z.enum(['statement', 'receipt']),
  currency: z.string().describe('ISO 4217 code, e.g. INR'),
  period_start: z.string().nullable().describe('Statement period start YYYY-MM-DD, or null'),
  period_end: z.string().nullable().describe('Statement period end YYYY-MM-DD, or null'),
  opening_balance: z.string().nullable().describe('Opening balance as a decimal string, or null if not printed'),
  closing_balance: z.string().nullable().describe('Closing balance as a decimal string, or null if not printed'),
  stated_total: z
    .string()
    .nullable()
    .describe('For receipts: the grand total printed on the receipt. Null for statements.'),
  rows: z.array(ExtractedRowSchema),
});

export type ExtractedRow = z.infer<typeof ExtractedRowSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

export const CategorizationSchema = z.strictObject({
  assignments: z.array(
    z.strictObject({
      index: z.number().int(),
      category_id: z.string().nullable(),
    })
  ),
});

export type Categorization = z.infer<typeof CategorizationSchema>;
