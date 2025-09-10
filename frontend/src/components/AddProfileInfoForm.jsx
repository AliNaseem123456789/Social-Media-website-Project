import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, TextField, Button, Stack } from "@mui/material";
import axios from "axios";

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
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [education, setEducation] = useState("");
  const [country, setCountry] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [loading, setLoading] = useState(false);

  // Load existing profile data when modal opens
  useEffect(() => {
    if (open) {
      axios
        .get(`http://localhost:5000/api/profile/${userId}`)
        .then((res) => {
          const profile = res.data.profile;
          if (profile) {
            setUsername(profile.username || "");
            setBio(profile.bio || "");
            setGender(profile.gender || "");
            setAge(profile.age || "");
            setHobbies(profile.hobbies || "");
            setEducation(profile.education || "");
            setCountry(profile.country || "");
            setProfileImage(profile.profile_image || "");
            setCoverImage(profile.cover_image || "");
          }
        })
        .catch((err) => console.error("Failed to load profile:", err));
    }
  }, [open, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/posts/profile/add", {
        user_id: userId,
        username,
        bio,
        gender,
        age,
        hobbies,
        education,
        country,
        profile_image: profileImage,
        cover_image: coverImage,
      });

      if (res.data.success) {
        onSaved();
        handleClose();
      }
    } catch (err) {
      console.error("Error saving profile info:", err);
      alert("Failed to save profile info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition>
      <Box sx={style}>
        <Typography variant="h6" mb={2} fontWeight="bold" color="#000">
          {bio || hobbies || education || country ? "Edit Profile Info" : "Add Profile Info"}
        </Typography>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Bio"
            multiline
            minRows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Hobbies (comma separated)"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
           <TextField
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
           <TextField
            label="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Education"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Profile Image URL"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <TextField
            label="Cover Image URL"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "#000", backgroundColor: "#fff" } }}
            InputLabelProps={{ style: { color: "#000" } }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}

export default AddProfileInfoForm;
