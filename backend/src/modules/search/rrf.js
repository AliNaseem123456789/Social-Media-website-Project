/**
 * Reciprocal rank fusion.
 *
 * Keyword search and vector search return scores on unrelated scales — ts_rank is roughly 0 to 1 but
 * bunched near zero, cosine similarity is -1 to 1 and rarely below 0.5 for anything plausible. Weighting
 * them against each other directly is guesswork that breaks the moment either side changes. RRF sidesteps
 * the problem by throwing the scores away and reading only each retriever's own ordering: a post's score
 * is the sum of 1/(K + rank) across the lists it appears in.
 *
 * The useful consequence is that agreement wins. A post both retrievers found halfway down their lists
 * outranks a post only one of them found at the top, which is exactly the judgement you want — two
 * independent methods pointing at the same result is strong evidence, one method's favourite is not.
 *
 * K = 60 is the value from Cormack, Clarke and Buettcher (2009) and needs no tuning: large enough that
 * ranks 1 and 2 are not wildly far apart, small enough that the long tail stops contributing.
 *
 * Deliberately free of imports so it can be reasoned about, and tested, on its own.
 */

export const K = 60;

/**
 * @param {Array<{name: string, rows: Array<{id: number|string}|number|string>}>} lists
 *        One entry per retriever, each already in that retriever's preferred order.
 * @param {number} limit
 * @returns {Array<{id: number, score: number, matchedBy: string[]}>} best first
 */
export function fuse(lists, limit) {
  const scores = new Map();
  const sources = new Map();

  for (const { name, rows } of lists) {
    // A retriever that returns the same id twice should not get to vote twice.
    const seen = new Set();
    rows.forEach((row, index) => {
      const raw = typeof row === "object" && row !== null ? row.id : row;
      // Number(null) and Number("") are both 0, which would quietly add a post 0 to the results, so the
      // emptiness check has to come before the cast rather than relying on Number.isFinite afterwards.
      if (raw === null || raw === undefined || raw === "") return;
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return;
      seen.add(id);

      scores.set(id, (scores.get(id) ?? 0) + 1 / (K + index + 1));
      sources.set(id, [...(sources.get(id) ?? []), name]);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score, matchedBy: sources.get(id) }));
}
