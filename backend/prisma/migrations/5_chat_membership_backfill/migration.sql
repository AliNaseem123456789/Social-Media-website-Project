-- A direct thread renders as the other person's name, which it can only do if both people are in
-- chat_thread_members. A thread left with one member shows the literal "Conversation" instead. The two
-- ids are already in the thread's direct_key, so any missing membership can be filled in from there.
--
-- Additive and idempotent: it only inserts memberships that are absent, and only for users that exist.

DO $$
DECLARE
  added INTEGER;
BEGIN
  IF to_regclass('public.chat_threads') IS NULL THEN
    RAISE NOTICE 'chat_threads does not exist yet, nothing to backfill';
    RETURN;
  END IF;

  INSERT INTO "chat_thread_members" ("conversation_id", "user_id")
  SELECT t.id, member.user_id
  FROM "chat_threads" t
  CROSS JOIN LATERAL (
    VALUES (split_part(t.direct_key, ':', 1)::int), (split_part(t.direct_key, ':', 2)::int)
  ) AS member(user_id)
  WHERE t.type = 'direct'
    AND t.direct_key ~ '^[0-9]+:[0-9]+$'
    AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = member.user_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS added = ROW_COUNT;
  RAISE NOTICE 'filled in % missing direct-thread membership(s)', added;
END $$;

-- Threads that still have fewer than two people are ones whose other account is gone. They are left
-- alone (the history is real) and reported, so the doctor's output can be read against this.
DO $$
DECLARE
  thin INTEGER;
BEGIN
  SELECT count(*) INTO thin
  FROM "chat_threads" t
  WHERE t.type = 'direct'
    AND (SELECT count(*) FROM "chat_thread_members" m WHERE m.conversation_id = t.id) < 2;

  IF thin > 0 THEN
    RAISE NOTICE '% direct thread(s) still have fewer than two members - the other account no longer exists', thin;
  END IF;
END $$;
