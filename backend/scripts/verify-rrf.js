//
// Checks the rank-fusion maths that hybrid search ranks results with. rrf.js deliberately has no
// imports, so this runs with nothing set up — no database, no Redis, no keys:  npm run verify:rrf
//
import { fuse, K } from "../src/modules/search/rrf.js";

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label} ${detail}`); }
};

console.log(`K = ${K}`);

// The whole point: a post both retrievers found outranks a post only one of them found, even when the
// single-list post is that list's number one.
let out = fuse(
  [
    { name: "keyword", rows: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    { name: "semantic", rows: [{ id: 9 }, { id: 3 }, { id: 4 }] },
  ],
  5,
);
check("agreement beats a single top hit", out[0].id === 3, `got ${out[0].id}, order ${out.map((r) => r.id)}`);
check("matchedBy names both retrievers", out[0].matchedBy.join() === "keyword,semantic", out[0].matchedBy);
check("both number ones come next", [out[1].id, out[2].id].sort().join() === "1,9", out.map((r) => r.id));

// Ranks, not scores.
const tiny = fuse([{ name: "k", rows: [{ id: 1, score: 0.001 }, { id: 2, score: 0.0009 }] }], 2);
const huge = fuse([{ name: "k", rows: [{ id: 1, score: 950 }, { id: 2, score: 2 }] }], 2);
check("scores are ignored entirely", JSON.stringify(tiny.map((r) => r.id)) === JSON.stringify(huge.map((r) => r.id)));

out = fuse([{ name: "k", rows: [{ id: 7 }, { id: 8 }, { id: 9 }] }], 10);
check("a single list keeps its order", out.map((r) => r.id).join() === "7,8,9", out.map((r) => r.id));

out = fuse([{ name: "k", rows: [{ id: 1 }, { id: 1 }] }], 5);
check("a duplicate id votes once", out.length === 1 && out[0].matchedBy.length === 1, JSON.stringify(out));

check("empty input is an empty result", fuse([], 5).length === 0);
check("a list of empty lists is empty too", fuse([{ name: "k", rows: [] }], 5).length === 0);
check("limit is respected", fuse([{ name: "k", rows: Array.from({ length: 50 }, (_, i) => ({ id: i })) }], 5).length === 5);

out = fuse([{ name: "s", rows: [11, 12] }], 2);
check("bare ids work as well as rows", out.map((r) => r.id).join() === "11,12", out.map((r) => r.id));

out = fuse([{ name: "s", rows: [{ id: null }, { id: "not-a-number" }, { id: 5 }] }], 5);
check("junk ids are dropped, not NaN'd into the result", out.length === 1 && out[0].id === 5, JSON.stringify(out));

// Ties must be deterministic, or the same search returns a different order each call.
const a = fuse([{ name: "k", rows: [{ id: 4 }] }, { name: "s", rows: [{ id: 2 }] }], 5).map((r) => r.id);
const b = fuse([{ name: "s", rows: [{ id: 2 }] }, { name: "k", rows: [{ id: 4 }] }], 5).map((r) => r.id);
check("a tie breaks the same way regardless of list order", a.join() === b.join(), `${a} vs ${b}`);

// Sanity on the actual arithmetic, so a refactor that inverts the formula gets caught.
out = fuse([{ name: "k", rows: [{ id: 1 }] }, { name: "s", rows: [{ id: 1 }] }], 1);
check("a doubly-found post scores 2/(K+1)", Math.abs(out[0].score - 2 / (K + 1)) < 1e-12, out[0].score);

console.log(failures ? `\n${failures} failed` : "\nall good");
process.exit(failures ? 1 : 0);
