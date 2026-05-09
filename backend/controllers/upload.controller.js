import supabase from "../supabaseClient.js";
import { v4 as uuidv4 } from "uuid";

export const uploadPostImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = fileName;
    const { data, error } = await supabase.storage
      .from('post-images') 
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    res.json({ 
      success: true, 
      url: imageUrl,
      filename: fileName
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};