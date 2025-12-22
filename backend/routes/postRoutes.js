import express from "express";
import supabase from "../supabaseClient.js";
import multer from "multer";
const router = express.Router();

// / Ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const userId = req.body.user_id;
    const type = file.fieldname; // profileImage or coverImage
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = type === "profileImage" ? `${userId}${ext}` : `cover_${userId}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });
// Upload profile/cover images
router.post("/profile/upload", upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 }
]), async (req, res) => {
  try {
    const { user_id } = req.body;
    const profileFilename = req.files["profileImage"]?.[0].filename || null;
    const coverFilename = req.files["coverImage"]?.[0].filename || null;

    // Update DB with filenames
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: Number(user_id),
        profile_image: profileFilename,
        cover_image: coverFilename,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, profile: profileFilename, cover: coverFilename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});


// POST /api/posts
router.post("/", async (req, res) => {
  const { user_id, content,image_url } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: "Post cannot be empty" });
  }

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id, content,image_url }])
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
    // Check if the user already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user_id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLike) {
      // 🔄 User already liked -> unlike (remove)
      await supabase.from("likes").delete().eq("id", existingLike.id);

      // Decrement total_likes
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("total_likes")
        .eq("post_id", post_id)
        .single();

      if (fetchError) throw fetchError;

      const { data: updatedPost, error: updateError } = await supabase
        .from("posts")
        .update({ total_likes: Math.max((post.total_likes || 1) - 1, 0) })
        .eq("post_id", post_id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: "Post unliked",
        total_likes: updatedPost.total_likes,
        liked: false,
      });
    } else {
      // ❤️ User hasn't liked -> like
      const { error: insertError } = await supabase
        .from("likes")
        .insert([{ user_id, post_id }]);

      if (insertError) throw insertError;

      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("total_likes")
        .eq("post_id", post_id)
        .single();

      if (fetchError) throw fetchError;

      const { data: updatedPost, error: updateError } = await supabase
        .from("posts")
        .update({ total_likes: (post.total_likes || 0) + 1 })
        .eq("post_id", post_id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: "Post liked",
        total_likes: updatedPost.total_likes,
        liked: true,
      });
    }
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
