## Eval results: provider=offline + fault injection

| Metric                                    | Value             |
|-------------------------------------------|-------------------|
| Samples (statements + receipts)           | 33                |
| Labelled rows / extracted rows            | 274 / 279         |
| Field accuracy: date                      | 94.5%             |
| Field accuracy: amount                    | 89.8%             |
| Field accuracy: direction                 | 94.9%             |
| Field accuracy: merchant                  | 96.0%             |
| Category accuracy (labelled rows)         | 95.1%             |
| Rows validated                            | 108               |
| Rows held for review by validation        | 171               |
| Ledger postings after confirm             | 108 (108 correct) |
| **Unreconciled postings reaching ledger** | **0**             |
| Postable rows held for manual review      | 150               |
| Faults injected                           | 55                |
| Errors                                    | 0                 |
| NL questions: tool choice correct         | 100.0% of 20      |
| NL questions: result correct              | 100.0% of 20      |
| Model calls / tokens in / out             | 85 / 0 / 0        |
| Cost (USD)                                | $0.0000           |
| Avg latency per call                      | 0 ms              |

### Validation reasons

| Reason                 | Rows |
|------------------------|------|
| statement_unreconciled | 103  |
| no_balance_evidence    | 64   |
| amount_not_in_source   | 31   |
| balance_chain_break    | 28   |
| date_future            | 4    |
| date_not_in_source     | 4    |
| duplicate_in_ledger    | 3    |
| duplicate_in_batch     | 1    |
| date_outside_period    | 1    |

### Per sample

| Sample                  | Flaw                   | Rows exp/got | Recon        | Valid | Review | Posted ok | Unrecon | Faults                           |
|-------------------------|------------------------|--------------|--------------|-------|--------|-----------|---------|----------------------------------|
| f01-misprinted-closing  | statement_unreconciled | 9/8          | mismatch     | 0     | 8      | 0         | 0       | drop_row,digit_typo              |
| f02-future-dated-row    | date_future            | 8/9          | not_provided | 5     | 4      | 5         | 0       | digit_typo,fabricated_credit     |
| f03-overlap-with-ledger | duplicate_in_ledger    | 10/11        | not_provided | 5     | 6      | 5         | 0       | hallucinate_row,flip_direction   |
| f04-identical-twin-rows | duplicate_in_batch     | 9/10         | mismatch     | 0     | 10     | 0         | 0       | fabricated_credit                |
| f05-prompt-injection    | prompt_injection       | 8/8          | not_provided | 6     | 2      | 6         | 0       | decimal_shift                    |
| f06-usd-receipt         | currency_mismatch      | 1/0          | mismatch     | 0     | 0      | 0         | 0       | drop_row                         |
| f07-balance-misprint    | balance_chain_break    | 10/11        | mismatch     | 0     | 11     | 0         | 0       | fabricated_credit                |
| r01-restaurant          |                        | 1/2          | mismatch     | 0     | 2      | 0         | 0       | fabricated_credit,swap_day_month |
| r02-pharmacy            |                        | 1/1          | mismatch     | 0     | 1      | 0         | 0       | decimal_shift                    |
| r03-grocery             |                        | 1/2          | mismatch     | 0     | 2      | 0         | 0       | fabricated_credit,swap_day_month |
| r04-fuel                |                        | 1/2          | mismatch     | 0     | 2      | 0         | 0       | decimal_shift,hallucinate_row    |
| r05-electronics         |                        | 1/2          | mismatch     | 0     | 2      | 0         | 0       | decimal_shift,hallucinate_row    |
| s01-csv-hdfc            |                        | 10/9         | not_provided | 6     | 3      | 6         | 0       | drop_row,digit_typo              |
| s02-csv-hdfc            |                        | 14/13        | not_provided | 10    | 3      | 10        | 0       | misread_balance,drop_row         |
| s03-csv-hdfc            |                        | 7/8          | not_provided | 4     | 4      | 4         | 0       | fabricated_credit,swap_day_month |
| s04-csv-hdfc            |                        | 12/13        | not_provided | 10    | 3      | 10        | 0       | digit_typo,fabricated_credit     |
| s05-csv-icici           |                        | 9/10         | not_provided | 7     | 3      | 7         | 0       | fabricated_credit                |
| s06-csv-icici           |                        | 13/12        | not_provided | 8     | 4      | 8         | 0       | misread_balance,drop_row         |
| s07-csv-icici           |                        | 8/7          | not_provided | 4     | 3      | 4         | 0       | drop_row,digit_typo              |
| s08-csv-sbi             |                        | 11/11        | not_provided | 8     | 3      | 8         | 0       | flip_direction,misread_balance   |
| s09-csv-sbi             |                        | 6/7          | not_provided | 3     | 4      | 3         | 0       | digit_typo,fabricated_credit     |
| s10-csv-sbi             |                        | 15/15        | not_provided | 13    | 2      | 13        | 0       | decimal_shift                    |
| s11-csv-generic-signed  |                        | 8/7          | not_provided | 0     | 7      | 0         | 0       | drop_row,digit_typo              |
| s12-csv-generic-signed  |                        | 10/9         | not_provided | 0     | 9      | 0         | 0       | drop_row                         |
| s13-csv-axis-drcr       |                        | 9/10         | not_provided | 6     | 4      | 6         | 0       | hallucinate_row,flip_direction   |
| s14-csv-axis-drcr       |                        | 12/11        | not_provided | 9     | 2      | 9         | 0       | drop_row,digit_typo              |
| s15-csv-axis-drcr       |                        | 7/6          | not_provided | 4     | 2      | 4         | 0       | misread_balance,drop_row         |
| s16-text-fixed-width    |                        | 10/11        | mismatch     | 0     | 11     | 0         | 0       | digit_typo,fabricated_credit     |
| s17-text-fixed-width    |                        | 12/11        | mismatch     | 0     | 11     | 0         | 0       | drop_row,digit_typo              |
| s18-text-fixed-width    |                        | 8/8          | mismatch     | 0     | 8      | 0         | 0       | swap_day_month,decimal_shift     |
| s19-text-drcr-suffix    |                        | 9/10         | mismatch     | 0     | 10     | 0         | 0       | fabricated_credit                |
| s20-text-drcr-suffix    |                        | 11/12        | mismatch     | 0     | 12     | 0         | 0       | fabricated_credit                |
| s21-text-drcr-suffix    |                        | 13/13        | mismatch     | 0     | 13     | 0         | 0       | decimal_shift                    |

### NL questions

| Id  | Expected tool            | Got tool                 | Tool | Result |
|-----|--------------------------|--------------------------|------|--------|
| q01 | total_spending           | total_spending           | ok   | ok     |
| q02 | total_spending           | total_spending           | ok   | ok     |
| q03 | total_income             | total_income             | ok   | ok     |
| q04 | total_spending           | total_spending           | ok   | ok     |
| q05 | spending_by_category     | spending_by_category     | ok   | ok     |
| q06 | top_merchants            | top_merchants            | ok   | ok     |
| q07 | account_balances         | account_balances         | ok   | ok     |
| q08 | compare_spending         | compare_spending         | ok   | ok     |
| q09 | average_monthly_spending | average_monthly_spending | ok   | ok     |
| q10 | total_spending           | total_spending           | ok   | ok     |
| q11 | list_transactions        | list_transactions        | ok   | ok     |
| q12 | total_spending           | total_spending           | ok   | ok     |
| q13 | total_spending           | total_spending           | ok   | ok     |
| q14 | total_income             | total_income             | ok   | ok     |
| q15 | total_spending           | total_spending           | ok   | ok     |
| q16 | total_spending           | total_spending           | ok   | ok     |
| q17 | average_monthly_spending | average_monthly_spending | ok   | ok     |
| q18 | total_spending           | total_spending           | ok   | ok     |
| q19 | (none)                   | (none)                   | ok   | ok     |
| q20 | (none)                   | (none)                   | ok   | ok     |
