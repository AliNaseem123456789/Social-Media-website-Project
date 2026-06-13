// backend/models/settingsModel.js
import supabase from "../supabaseClient.js";
import bcrypt from "bcrypt";

const SettingsModel = {
  // Get user with password for verification
  getUserWithPassword: async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, password")
      .eq("id", userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user password
  updatePassword: async (userId, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", userId);
    
    if (error) throw error;
    return true;
  },

  // Update username
  updateUsername: async (userId, username) => {
    const { error } = await supabase
      .from("users")
      .update({ username })
      .eq("id", userId);
    
    if (error) throw error;
    return true;
  },

  // Get user profile
  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || {};
  },

  // Update or create user profile
  upsertProfile: async (profileData) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(profileData, { 
        onConflict: 'user_id',
        returning: 'minimal'
      });
    
    if (error) throw error;
    return true;
  },

  // Update privacy settings
  updatePrivacySettings: async (userId, settings) => {
    const { error } = await supabase
      .from("user_profiles")
      .update({ privacy_settings: settings })
      .eq("user_id", userId);
    
    if (error) throw error;
    return true;
  },

  // Delete user account
  deleteAccount: async (userId) => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    
    if (error) throw error;
    return true;
  }
};

export default SettingsModel;