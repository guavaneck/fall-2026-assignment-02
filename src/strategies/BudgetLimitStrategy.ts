import { Transaction } from '../models.js';
import { BudgetService } from '../services/BudgetService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class BudgetLimitStrategy implements AuditStrategy {
  public readonly name = 'Budget Limit Auditor';
  public readonly description =
    'Checks category spending against monthly budget limits';

  public async execute(
    transactions: Transaction[],
    _customParam?: string,
  ): Promise<string> {
    // 1. Call BudgetService.getCategoryBudgets() asynchronously.
    const budgets = await BudgetService.getCategoryBudgets();

    // 2. Group expenses (amounts < 0) by category and compute total spending for each category.
    const expensesByCategory = new Map<
      string,
      { total: number; transactions: Transaction[] }
    >();

    for (const transaction of transactions) {
      if (transaction.amount >= 0) continue;

      const categoryExpenses = expensesByCategory.get(transaction.category) ?? {
        total: 0,
        transactions: [],
      };
      categoryExpenses.total += Math.abs(transaction.amount);
      categoryExpenses.transactions.push(transaction);
      expensesByCategory.set(transaction.category, categoryExpenses);
    }

    // 3. Compare spending against the fetched limits.
    const categories = [
      ...new Set([...Object.keys(budgets), ...expensesByCategory.keys()]),
    ].sort();
    const categoryResults = categories.map((category) => ({
      category,
      limit: budgets[category],
      actual: expensesByCategory.get(category)?.total ?? 0,
      transactions: expensesByCategory.get(category)?.transactions ?? [],
    }));

    // 4. Identify overages (categories where spending exceeds the budget).
    const overBudgetCategories = categoryResults.flatMap((result) => {
      const limit = result.limit;
      if (limit === undefined || result.actual <= limit) return [];

      return {
        ...result,
        overage: result.actual - limit,
        percentageUsed:
          limit === 0
            ? 'N/A'
            : `${((result.actual / limit) * 100).toFixed(1)}%`,
      };
    });

    // 5. Format and return a text-based audit report outlining limits, actuals, overage amounts, percentages, and lists of transactions causing the overage.
    const lines = ['BUDGET LIMIT AUDIT REPORT', '', 'SUMMARY'];
    if (categoryResults.length === 0) {
      lines.push('No budget categories or expenses found.');
    } else {
      for (const result of categoryResults) {
        const limitText =
          result.limit === undefined
            ? 'No budget configured'
            : `$${result.limit.toFixed(2)}`;
        lines.push(
          `${result.category}: Budget ${limitText} | Actual $${result.actual.toFixed(2)}`,
        );
      }
    }

    lines.push('', 'WARNINGS');
    if (overBudgetCategories.length === 0) {
      lines.push('No categories are over budget.');
    } else {
      for (const result of overBudgetCategories) {
        lines.push(
          `${result.category}: OVER BUDGET by $${result.overage.toFixed(2)} (${result.percentageUsed} of budget)`,
        );
      }
    }

    lines.push('', 'OVER-BUDGET TRANSACTIONS');
    if (overBudgetCategories.length === 0) {
      lines.push('No over-budget transactions.');
    } else {
      for (const result of overBudgetCategories) {
        lines.push(result.category);
        for (const transaction of result.transactions) {
          lines.push(
            `- ${transaction.date} | ${transaction.description} | $${Math.abs(transaction.amount).toFixed(2)} | ${transaction.status}`,
          );
        }
      }
    }

    return lines.join('\n');
  }
}
