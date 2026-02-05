import supabase from "../supabaseClient.js";
export const createPost = async (req, res) => {
  const { user_id, content, image_url } = req.body;
  if (!content)
    return res
      .status(400)
      .json({ success: false, message: "Post cannot be empty" });
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id, content, image_url }])
      .select("post_id, content, created_at")
      .single();
    if (error) throw error;
    res.json({ success: true, message: "Post created", post: data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};
export const getPosts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "post_id,user_id, content, created_at, total_likes, users(username)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    const posts = data.map((post) => ({
      id: post.post_id,
      user_id: post.user_id,
      content: post.content,
      created_at: post.created_at,
      total_likes: post.total_likes || 0,
      username: post.users?.username || "Unknown",
    }));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const likePost = async (req, res) => {
  const { user_id, post_id } = req.body;
  if (!user_id || !post_id)
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });
  try {
    const { data: existingLike } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user_id)
      .eq("post_id", post_id)
      .maybeSingle();
    if (existingLike) {
      await supabase.from("likes").delete().eq("id", existingLike.id);
      const { data: post } = await supabase
        .from("posts")
        .select("total_likes")
        .eq("post_id", post_id)
        .single();
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: Math.max((post.total_likes || 1) - 1, 0) })
        .eq("post_id", post_id)
        .select()
        .single();
      return res.json({
        success: true,
        total_likes: updatedPost.total_likes,
        liked: false,
      });
    } else {
      await supabase.from("likes").insert([{ user_id, post_id }]);
      const { data: post } = await supabase
        .from("posts")
        .select("total_likes")
        .eq("post_id", post_id)
        .single();
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: (post.total_likes || 0) + 1 })
        .eq("post_id", post_id)
        .select()
        .single();
      return res.json({
        success: true,
        total_likes: updatedPost.total_likes,
        liked: true,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getFullPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("posts")
      .select(
        `post_id, content, created_at, total_likes, users(username), comments(comment_id, comment_text, created_at, users(username))`,
      )
      .eq("post_id", Number(id))
      .single();
    if (error) throw error;
    res.json({
      id: data.post_id,
      content: data.content,
      created_at: data.created_at,
      total_likes: data.total_likes || 0,
      username: data.users?.username || "Unknown",
      comments: data.comments || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { post_id, comment_text, user_id } = req.body;
    const { data, error } = await supabase
      .from("comments")
      .insert([{ post_id, comment_text, user_id }])
      .select("comment_id, comment_text, created_at, users(username)")
      .single();
    if (error) throw error;
    res.json({ success: true, comment: data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getMyPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("posts")
      .select(
        `post_id, content, created_at, total_likes, users(username), comments(comment_id, comment_text, created_at, users(username))`,
      )
      .eq("user_id", Number(id))
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(
      data.map((p) => ({
        id: p.post_id,
        content: p.content,
        username: p.users?.username,
        comments: p.comments || [],
      })),
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
};
