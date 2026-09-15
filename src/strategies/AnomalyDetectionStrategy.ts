import { Transaction } from '../models.js';
import { AnomalyRulesService } from '../services/AnomalyRulesService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class AnomalyDetectionStrategy implements AuditStrategy {
  public readonly name = 'Anomaly & Duplicate Auditor';
  public readonly description =
    'Detects transactions exceeding thresholds and duplicate records';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {

    const rules = await AnomalyRulesService.getRules();

    // Outliers
    const outliers  = transactions.filter(transaction => Math.abs(transaction.amount) > rules.maxTransactionAmount);
  

    // Duplicates
    const duplicateMap = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = `${t.date}|${t.category}|${t.description}|${t.amount}`;t
      const duplicate = duplicateMap.get(key) ?? [];
      duplicate.push(t);
      duplicateMap.set(key, duplicate);
    }
    const duplicateSets = [...duplicateMap.values()].filter(set => set.length > 1);
    const duplicateCount = duplicateSets.reduce((count, set) => count + set.length, 0);

    //Flagged
    const flagged = transactions.filter(transaction => rules.flaggedStatuses.includes(transaction.status));
    const flaggedTotal = flagged.reduce((total, transaction) => total + transaction.amount, 0);

    //Anomaly
    const anomalyCount = outliers.length + duplicateCount + flagged.length;
    const anomalyRate = transactions.length ? (anomalyCount / transactions.length) * 100 : 0;


    //Report
    const line = (t: Transaction) => `- ${t.date} | ${t.category} | ${t.description} | $${t.amount.toFixed(2)}`;
    
    const report: string = [
      'Anomaly Detection Report',
      '---------------------',
      `Outliers (over $${rules.maxTransactionAmount}):`,
      outliers.map(line).join('\n') || '(None)',
      '',
      'Duplicate Transactions:',
      duplicateSets.map((g, i) => `  Set ${i + 1}:\n` + g.map(line).join('\n')).join('\n') || '  (none)',
      '',
      'Flagged Transactions:',
      flagged.map(t => `${line(t)} (${t.status})`).join('\n') || '(None)',
      '',
      `Total Transactions: ${transactions.length}`,
      `Total Anomalies: ${anomalyCount}`,
      `Anomaly Rate: ${anomalyRate}%`,
      `Total Flagged Value: $${flaggedTotal.toFixed(2)}`,

    ].join('\n');
    
    return report;

    // TODO: Feature 2 - Implement this strategy.
    // 1. Call AnomalyRulesService.getRules() asynchronously.
    // 2. Scan transactions to find outliers (expenses exceeding rules.maxTransactionAmount).
    // 3. Scan to identify duplicates (transactions sharing the exact same date, category, description, and amount).
    // 4. Identify transactions having a status that matches any in rules.flaggedStatuses.
    // 5. Calculate total flagged value and anomaly rates.
    // 6. Format and return a text-based audit report of anomalies, duplicate sets, and totals.

    throw new Error('Method not implemented.');
  }
}
