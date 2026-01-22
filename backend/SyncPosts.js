import supabase from "./supabaseClient.js";
import client from "./elasticsearch.js";

async function syncUsers() {
  const { data: users, error } = await supabase.from("users").select("*");

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  for (const user of users) {
    await client.index({
      index: "users",
      id: user.id,
      document: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  }

  console.log("Users synced into Elasticsearch");
}

syncUsers();
