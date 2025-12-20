import { logInfo } from '../lib/logger';

/**
 * Searches Gmail threads using the same query syntax as Gmail's search box.
 *
 * @param {string} query - Gmail search query (e.g., "newer_than:7d label:inbox").
 * @param {number} maxThreads - Maximum number of threads to return.
 * @returns {GoogleAppsScript.Gmail.GmailThread[]} Matching threads.
 */
export function searchThreads(query: string, maxThreads: number): GoogleAppsScript.Gmail.GmailThread[] {
  logInfo('searchThreads()', { query, maxThreads });
  return GmailApp.search(query, 0, maxThreads);
}

/**
 * Extracts basic metadata from threads (useful for logging/debugging).
 *
 * @param {GoogleAppsScript.Gmail.GmailThread[]} threads - Threads returned by GmailApp.search.
 * @returns {{ subject: string; messageCount: number; lastUpdated: string }[]} Summaries.
 */
export function summarizeThreads(
  threads: GoogleAppsScript.Gmail.GmailThread[]
): { subject: string; messageCount: number; lastUpdated: string }[] {
  logInfo('summarizeThreads()', { count: threads.length });

  return threads.map((t) => ({
    subject: t.getFirstMessageSubject(),
    messageCount: t.getMessageCount(),
    lastUpdated: t.getLastMessageDate().toISOString()
  }));
}
