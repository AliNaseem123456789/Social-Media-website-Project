import SettingsModel from "../models/settingsModel.js";
import bcrypt from "bcrypt";

export const settingsController = {
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = parseInt(req.session.userId);
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    try {
      // Get user with password
      const user = await SettingsModel.getUserWithPassword(userId);
      
      if (!user || !user.password) {
        return res.status(404).json({
          success: false,
          message: "User not found or uses Google login"
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      // Update password
      await SettingsModel.updatePassword(userId, newPassword);

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  },

  // Update profile
  updateProfile: async (req, res) => {
    const userId = parseInt(req.session.userId);
    const { username, bio, education, hobbies, country } = req.body;

    try {
      // Update username if provided
      if (username) {
        await SettingsModel.updateUsername(userId, username);
        // Update session
        req.session.username = username;
      }

      // Get existing profile
      const existingProfile = await SettingsModel.getUserProfile(userId);

      // Prepare profile data
      const profileData = {
        user_id: userId,
        bio: bio || existingProfile.bio,
        education: education || existingProfile.education,
        hobbies: hobbies || existingProfile.hobbies,
        country: country || existingProfile.country,
        updated_at: new Date()
      };

      // Handle image uploads if files exist
      if (req.files) {
        if (req.files.profile_image) {
          profileData.profile_image = `/uploads/${req.files.profile_image[0].filename}`;
        }
        if (req.files.cover_image) {
          profileData.cover_image = `/uploads/${req.files.cover_image[0].filename}`;
        }
      }

      // Upsert profile
      await SettingsModel.upsertProfile(profileData);

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: { username }
      });

    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  },

  // Get profile data
  getProfile: async (req, res) => {
    const userId = parseInt(req.session.userId);

    try {
      // Get user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, username, email, created_at")
        .eq("id", userId)
        .single();

      if (userError) throw userError;

      // Get profile data
      const profile = await SettingsModel.getUserProfile(userId);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
          bio: profile.bio || "",
          education: profile.education || "",
          hobbies: profile.hobbies || "",
          country: profile.country || "",
          profileImage: profile.profile_image || null,
          coverImage: profile.cover_image || null,
          privacySettings: profile.privacy_settings || {
            profileVisibility: "public",
            showEmail: false,
            allowTagging: true,
            allowMessages: "everyone"
          }
        }
      });

    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  },

  // Update privacy settings
  updatePrivacy: async (req, res) => {
    const userId = parseInt(req.session.userId);
    const { profileVisibility, showEmail, allowTagging, allowMessages } = req.body;

    try {
      const privacySettings = {
        profileVisibility,
        showEmail,
        allowTagging,
        allowMessages,
        updatedAt: new Date()
      };

      // Get existing profile or create new one
      const existingProfile = await SettingsModel.getUserProfile(userId);
      
      const profileData = {
        user_id: userId,
        privacy_settings: privacySettings,
        updated_at: new Date()
      };

      // Copy existing data if profile exists
      if (existingProfile.user_id) {
        profileData.bio = existingProfile.bio;
        profileData.education = existingProfile.education;
        profileData.hobbies = existingProfile.hobbies;
        profileData.country = existingProfile.country;
      }

      await SettingsModel.upsertProfile(profileData);

      res.json({
        success: true,
        message: "Privacy settings updated successfully"
      });

    } catch (error) {
      console.error("Update privacy error:", error);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  },

  // Delete account
  deleteAccount: async (req, res) => {
    const userId = parseInt(req.session.userId);
    const { password } = req.body;

    try {
      // Verify password before deletion
      const user = await SettingsModel.getUserWithPassword(userId);
      
      if (user.password) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({
            success: false,
            message: "Password is incorrect"
          });
        }
      }

      // Delete account (cascade will handle profiles, posts, etc.)
      await SettingsModel.deleteAccount(userId);

      // Destroy session
      req.session.destroy();

      res.json({
        success: true,
        message: "Account deleted successfully"
      });

    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  }
};