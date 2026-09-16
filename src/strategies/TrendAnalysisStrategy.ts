import { Transaction } from '../models.js';
import { HistoricalDataService } from '../services/HistoricalDataService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class TrendAnalysisStrategy implements AuditStrategy {
  public readonly name = 'Historical Trend Auditor';
  public readonly description =
    'Compares current monthly category spending against historical averages';

  public async execute(
    transactions: Transaction[],
    _customParam?: string,
  ): Promise<string> {
    const historicalAverages =
      await HistoricalDataService.getHistoricalAverages();
    const currentSpending = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.amount < 0) {
        const categoryTotal = currentSpending.get(transaction.category) ?? 0;
        currentSpending.set(
          transaction.category,
          categoryTotal + Math.abs(transaction.amount),
        );
      }
    }

    const comparisons = [...currentSpending.entries()]
      .sort(([firstCategory], [secondCategory]) =>
        firstCategory.localeCompare(secondCategory),
      )
      .map(([category, current]) => {
        const historical = historicalAverages[category];
        const variance =
          historical !== undefined && historical !== 0
            ? ((current - historical) / historical) * 100
            : undefined;

        return { category, current, historical, variance };
      });

    const growth = comparisons.filter(
      (comparison) =>
        comparison.variance !== undefined && comparison.variance > 20,
    );
    const savings = comparisons.filter(
      (comparison) =>
        comparison.variance !== undefined && comparison.variance < -20,
    );

    const reportLines = [
      'HISTORICAL TREND AUDIT REPORT',
      '',
      'Category | Current Spending | Historical Average | Variance',
      '-------- | ----------------- | ------------------ | --------',
    ];

    for (const comparison of comparisons) {
      const historical =
        comparison.historical === undefined
          ? 'N/A'
          : `$${comparison.historical.toFixed(2)}`;
      const variance =
        comparison.variance === undefined
          ? 'N/A'
          : `${comparison.variance > 0 ? '+' : ''}${comparison.variance.toFixed(1)}%`;

      reportLines.push(
        `${comparison.category} | $${comparison.current.toFixed(2)} | ${historical} | ${variance}`,
      );
    }

    reportLines.push('', 'Significant Growth Categories');
    if (growth.length === 0) {
      reportLines.push('None');
    } else {
      for (const comparison of growth) {
        reportLines.push(
          `- ${comparison.category}: +${comparison.variance!.toFixed(1)}%`,
        );
      }
    }

    reportLines.push('', 'Significant Savings Categories');
    if (savings.length === 0) {
      reportLines.push('None');
    } else {
      for (const comparison of savings) {
        reportLines.push(
          `- ${comparison.category}: ${comparison.variance!.toFixed(1)}%`,
        );
      }
    }

    return reportLines.join('\n');
  }
}
