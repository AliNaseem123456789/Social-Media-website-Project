// syncPosts.js
import supabase from "./supabaseClient.js"
import client from "./elasticsearch.js";

async function syncPosts() {
  const { data: posts, error } = await supabase.from("posts").select("*");

  if (error) {
    console.error("❌ Supabase fetch error:", error);
    return;
  }

  for (const post of posts) {
    await client.index({
      index: "posts",
      id: post.id,
      document: {
        title: post.title,
        content: post.content,
        author: post.author,
        created_at: post.created_at,
      },
    });
  }

  console.log("✅ Synced all posts into Elasticsearch!");
}

syncPosts();
