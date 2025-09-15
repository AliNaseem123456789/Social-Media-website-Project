// SyncUsers.js
import supabase from "./supabaseClient.js";   // ✅ use your existing client
import client from "./elasticsearch.js";     // ✅ elasticsearch client

async function syncUsers() {
  const { data: users, error } = await supabase.from("users").select("*");

  if (error) {
    console.error("❌ Supabase error:", error);
    return;
  }

  for (const user of users) {
    await client.index({
      index: "users",        // index name
      id: user.id,           // use Supabase user id
      document: {
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  }

  console.log("✅ Users synced into Elasticsearch");
}

syncUsers();
