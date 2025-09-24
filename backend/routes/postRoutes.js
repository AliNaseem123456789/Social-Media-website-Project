import express from "express";
import supabase from "../supabaseClient.js";
import multer from "multer";
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const fileName = `${Date.now()}_${req.file.originalname}`;

    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (error) throw error;

    const { publicURL } = supabase.storage.from("post-images").getPublicUrl(fileName);

    res.json({ success: true, url: publicURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
});



// POST /api/posts
router.post("/", async (req, res) => {
  const { user_id, content } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: "Post cannot be empty" });
  }

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id, content }])
      .select("post_id, content, created_at")
      .single();

    if (error) throw error;

    res.json({ success: true, message: "Post created", post: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});
 


// GET /api/posts
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("post_id,user_id, content, created_at, total_likes, users(username)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const posts = data.map(post => ({
      id:post.post_id,
      user_id:post.user_id,
      content: post.content,
      created_at: post.created_at,
      total_likes: post.total_likes || 0,
      username: post.users?.username || "Unknown",
    }));

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

router.post("/like", async (req, res) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
    return res.status(400).json({ success: false, message: "User ID and Post ID required" });
  }

  try {
    // Check if user already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user_id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLike) {
      return res.status(400).json({ success: false, message: "User already liked this post" });
    }

    // Insert new like
    const { data: newLike, error: insertError } = await supabase
      .from("likes")
      .insert([{ user_id, post_id }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch current total_likes
    const { data: post, error: fetchPostError } = await supabase
      .from("posts")
      .select("total_likes")
      .eq("post_id", post_id)
      .single();

    if (fetchPostError) throw fetchPostError;

    // Increment total_likes
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({ total_likes: (post.total_likes || 0) + 1 })
      .eq("post_id", post_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: "Post liked",
      like: newLike,
      total_likes: updatedPost.total_likes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

router.get("/fullpost/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        post_id,
        content,
        created_at,
        total_likes,
        users(username),
        comments(comment_id, comment_text, created_at, users(username))
        `
      )
      .eq("post_id", Number(id))
      .single(); 
    if (error) throw error;

    const post = {
      id: data.post_id,
      content: data.content,
      created_at: data.created_at,
      total_likes: data.total_likes || 0,
      username: data.users?.username || "Unknown",
      comments:
        data.comments?.map((c) => ({
          comment_id: c.comment_id,
          comment_text: c.comment_text,
          created_at: c.created_at,
          username: c.users?.username || "Anonymous",
        })) || [],
    };

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});



// Insert a comment into a post
router.post("/comment", async (req, res) => {
  try {
    const { post_id, comment_text, user_id } = req.body;

    if (!post_id || !comment_text || !user_id) {
      return res
        .status(400)
        .json({ success: false, message: "post_id, comment_text, and user_id are required" });
    }

    // Insert comment into Supabase
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: post_id,
          comment_text: comment_text,
          user_id: user_id, // assuming you have a relation between comments → users
        },
      ])
      .select("comment_id, comment_text, created_at, users(username)")
      .single();

    if (error) throw error;

    const comment = {
      comment_id: data.comment_id,
      comment_text: data.comment_text,
      created_at: data.created_at,
      username: data.users?.username || "Anonymous",
    };

    res.json({ success: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});




router.get("/myposts/:id", async (req, res) => {
  try {
    const { id } = req.params; // this is the user_id

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        post_id,
        content,
        created_at,
        total_likes,
        users(username),
        comments(comment_id, comment_text, created_at, users(username))
        `
      )
      .eq("user_id", Number(id)) // ✅ filter by user_id, not post_id
      .order("created_at", { ascending: false }); // show newest first

    if (error) throw error;
    const posts =
      data?.map((p) => ({
        id: p.post_id,
        content: p.content,
        created_at: p.created_at,
        total_likes: p.total_likes || 0,
        username: p.users?.username || "Unknown",
        comments:
          p.comments?.map((c) => ({
            comment_id: c.comment_id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            username: c.users?.username || "Anonymous",
          })) || [],
      })) || [];

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

router.get("/profile/:user_id", async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) return res.status(400).json({ error: "User ID is required" });

  try {
    // First try user_profiles
    let { data: profile, error } = await supabase
      .from("user_profiles")
      .select("user_id, username, bio,gender,age, country, education, hobbies, profile_image, cover_image, created_at, updated_at")
      .eq("user_id", Number(user_id))
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      // fallback to users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, username, email, created_at")
        .eq("id", Number(user_id))
        .maybeSingle();

      if (userError) throw userError;

      if (!user) {
        return res.status(404).json({ error: "Profile not found" });
      }

      return res.json({
        profile: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          bio: null,
          gender: null,
          age:null,
          country: null,
          education: null,
          hobbies: null,
          profile_image: null,
          cover_image: null,
        },
      });
    }

    res.json({ profile });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/profile/add", async (req, res) => {
  let { user_id, username, bio, gender, age, country, education, hobbies, profile_image, cover_image } = req.body;

  if (!user_id || !username)
    return res.status(400).json({ error: "User ID and username are required" });

  user_id = Number(user_id); 

  try {
    // Upsert profile directly, now username is part of user_profiles
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id,
          username,  
          bio,
          gender,
          age,
          country,
          education,
          hobbies,
          profile_image,
          cover_image,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, profile: data });
  } catch (err) {
    console.error("Error saving profile info:", err);
    res.status(500).json({ error: "Failed to save profile info" });
  }
});


export default router;
