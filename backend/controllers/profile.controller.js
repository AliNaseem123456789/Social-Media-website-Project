import supabase from "../supabaseClient.js";
import { supabaseAdmin } from "../supabaseAdmin.js";
export const uploadFiles = async (req, res) => {
  try {
    const { user_id } = req.body;
    const profileFile = req.files["profileImage"]?.[0];
    const coverFile = req.files["coverImage"]?.[0];
    let profileUrl = null;
    let coverUrl = null;
    if (profileFile) {
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(`profile_${user_id}_${Date.now()}`, profileFile.buffer, {
          contentType: profileFile.mimetype,
          upsert: true,
        });
      if (error) throw error;
      profileUrl = data.path;
    }
    const { data, error: dbError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: Number(user_id),
          profile_image: profileUrl || undefined,
          cover_image: coverUrl || undefined,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (dbError) throw dbError;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getProfile = async (req, res) => {
  const { user_id } = req.params;
  try {
    let { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", Number(user_id))
      .maybeSingle();
    if (error) throw error;

    if (!profile) {
      const { data: user } = await supabase
        .from("users")
        .select("id, username, email, created_at")
        .eq("id", Number(user_id))
        .maybeSingle();
      if (!user) return res.status(404).json({ error: "Profile not found" });
      return res.json({
        profile: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          profile_image: null,
          cover_image: null,
        },
      });
    }
    if (profile.profile_image) {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(profile.profile_image);
      profile.profile_image_url = data.publicUrl;
    }

    if (profile.cover_image) {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(profile.cover_image);
      profile.cover_image_url = data.publicUrl;
    }
    res.json({ profile });
  } catch (err) {
    console.error("Fetch Profile Error:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};
export const addProfileInfo = async (req, res) => {
  try {
    const { user_id, username, bio, gender, age, country, education, hobbies } =
      req.body;
    const profileFile = req.files?.["profileImage"]?.[0];
    const coverFile = req.files?.["coverImage"]?.[0];
    if (!user_id) return res.status(400).json({ error: "User ID is required" });
    let profilePath = undefined;
    let coverPath = undefined;
    if (profileFile) {
      const ext = profileFile.mimetype.split("/")[1] || "jpg";
      const fileName = `profile_${user_id}.${ext}`;
      const { data: pData, error: pErr } = await supabaseAdmin.storage
        .from("avatars")
        .upload(fileName, profileFile.buffer, {
          contentType: profileFile.mimetype,
          upsert: true,
        });
      if (pErr) throw pErr;
      profilePath = pData.path;
    }
    if (coverFile) {
      const ext = coverFile.mimetype.split("/")[1] || "jpg";
      const fileName = `cover_${user_id}.${ext}`;
      const { data: cData, error: cErr } = await supabaseAdmin.storage
        .from("avatars")
        .upload(fileName, coverFile.buffer, {
          contentType: coverFile.mimetype,
          upsert: true,
        });
      if (cErr) throw cErr;
      coverPath = cData.path;
    }
    const updateData = {
      user_id: Number(user_id),
      username,
      bio,
      gender,
      age,
      country,
      education,
      hobbies,
      updated_at: new Date(),
    };
    if (profilePath) updateData.profile_image = profilePath;
    if (coverPath) updateData.cover_image = coverPath;
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(updateData, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
