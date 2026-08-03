// Place at: src/features/profile/pages/AddProfileInfoForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Autocomplete,
  Chip,
  IconButton,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { profileService } from "../services/profileService";
import { useAuth } from "../../auth/context/AuthContext";
import { HOBBIES } from "../data/hobbiesData";
import { COUNTRIES, getFlagEmoji } from "../data/countriesData";
import { T } from "../../../styles/circleTokens";

const MAX_IMAGE_MB = 5;
const BIO_MAX = 280;
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const SELF_DESCRIBE = "Self-describe";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "92%", sm: 540 },
  maxHeight: "86vh",
  overflowY: "auto",
  bgcolor: T.surface,
  borderRadius: "24px",
  boxShadow: "0 30px 70px -20px rgba(22,20,15,0.35)",
  border: `1px solid ${T.line}`,
  p: 0,
};

// Text fields, in one place, so focus/error colors read as "ember" instead
// of MUI's default blue — keeps this modal on-brand with the rest of Circle.
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    fontFamily: T.fontBody,
    "& fieldset": { borderColor: T.line },
    "&:hover fieldset": { borderColor: T.inkFaint },
    "&.Mui-focused fieldset": { borderColor: T.ember, borderWidth: "1.5px" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.emberInk },
  "& .MuiFormHelperText-root": { marginLeft: 0.5 },
};

const hobbyLabel = (opt) => (typeof opt === "string" ? opt : opt?.label || "");

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: T.fontMono,
        fontSize: 11,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: T.inkFaint,
        mb: 1.25,
      }}
    >
      {children}
    </Typography>
  );
}

function ImagePicker({ label, file, onChange, onClear, error }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <Box>
      <SectionLabel>{label}</SectionLabel>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {previewUrl && (
          <Avatar
            src={previewUrl}
            variant="rounded"
            sx={{ width: 48, height: 48, borderRadius: "10px", flexShrink: 0 }}
          />
        )}
        <Button
          variant="outlined"
          component="label"
          fullWidth
          startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13.5,
            py: 1.1,
            color: T.ink,
            borderColor: T.line,
            "&:hover": { borderColor: T.ink, bgcolor: "transparent" },
          }}
        >
          {file ? file.name : `Choose ${label.toLowerCase()}`}
          <input type="file" hidden accept="image/*" onChange={onChange} />
        </Button>
        {file && (
          <IconButton onClick={onClear} size="small" sx={{ color: T.inkFaint, flexShrink: 0 }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {error && (
        <Typography sx={{ fontSize: 12, color: T.ember, mt: 0.5, ml: 0.5 }}>{error}</Typography>
      )}
    </Box>
  );
}

function AddProfileInfoForm({ open, handleClose, userId: propUserId, onSaved }) {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const userId = propUserId || currentUser?.id;

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    gender: "",
    age: "",
    hobbies: "",
    education: "",
    country: "",
  });
  const [hobbyChips, setHobbyChips] = useState([]); // array of string | {label, category}
  const [genderChoice, setGenderChoice] = useState(""); // one of GENDER_OPTIONS, SELF_DESCRIBE, or ""
  const [customGender, setCustomGender] = useState(""); // only used when genderChoice === SELF_DESCRIBE
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [imageErrors, setImageErrors] = useState({ profileImage: "", coverImage: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated && open) {
      navigate("/login");
    }
  }, [isAuthenticated, open, navigate]);

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
            setHobbyChips(
              (profile.hobbies || "")
                .split(",")
                .map((h) => h.trim())
                .filter(Boolean)
            );

            const g = profile.gender || "";
            if (!g) {
              setGenderChoice("");
              setCustomGender("");
            } else if (GENDER_OPTIONS.includes(g)) {
              setGenderChoice(g);
              setCustomGender("");
            } else {
              setGenderChoice(SELF_DESCRIBE);
              setCustomGender(g);
            }
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
      };
      loadProfile();
    }
  }, [open, userId]);

  // Keep formData.gender (what actually gets submitted) in sync with
  // whichever combination of dropdown + custom text is active.
  useEffect(() => {
    const resolved = genderChoice === SELF_DESCRIBE ? customGender.trim() : genderChoice;
    setFormData((prev) => (prev.gender === resolved ? prev : { ...prev, gender: resolved }));
  }, [genderChoice, customGender]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Digits only — negative signs, "e", "+", and decimals never make it
  // into the field, so there's no way to type a negative age.
  const handleAgeChange = (e) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
    setFormData((prev) => ({ ...prev, age: digitsOnly }));
    if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: undefined }));
  };
  const blockNonDigitKeys = (e) => {
    if (["-", "+", "e", "E", ".", ","].includes(e.key)) e.preventDefault();
  };

  const handleHobbiesChange = (event, newValue) => {
    // De-dupe case-insensitively, whether the entry came from the
    // suggestion list ({label, category}) or was typed freehand (string).
    const seen = new Set();
    const deduped = [];
    for (const item of newValue) {
      const key = hobbyLabel(item).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    setHobbyChips(deduped);
    setFormData((prev) => ({ ...prev, hobbies: deduped.map(hobbyLabel).join(", ") }));
  };

  const validateImage = (file) => {
    if (!file) return "";
    if (!file.type.startsWith("image/")) return "Please choose an image file";
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Keep it under ${MAX_IMAGE_MB}MB`;
    return "";
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    const err = validateImage(file);
    if (name === "profileImage") {
      setImageErrors((prev) => ({ ...prev, profileImage: err }));
      if (!err) setProfileImageFile(file);
    }
    if (name === "coverImage") {
      setImageErrors((prev) => ({ ...prev, coverImage: err }));
      if (!err) setCoverImageFile(file);
    }
  };

  const validate = () => {
    const errors = {};
    const username = formData.username.trim();
    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "At least 3 characters";
    } else if (username.length > 30) {
      errors.username = "Keep it under 30 characters";
    } else if (!/^[a-zA-Z0-9_. ]+$/.test(username)) {
      errors.username = "Letters, numbers, spaces, . and _ only";
    }

    if (formData.bio.length > BIO_MAX) {
      errors.bio = `Bio can't exceed ${BIO_MAX} characters`;
    }

    if (formData.age !== "") {
      const ageNum = Number(formData.age);
      if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        errors.age = "Enter an age between 13 and 120";
      }
    }

    if (genderChoice === SELF_DESCRIBE && !customGender.trim()) {
      errors.gender = "Enter how you'd like to describe it, or pick another option";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });

      if (profileImageFile) data.append("profileImage", profileImageFile);
      if (coverImageFile) data.append("coverImage", coverImageFile);

      const res = await profileService.updateProfile(data);

      if (res.success) {
        if (onSaved) onSaved();
        handleClose();
      } else {
        setError(res.message || "Failed to save profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.response?.data?.message || "Failed to save profile info");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const selectedCountry = COUNTRIES.find((c) => c.name === formData.country) || null;

  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition>
      <Box sx={modalStyle}>
        {/* header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3.5, pt: 3, pb: 2, borderBottom: `1px solid ${T.line}` }}
        >
          <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 20, color: T.ink }}>
            {formData.username ? "Edit profile" : "Add profile info"}
          </Typography>
          <IconButton onClick={handleClose} size="small" sx={{ color: T.inkFaint }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ px: 3.5, py: 3 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, borderRadius: "12px", bgcolor: T.emberTint, color: T.emberInk, "& .MuiAlert-icon": { color: T.emberInk } }}
            >
              {error}
            </Alert>
          )}

          <Stack component="form" spacing={3} onSubmit={handleSubmit}>
            {/* basic info */}
            <Box>
              <SectionLabel>Basic info</SectionLabel>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.username)}
                  helperText={fieldErrors.username || " "}
                  fullWidth
                  disabled={loading}
                  sx={fieldSx}
                />
                <TextField
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  multiline
                  minRows={3}
                  fullWidth
                  disabled={loading}
                  error={Boolean(fieldErrors.bio)}
                  helperText={fieldErrors.bio || `${formData.bio.length}/${BIO_MAX}`}
                  sx={fieldSx}
                />
              </Stack>
            </Box>

            {/* interests — the bubble picker */}
            <Box>
              <SectionLabel>Interests</SectionLabel>
              <Autocomplete
                multiple
                freeSolo
                filterSelectedOptions
                options={HOBBIES}
                value={hobbyChips}
                onChange={handleHobbiesChange}
                groupBy={(option) => (typeof option === "string" ? "Custom" : option.category)}
                getOptionLabel={hobbyLabel}
                isOptionEqualToValue={(opt, val) =>
                  hobbyLabel(opt).toLowerCase() === hobbyLabel(val).toLowerCase()
                }
                disabled={loading}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={hobbyLabel(option)}
                        {...tagProps}
                        sx={{
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: 12.5,
                          color: T.emberInk,
                          bgcolor: T.emberTint,
                          border: "none",
                          m: "3px",
                          "& .MuiChip-deleteIcon": { color: T.emberInk, opacity: 0.6, "&:hover": { opacity: 1 } },
                        }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={hobbyChips.length ? "Add another…" : "Search or type your own — e.g. Cricket, Football…"}
                    sx={fieldSx}
                  />
                )}
              />
              <Typography sx={{ fontSize: 12, color: T.inkFaint, mt: 0.75, ml: 0.5 }}>
                Pick from the list or type anything and press Enter to add it.
              </Typography>
            </Box>

            {/* details */}
            <Box>
              <SectionLabel>Details</SectionLabel>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth disabled={loading} sx={fieldSx}>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      label="Gender"
                      value={genderChoice}
                      onChange={(e) => setGenderChoice(e.target.value)}
                    >
                      <MenuItem value="">
                        <em style={{ color: T.inkFaint, fontStyle: "normal" }}>Not set</em>
                      </MenuItem>
                      {GENDER_OPTIONS.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                      <MenuItem value={SELF_DESCRIBE}>Self-describe…</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Age"
                    name="age"
                    value={formData.age}
                    onChange={handleAgeChange}
                    onKeyDown={blockNonDigitKeys}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0, max: 120 }}
                    fullWidth
                    disabled={loading}
                    error={Boolean(fieldErrors.age)}
                    helperText={fieldErrors.age || " "}
                    sx={fieldSx}
                  />
                </Stack>

                {genderChoice === SELF_DESCRIBE && (
                  <TextField
                    label="Describe your gender"
                    value={customGender}
                    onChange={(e) => {
                      setCustomGender(e.target.value);
                      if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: undefined }));
                    }}
                    error={Boolean(fieldErrors.gender)}
                    helperText={fieldErrors.gender || " "}
                    fullWidth
                    disabled={loading}
                    sx={fieldSx}
                  />
                )}

                <TextField
                  label="Education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  sx={fieldSx}
                />

                <Autocomplete
                  options={COUNTRIES}
                  getOptionLabel={(opt) => opt?.name || ""}
                  value={selectedCountry}
                  onChange={(e, val) => setFormData((prev) => ({ ...prev, country: val?.name || "" }))}
                  disabled={loading}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{getFlagEmoji(option.code)}</span>
                      {option.name}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country"
                      sx={fieldSx}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: selectedCountry ? (
                          <span style={{ fontSize: "1.1rem", marginLeft: 4, marginRight: 2 }}>
                            {getFlagEmoji(selectedCountry.code)}
                          </span>
                        ) : null,
                      }}
                    />
                  )}
                />
              </Stack>
            </Box>

            {/* photos */}
            <Box>
              <SectionLabel>Photos</SectionLabel>
              <Stack spacing={2}>
                <ImagePicker
                  label="Profile image"
                  file={profileImageFile}
                  onChange={handleFileChange}
                  onClear={() => setProfileImageFile(null)}
                  error={imageErrors.profileImage}
                />
                <ImagePicker
                  label="Cover image"
                  file={coverImageFile}
                  onChange={handleFileChange}
                  onClear={() => setCoverImageFile(null)}
                  error={imageErrors.coverImage}
                />
              </Stack>
            </Box>

            <Button
              type="submit"
              disabled={loading}
              disableElevation
              sx={{
                height: "48px",
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: 15,
                bgcolor: T.ember,
                color: "#fff8f4",
                "&:hover": { bgcolor: "#c93a19" },
                "&.Mui-disabled": { bgcolor: T.emberTint, color: T.emberInk },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: "#fff8f4" }} /> : "Save profile"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
export default AddProfileInfoForm;