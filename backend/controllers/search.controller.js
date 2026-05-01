import supabase from "../supabaseClient.js";

export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    console.log(`🔍 Searching users for: ${q}`);

    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .ilike("username", `%${q}%`)
      .limit(10);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Search failed" });
    }

    res.json(data);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "User search failed" });
  }
};

export const searchPosts = async (req, res) => {
  try {
    const q = req.query.q;
    console.log("🔍 Search-posts called with q:", q);

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        `
        *,
        users:user_id (id, username, email)
      `,
      )
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return res.json([]);
    }

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const { count, error: countError } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        if (countError) {
          console.error("Comment count error:", countError);
        }

        return {
          id: post.id,
          post_id: post.id,
          user_id: post.user_id,
          content: post.content,
          image_url: post.image_url,
          total_likes: post.total_likes || 0,
          created_at: post.created_at,
          username: post.users?.username || "Unknown",
          email: post.users?.email,
          comment_count: count || 0,
        };
      }),
    );

    res.json(postsWithCounts);
  } catch (err) {
    console.error("💥 Post search error:", err);
    res.status(500).json({
      error: "Post search failed",
      details: err.message,
    });
  }
};

export const combinedSearch = async (req, res) => {
  try {
    const q = req.query.q;

    if (!q || q.trim().length < 2) {
      return res.json({ users: [], posts: [] });
    }

    console.log(`🔍 Combined search for: ${q}`);

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, bio")
      .ilike("username", `%${q}%`)
      .limit(5);

    if (usersError) console.error("Users search error:", usersError);

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        `
        *,
        users:user_id (id, username, email)
      `,
      )
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (postsError) console.error("Posts search error:", postsError);

    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post) => {
        const { count } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        return {
          id: post.id,
          content: post.content,
          image_url: post.image_url,
          total_likes: post.total_likes || 0,
          created_at: post.created_at,
          username: post.users?.username || "Unknown",
          comment_count: count || 0,
        };
      }),
    );

    res.json({
      users: users || [],
      posts: postsWithCounts,
      total: (users?.length || 0) + (postsWithCounts?.length || 0),
    });
  } catch (err) {
    console.error("Combined search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};
