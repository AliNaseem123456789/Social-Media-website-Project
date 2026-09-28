/**
 * Read-only report on the shape of the database this deployment is pointed at.
 *
 * The database is shared with an older deployment and with the AI assistant, so a table this
 * application expects may already exist under the same name in a different shape. Every migration
 * uses CREATE TABLE IF NOT EXISTS, which leaves such a table alone, and the mismatch only shows up
 * later as "column does not exist" at runtime. This prints the mismatches instead.
 *
 *   npm run db:doctor
 */

import { prisma } from "#core/db/prisma.js";

const EXPECTED = {
  users: ["id", "username", "email", "password"],
  posts: ["post_id", "user_id", "content", "created_at", "search_vector"],
  comments: ["comment_id", "post_id", "user_id", "parent_comment_id", "updated_at"],
  likes: ["like_id", "user_id", "post_id"],
  messages: ["from_user", "to_user", "message", "created_at"],
  auth_tokens: ["id", "user_id", "type", "token_hash", "payload"],
  auth_sessions: ["id", "user_id", "refresh_token_hash"],
  chat_threads: ["id", "type", "title", "image_url", "direct_key", "created_by", "last_message_at"],
  chat_thread_members: ["conversation_id", "user_id", "role", "last_read_message_id", "muted"],
  chat_messages: ["id", "conversation_id", "sender_id", "body", "image_url", "legacy_message_id", "deleted_at"],
  post_saves: ["user_id", "post_id", "created_at"],
  post_references: ["post_id", "referenced_post_id"],
  post_hashtags: ["post_id", "tag"],
  post_images: ["post_id", "url", "alt", "position"],
  post_drafts: ["user_id", "content", "image_urls", "scheduled_for", "published_post_id"],
  comment_likes: ["comment_id", "user_id"],
  follows: ["follower_id", "following_id"],
  user_settings: ["user_id", "profile_visibility", "theme", "allow_messages_from"],
  call_logs: ["room_id", "caller_id", "callee_id", "status"],
  blocks: ["blocker_id", "blocked_id"],
  reports: ["reporter_id", "subject_type", "subject_id", "status", "reviewed_by"],
};

const PARENTS = [
  ["post_saves", "post_id", "posts", "post_id"],
  ["post_saves", "user_id", "users", "id"],
  ["post_references", "post_id", "posts", "post_id"],
  ["post_references", "referenced_post_id", "posts", "post_id"],
  ["post_hashtags", "post_id", "posts", "post_id"],
  ["post_images", "post_id", "posts", "post_id"],
  ["comment_likes", "comment_id", "comments", "comment_id"],
  ["follows", "follower_id", "users", "id"],
  ["follows", "following_id", "users", "id"],
  ["likes", "post_id", "posts", "post_id"],
  ["comments", "post_id", "posts", "post_id"],
  ["chat_messages", "conversation_id", "chat_threads", "id"],
  ["chat_thread_members", "conversation_id", "chat_threads", "id"],
];

const problems = [];
const note = (line) => problems.push(line);
const ident = (name) => `"${name.replace(/"/g, '""')}"`;

async function columnsOf(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    table,
  );
  return rows.map((r) => r.column_name);
}

async function exists(table) {
  const [row] = await prisma.$queryRawUnsafe(`SELECT to_regclass($1) IS NOT NULL AS present`, `public.${table}`);
  return row.present;
}

async function count(sql) {
  const [row] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${sql}`);
  return row.n;
}

async function tables() {
  console.log("--- tables and columns ---");
  for (const [table, expected] of Object.entries(EXPECTED)) {
    if (!(await exists(table))) {
      console.log(`  MISSING  ${table}`);
      note(`${table} does not exist. Run: npx prisma migrate deploy`);
      continue;
    }
    const present = await columnsOf(table);
    const missing = expected.filter((c) => !present.includes(c));
    const rows = await count(ident(table));
    if (missing.length === 0) {
      console.log(`  ok       ${table} (${rows} rows)`);
      continue;
    }
    console.log(`  SHAPE    ${table} (${rows} rows) is missing: ${missing.join(", ")}`);
    console.log(`           it has: ${present.join(", ")}`);
    note(`${table} exists but is missing ${missing.join(", ")}. Something else created it first, so the migration that would have created it did nothing.`);
  }
}

async function collision() {
  console.log("\n--- name collisions with the AI assistant ---");
  if (!(await exists("conversations"))) {
    console.log("  ok       nothing named conversations");
    return;
  }
  const present = await columnsOf("conversations");
  const rows = await count('"conversations"');
  const assistants = ["role", "intent", "content"].every((c) => present.includes(c));
  console.log(`  conversations (${rows} rows): ${present.join(", ")}`);
  if (assistants) {
    console.log("  ok       that is the assistant's table. Chat uses chat_threads and leaves it alone.");
  } else if (present.includes("direct_key")) {
    console.log("  note     an old chat table of ours. Migration 4 carried its rows into chat_threads.");
  } else {
    note("conversations exists and belongs to neither the assistant nor this app. Worth a look.");
  }

  for (const leftover of ["conversation_members", "conversation_messages"]) {
    if (!(await exists(leftover))) continue;
    const rows = await count(ident(leftover));
    console.log(`  ${leftover} (${rows} rows): no longer used by this application`);
    if (rows === 0) note(`${leftover} is an empty leftover of the old chat tables. Safe to drop by hand whenever you like.`);
  }
}

async function keys() {
  console.log("\n--- foreign keys and rows pointing at nothing ---");
  for (const [child, column, parent, parentColumn] of PARENTS) {
    if (!(await exists(child)) || !(await exists(parent))) continue;
    const present = await columnsOf(child);
    if (!present.includes(column)) continue;

    const [fk] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n
       FROM pg_constraint k
       JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
       WHERE k.conrelid = $1::regclass AND k.contype = 'f' AND a.attname = $2`,
      `public.${child}`,
      column,
    );
    const orphans = await count(
      `${ident(child)} c WHERE c.${ident(column)} IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM ${ident(parent)} p WHERE p.${ident(parentColumn)} = c.${ident(column)})`,
    );

    const label = `${child}.${column} -> ${parent}.${parentColumn}`;
    if (fk.n > 0 && orphans === 0) {
      console.log(`  ok       ${label}`);
      continue;
    }
    console.log(`  ${orphans > 0 ? "ORPHANS " : "NO FK   "} ${label}${fk.n === 0 ? " (no foreign key)" : ""}${orphans > 0 ? ` (${orphans} rows)` : ""}`);
    note(`${label}: ${fk.n === 0 ? "no foreign key" : "foreign key present"}, ${orphans} orphaned row(s).`);
  }
}

async function legacyKey() {
  console.log("\n--- the legacy messages table ---");
  if (!(await exists("messages"))) {
    console.log("  note     no messages table, so there is no history to import");
    return;
  }
  const [key] = await prisma.$queryRawUnsafe(
    `SELECT a.attname AS column_name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = 'public.messages'::regclass AND i.indisprimary
       AND array_length(i.indkey::int[], 1) = 1`,
  );
  const imported = (await exists("chat_messages")) ? await count('"chat_messages" c WHERE c.legacy_message_id IS NOT NULL') : 0;
  const total = await count('"messages"');
  console.log(`  primary key: ${key?.column_name ?? "none found"}`);
  console.log(`  messages holds ${total} row(s); ${imported} chat message(s) are linked to one`);
  if (key && key.column_name !== "id") {
    note(`messages uses "${key.column_name}" as its primary key, not "id". The Prisma Message model maps id -> id, so the legacy mirror will warn on every send until that mapping is changed.`);
  }
  if (total > 0 && imported === 0) {
    note("no legacy chat history has been imported yet. Migration 4 does this.");
  }
}

async function search() {
  console.log("\n--- search ---");
  const [trigram] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'pg_trgm'`);
  console.log(`  pg_trgm: ${trigram.n > 0 ? "installed" : "not installed (username search falls back to ILIKE)"}`);
  const vector = (await columnsOf("posts")).includes("search_vector");
  console.log(`  posts.search_vector: ${vector ? "present" : "missing"}`);
  if (!vector) note("posts.search_vector is missing, so post search is doing a sequential scan.");
  const [index] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'posts_search_vector_idx'`,
  );
  console.log(`  posts_search_vector_idx: ${index.n > 0 ? "present" : "missing"}`);
}

async function columnTypes() {
  console.log("\n--- id types on both sides of each foreign key ---");
  const rows = await prisma.$queryRawUnsafe(
    `SELECT child.relname AS child_table, ca.attname AS child_column,
            format_type(ca.atttypid, ca.atttypmod) AS child_type,
            parent.relname AS parent_table, pa.attname AS parent_column,
            format_type(pa.atttypid, pa.atttypmod) AS parent_type
     FROM pg_constraint con
     JOIN pg_class child ON child.oid = con.conrelid
     JOIN pg_class parent ON parent.oid = con.confrelid
     JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
     JOIN unnest(con.confkey) WITH ORDINALITY AS pk(attnum, ord) ON pk.ord = ck.ord
     JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = ck.attnum
     JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = pk.attnum
     WHERE con.contype = 'f' AND child.relnamespace = 'public'::regnamespace
       AND ca.atttypid <> pa.atttypid
     ORDER BY child.relname, ca.attname`,
  );
  if (rows.length === 0) {
    console.log("  ok       every foreign key column has the same type as the column it points at");
    return;
  }
  // Postgres joins an integer to a bigint without complaint. Prisma matches the two sides in memory
  // instead, where 1n never equals 1, so such a relation used to come back null on every row. The int8
  // type parser in core/db/prisma.js is what makes both sides arrive as the same kind of value.
  for (const row of rows) {
    console.log(
      `  mixed    ${row.child_table}.${row.child_column} is ${row.child_type}, ${row.parent_table}.${row.parent_column} is ${row.parent_type}`,
    );
  }
  console.log("  (handled: int8 is read as a Number, so relations still resolve. See core/db/prisma.js)");
}

async function chat() {
  console.log("\n--- chat threads ---");
  if (!(await exists("chat_threads"))) {
    console.log("  note     chat_threads does not exist yet");
    return;
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT t.id, t.type, t.direct_key, t.title,
            (SELECT count(*)::int FROM chat_thread_members m WHERE m.conversation_id = t.id) AS member_rows,
            (SELECT count(*)::int FROM chat_thread_members m JOIN users u ON u.id = m.user_id
              WHERE m.conversation_id = t.id) AS members_with_a_user,
            (SELECT count(*)::int FROM chat_messages c WHERE c.conversation_id = t.id) AS messages
     FROM chat_threads t ORDER BY t.id LIMIT 30`,
  );
  if (rows.length === 0) console.log("  note     no threads at all");
  for (const row of rows) {
    const label = `#${row.id} ${row.type}${row.direct_key ? ` ${row.direct_key}` : ""}`;
    const bad = row.type === "direct" && row.members_with_a_user < 2;
    console.log(
      `  ${bad ? "THIN    " : "ok      "} ${label}: ${row.member_rows} member row(s), ${row.members_with_a_user} with a user, ${row.messages} message(s)`,
    );
    if (bad) {
      note(`thread ${row.id} is a direct thread with only ${row.members_with_a_user} resolvable member(s), so it shows as "Conversation" instead of a name.`);
    }
  }

  // Prisma resolves a required relation to null when the row it points at is unreachable, which is what
  // turns a missing name into the literal "Conversation". This asks it the same question the API asks.
  const members = await prisma.conversationMember.findMany({
    take: 20,
    select: { conversationId: true, userId: true, user: { select: { id: true, username: true } } },
  });
  const unresolved = members.filter((m) => !m.user);
  console.log(`  ${unresolved.length === 0 ? "ok      " : "BROKEN  "} ${members.length} membership(s) read through Prisma, ${unresolved.length} with no user attached`);
  if (unresolved.length > 0) {
    note(`Prisma cannot attach a user to ${unresolved.length} membership(s), e.g. thread ${unresolved[0].conversationId} user ${unresolved[0].userId}.`);
  }
}

async function names() {
  console.log("\n--- display names ---");
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE username IS NULL OR btrim(username) = '')::int AS blank,
            count(*) FILTER (WHERE (username IS NULL OR btrim(username) = '')
              AND EXISTS (SELECT 1 FROM user_profiles p
                          WHERE p.user_id = users.id AND btrim(coalesce(p.username, '')) <> ''))::int AS blank_with_profile_name
     FROM users`,
  );
  console.log(`  ${row.blank === 0 ? "ok      " : "BLANK   "} ${row.blank} of ${row.total} account(s) have no users.username`);
  if (row.blank > 0) {
    console.log(`           ${row.blank_with_profile_name} of those do have a name on their profile row`);
    note(`${row.blank} account(s) have no users.username. Anywhere a name is shown for them falls back — in a direct chat that reads as "Conversation". ${row.blank_with_profile_name} can be named from their profile row instead, which the API now does.`);
  }
}

async function saved() {
  console.log("\n--- saved posts ---");
  if (!(await exists("post_saves"))) return;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT s.user_id, s.post_id,
            (SELECT count(*)::int FROM posts p WHERE p.post_id = s.post_id) AS post_exists,
            (SELECT count(*)::int FROM posts p JOIN users u ON u.id = p.user_id
              WHERE p.post_id = s.post_id) AS author_exists
     FROM post_saves s ORDER BY s.created_at DESC LIMIT 20`,
  );
  if (rows.length === 0) console.log("  note     nobody has saved anything");
  for (const row of rows) {
    const ok = row.post_exists === 1 && row.author_exists === 1;
    console.log(
      `  ${ok ? "ok      " : "BROKEN  "} user ${row.user_id} saved post ${row.post_id}: post ${row.post_exists ? "exists" : "is gone"}, author ${row.author_exists ? "exists" : "is gone"}`,
    );
    if (row.post_exists === 1 && row.author_exists === 0) {
      note(`post ${row.post_id} has no author row, which the saved-posts page cannot render.`);
    }
  }

  // The same read the endpoint performs, so a null relation shows up here rather than as a 500.
  const viaPrisma = await prisma.postSave.findMany({
    take: 20,
    select: { postId: true, post: { select: { id: true, userId: true, author: { select: { id: true } } } } },
  });
  const nullPost = viaPrisma.filter((r) => !r.post);
  const nullAuthor = viaPrisma.filter((r) => r.post && !r.post.author);
  console.log(`  ${nullPost.length === 0 ? "ok      " : "BROKEN  "} ${viaPrisma.length} save(s) read through Prisma, ${nullPost.length} with no post, ${nullAuthor.length} with no author`);
  if (nullPost.length > 0) note(`${nullPost.length} saved row(s) resolve to no post (post ids ${nullPost.map((r) => r.postId).join(", ")}).`);
  if (nullAuthor.length > 0) note(`${nullAuthor.length} saved post(s) resolve to no author (post ids ${nullAuthor.map((r) => r.postId).join(", ")}).`);
}

async function security() {
  console.log("\n--- row level security ---");
  const rows = await prisma.$queryRawUnsafe(
    `SELECT relname, relrowsecurity AS enabled, relforcerowsecurity AS forced
     FROM pg_class WHERE relnamespace = 'public'::regnamespace
       AND relname IN ('users','posts','post_saves','user_profiles','chat_threads','chat_thread_members','chat_messages')
     ORDER BY relname`,
  );
  const on = rows.filter((r) => r.enabled);
  if (on.length === 0) {
    console.log("  ok       off on every table the API reads");
    return;
  }
  for (const row of on) console.log(`  ON       ${row.relname}${row.forced ? " (forced)" : ""}`);
  note(`row level security is on for ${on.map((r) => r.relname).join(", ")}. If the connecting role is not the owner, reads there come back empty and relations resolve to null.`);
}

async function migrations() {
  console.log("\n--- applied migrations ---");
  if (!(await exists("_prisma_migrations"))) {
    console.log("  note     no _prisma_migrations table: migrations have never been run from here");
    return;
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`,
  );
  for (const row of rows) {
    const state = row.rolled_back_at ? "ROLLED BACK" : row.finished_at ? "applied" : "UNFINISHED";
    console.log(`  ${state.padEnd(11)} ${row.migration_name}`);
    if (state !== "applied") note(`migration ${row.migration_name} is ${state.toLowerCase()}.`);
  }
}

async function main() {
  await tables();
  await collision();
  await keys();
  await legacyKey();
  await columnTypes();
  await chat();
  await names();
  await saved();
  await security();
  await search();
  await migrations();

  console.log("\n--- summary ---");
  if (problems.length === 0) console.log("  nothing to fix");
  else problems.forEach((p) => console.log(`  - ${p}`));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
