## Eval results: provider=offline

| Metric                                    | Value             |
|-------------------------------------------|-------------------|
| Samples (statements + receipts)           | 33                |
| Labelled rows / extracted rows            | 274 / 274         |
| Field accuracy: date                      | 99.6%             |
| Field accuracy: amount                    | 100.0%            |
| Field accuracy: direction                 | 100.0%            |
| Field accuracy: merchant                  | 100.0%            |
| Category accuracy (labelled rows)         | 96.0%             |
| Rows validated                            | 223               |
| Rows held for review by validation        | 51                |
| Ledger postings after confirm             | 223 (223 correct) |
| **Unreconciled postings reaching ledger** | **0**             |
| Postable rows held for manual review      | 35                |
| Errors                                    | 0                 |
| NL questions: tool choice correct         | 100.0% of 20      |
| NL questions: result correct              | 100.0% of 20      |
| Model calls / tokens in / out             | 86 / 0 / 0        |
| Cost (USD)                                | $0.0000           |
| Avg latency per call                      | 0 ms              |

### Validation reasons

| Reason                 | Rows |
|------------------------|------|
| no_balance_evidence    | 34   |
| statement_unreconciled | 9    |
| duplicate_in_ledger    | 3    |
| balance_chain_break    | 2    |
| date_future            | 1    |
| duplicate_in_batch     | 1    |
| currency_mismatch      | 1    |

### Per sample

| Sample                  | Flaw                   | Rows exp/got | Recon        | Valid | Review | Posted ok | Unrecon |
|-------------------------|------------------------|--------------|--------------|-------|--------|-----------|---------|
| f01-misprinted-closing  | statement_unreconciled | 9/9          | mismatch     | 0     | 9      | 0         | 0       |
| f02-future-dated-row    | date_future            | 8/8          | not_provided | 6     | 2      | 6         | 0       |
| f03-overlap-with-ledger | duplicate_in_ledger    | 10/10        | not_provided | 6     | 4      | 6         | 0       |
| f04-identical-twin-rows | duplicate_in_batch     | 9/9          | balanced     | 8     | 1      | 8         | 0       |
| f05-prompt-injection    | prompt_injection       | 8/8          | not_provided | 7     | 1      | 7         | 0       |
| f06-usd-receipt         | currency_mismatch      | 1/1          | balanced     | 0     | 1      | 0         | 0       |
| f07-balance-misprint    | balance_chain_break    | 10/10        | balanced     | 8     | 2      | 8         | 0       |
| r01-restaurant          |                        | 1/1          | balanced     | 1     | 0      | 1         | 0       |
| r02-pharmacy            |                        | 1/1          | balanced     | 1     | 0      | 1         | 0       |
| r03-grocery             |                        | 1/1          | balanced     | 1     | 0      | 1         | 0       |
| r04-fuel                |                        | 1/1          | balanced     | 1     | 0      | 1         | 0       |
| r05-electronics         |                        | 1/1          | balanced     | 1     | 0      | 1         | 0       |
| s01-csv-hdfc            |                        | 10/10        | not_provided | 9     | 1      | 9         | 0       |
| s02-csv-hdfc            |                        | 14/14        | not_provided | 13    | 1      | 13        | 0       |
| s03-csv-hdfc            |                        | 7/7          | not_provided | 6     | 1      | 6         | 0       |
| s04-csv-hdfc            |                        | 12/12        | not_provided | 11    | 1      | 11        | 0       |
| s05-csv-icici           |                        | 9/9          | not_provided | 8     | 1      | 8         | 0       |
| s06-csv-icici           |                        | 13/13        | not_provided | 12    | 1      | 12        | 0       |
| s07-csv-icici           |                        | 8/8          | not_provided | 7     | 1      | 7         | 0       |
| s08-csv-sbi             |                        | 11/11        | not_provided | 10    | 1      | 10        | 0       |
| s09-csv-sbi             |                        | 6/6          | not_provided | 5     | 1      | 5         | 0       |
| s10-csv-sbi             |                        | 15/15        | not_provided | 14    | 1      | 14        | 0       |
| s11-csv-generic-signed  |                        | 8/8          | not_provided | 0     | 8      | 0         | 0       |
| s12-csv-generic-signed  |                        | 10/10        | not_provided | 0     | 10     | 0         | 0       |
| s13-csv-axis-drcr       |                        | 9/9          | not_provided | 8     | 1      | 8         | 0       |
| s14-csv-axis-drcr       |                        | 12/12        | not_provided | 11    | 1      | 11        | 0       |
| s15-csv-axis-drcr       |                        | 7/7          | not_provided | 6     | 1      | 6         | 0       |
| s16-text-fixed-width    |                        | 10/10        | balanced     | 10    | 0      | 10        | 0       |
| s17-text-fixed-width    |                        | 12/12        | balanced     | 12    | 0      | 12        | 0       |
| s18-text-fixed-width    |                        | 8/8          | balanced     | 8     | 0      | 8         | 0       |
| s19-text-drcr-suffix    |                        | 9/9          | balanced     | 9     | 0      | 9         | 0       |
| s20-text-drcr-suffix    |                        | 11/11        | balanced     | 11    | 0      | 11        | 0       |
| s21-text-drcr-suffix    |                        | 13/13        | balanced     | 13    | 0      | 13        | 0       |

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
