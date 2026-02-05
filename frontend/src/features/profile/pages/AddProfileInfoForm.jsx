import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { profileService } from "../services/profileService";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 500 },
  maxHeight: "80vh",
  overflowY: "auto",
  bgcolor: "#fefefe",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
  border: "1px solid #ccc",
};

function AddProfileInfoForm({ open, handleClose, userId, onSaved }) {
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    gender: "",
    age: "",
    hobbies: "",
    education: "",
    country: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open && userId) {
      const loadProfile = async () => {
        try {
          const profile = await profileService.getProfile(userId);
          if (profile) {
            setFormData({
              username: profile.username || "",
              bio: profile.bio || "",
              gender: profile.gender || "",
              age: profile.age || "",
              hobbies: profile.hobbies || "",
              education: profile.education || "",
              country: profile.country || "",
            });
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
      };
      loadProfile();
    }
  }, [open, userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === "profileImage") setProfileImageFile(files[0]);
    if (name === "coverImage") setCoverImageFile(files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("user_id", userId);

      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });

      if (profileImageFile) data.append("profileImage", profileImageFile);
      if (coverImageFile) data.append("coverImage", coverImageFile);

      const res = await profileService.updateProfile(data);

      if (res.success) {
        onSaved();
        handleClose();
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition>
      <Box sx={style}>
        <Typography variant="h6" mb={2} fontWeight="bold" color="#000">
          {formData.username ? "Edit Profile Info" : "Add Profile Info"}
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          {}
          {[
            { label: "Username", name: "username" },
            { label: "Bio", name: "bio", multiline: true, rows: 3 },
            { label: "Hobbies", name: "hobbies" },
            { label: "Gender", name: "gender" },
            { label: "Age", name: "age" },
            { label: "Education", name: "education" },
            { label: "Country", name: "country" },
          ].map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              multiline={field.multiline}
              minRows={field.rows}
              fullWidth
            />
          ))}

          {}
          <Box>
            <Typography variant="body2" gutterBottom fontWeight="bold">
              Profile Image
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUploadIcon />}
            >
              {profileImageFile
                ? profileImageFile.name
                : "Choose Profile Picture"}
              <input
                type="file"
                name="profileImage"
                hidden
                onChange={handleFileChange}
                accept="image/*"
              />
            </Button>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom fontWeight="bold">
              Cover Image
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUploadIcon />}
            >
              {coverImageFile ? coverImageFile.name : "Choose Cover Photo"}
              <input
                type="file"
                name="coverImage"
                hidden
                onChange={handleFileChange}
                accept="image/*"
              />
            </Button>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 2, height: "45px", borderRadius: "10px" }}
          >
            {loading ? "Uploading..." : "Save Profile"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}

export default AddProfileInfoForm;
