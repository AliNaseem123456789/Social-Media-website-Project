import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Avatar,
  TextField,
  IconButton,
  LinearProgress,
  Autocomplete,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import { useAuth } from "../../auth/context/AuthContext";
import { profileService } from "../../profile/services/profileService";
import { searchService } from "../../search/services/SearchService";
import { HOBBIES } from "../../profile/data/hobbiesData";
import { COUNTRIES, getFlagEmoji } from "../../profile/data/countriesData";
import { T, cardSx, CircleFonts } from "../../../styles/circleTokens";

const STEPS = ["welcome", "photo", "about", "interests", "friends", "done"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    fontFamily: T.fontBody,
    "& fieldset": { borderColor: T.line },
    "&:hover fieldset": { borderColor: T.inkFaint },
    "&.Mui-focused fieldset": { borderColor: T.ember, borderWidth: "1.5px" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.emberInk },
};

const hobbyLabel = (opt) => (typeof opt === "string" ? opt : opt?.label || "");

/* ---------------------------------------------------------------------
   Shared shell — progress bar + step transition. Every step is an
   absolutely-plain component; this shell owns pacing so individual
   steps don't need their own animation logic.
   ------------------------------------------------------------------ */
function StepShell({ stepIndex, total, children }) {
  const progress = ((stepIndex + 1) / total) * 100;
  return (
    <Box sx={{ bgcolor: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CircleFonts />
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          bgcolor: T.line,
          "& .MuiLinearProgress-bar": { bgcolor: T.ember },
        }}
      />
      <Container maxWidth="sm" sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", py: 6 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Container>
    </Box>
  );
}

function StepHeader({ eyebrow, title, subtitle }) {
  return (
    <Box sx={{ mb: 4 }}>
      {eyebrow && (
        <Typography
          sx={{
            fontFamily: T.fontMono,
            fontSize: 12.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.emberInk,
            bgcolor: T.emberTint,
            display: "inline-block",
            px: 1.5,
            py: 0.6,
            borderRadius: "999px",
            mb: 2.5,
          }}
        >
          {eyebrow}
        </Typography>
      )}
      <Typography
        sx={{
          fontFamily: T.fontDisplay,
          fontWeight: 600,
          fontSize: { xs: 28, sm: 34 },
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: T.ink,
          mb: subtitle ? 1 : 0,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 15.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 440 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continue", nextDisabled = false, loading = false, skipLabel }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mt: 5 }}>
      {onBack ? (
        <Button
          onClick={onBack}
          startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 17 }} />}
          sx={{ textTransform: "none", fontWeight: 600, color: T.inkSoft, "&:hover": { bgcolor: "transparent", color: T.ink } }}
        >
          Back
        </Button>
      ) : (
        <Box />
      )}
      <Stack direction="row" spacing={1.5} alignItems="center">
        {skipLabel && (
          <Button onClick={onNext ? () => onNext(true) : undefined} sx={{ textTransform: "none", fontWeight: 600, color: T.inkFaint }}>
            {skipLabel}
          </Button>
        )}
        <Button
          onClick={() => onNext?.(false)}
          disabled={nextDisabled || loading}
          endIcon={loading ? null : <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />}
          disableElevation
          sx={{
            borderRadius: "999px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 15,
            px: 3.5,
            py: 1.15,
            bgcolor: T.ember,
            color: "#fff8f4",
            "&:hover": { bgcolor: "#c93a19" },
            "&.Mui-disabled": { bgcolor: T.emberTint, color: T.emberInk },
          }}
        >
          {loading ? <CircularProgress size={20} sx={{ color: "#fff8f4" }} /> : nextLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

/* ---------------------------------------------------------------------
   Step 0 — Welcome
   ------------------------------------------------------------------ */
function WelcomeStep({ username, onNext }) {
  return (
    <Box>
      <StepHeader
        eyebrow="Welcome to Circle"
        title={`Good to have you, ${username || "there"}.`}
        subtitle="Four quick steps and your circle is ready. Takes about a minute — skip anything you'd rather do later."
      />
      <NavRow onNext={() => onNext(false)} nextLabel="Let's go" />
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Step 1 — Profile photo
   ------------------------------------------------------------------ */
function PhotoStep({ username, file, onFileChange, onNext, onBack, saving }) {
  const previewUrl = file ? URL.createObjectURL(file) : null;
  return (
    <Box>
      <StepHeader eyebrow="Step 1 of 4" title="Add a face to the name." subtitle="A profile photo makes it easier for friends to find and recognize you." />
      <Stack alignItems="center" spacing={2.5} sx={{ py: 2 }}>
        <Avatar
          src={previewUrl}
          sx={{
            width: 132,
            height: 132,
            bgcolor: T.ember,
            fontFamily: T.fontDisplay,
            fontSize: "2.8rem",
            fontWeight: 600,
            border: `4px solid ${T.surface}`,
            boxShadow: "0 14px 32px -8px rgba(22,20,15,0.28)",
          }}
        >
          {!previewUrl && username?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{ borderRadius: "999px", textTransform: "none", fontWeight: 600, color: T.ink, borderColor: T.line, px: 3, "&:hover": { borderColor: T.ink, bgcolor: "transparent" } }}
        >
          {file ? "Change photo" : "Upload photo"}
          <input type="file" hidden accept="image/*" onChange={(e) => e.target.files[0] && onFileChange(e.target.files[0])} />
        </Button>
      </Stack>
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue" skipLabel="Skip for now" loading={saving} />
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Step 2 — About you
   ------------------------------------------------------------------ */
function AboutStep({ data, onChange, onNext, onBack, saving }) {
  const selectedCountry = COUNTRIES.find((c) => c.name === data.country) || null;
  return (
    <Box>
      <StepHeader eyebrow="Step 2 of 4" title="Tell people a bit about you." subtitle="This shows up on your profile — all of it is optional." />
      <Stack spacing={2.25}>
        <TextField
          label="Bio"
          placeholder="A line about who you are"
          multiline
          minRows={2}
          fullWidth
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, 280) })}
          sx={fieldSx}
        />
        <Stack direction="row" spacing={2}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>Gender</InputLabel>
            <Select label="Gender" value={data.gender} onChange={(e) => onChange({ gender: e.target.value })}>
              <MenuItem value="">
                <em style={{ fontStyle: "normal", color: T.inkFaint }}>Not set</em>
              </MenuItem>
              {GENDER_OPTIONS.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Age"
            fullWidth
            value={data.age}
            onChange={(e) => onChange({ age: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })}
            sx={fieldSx}
          />
        </Stack>
        <Autocomplete
          options={COUNTRIES}
          getOptionLabel={(o) => o?.name || ""}
          value={selectedCountry}
          onChange={(e, val) => onChange({ country: val?.name || "" })}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: "flex", gap: 1.25 }}>
              <span>{getFlagEmoji(option.code)}</span>
              {option.name}
            </Box>
          )}
          renderInput={(params) => <TextField {...params} label="Country" sx={fieldSx} />}
        />
        <TextField label="Education" fullWidth value={data.education} onChange={(e) => onChange({ education: e.target.value })} sx={fieldSx} />
      </Stack>
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue" skipLabel="Skip for now" loading={saving} />
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Step 3 — Interests
   ------------------------------------------------------------------ */
function InterestsStep({ hobbies, onChange, onNext, onBack, saving }) {
  return (
    <Box>
      <StepHeader eyebrow="Step 3 of 4" title="What are you into?" subtitle="This is how Circle matches you with the right people and communities." />
      <Autocomplete
        multiple
        freeSolo
        filterSelectedOptions
        options={HOBBIES}
        value={hobbies}
        onChange={(e, val) => onChange(val)}
        groupBy={(o) => (typeof o === "string" ? "Custom" : o.category)}
        getOptionLabel={hobbyLabel}
        isOptionEqualToValue={(a, b) => hobbyLabel(a).toLowerCase() === hobbyLabel(b).toLowerCase()}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={hobbyLabel(option)}
                {...tagProps}
                sx={{ borderRadius: "8px", fontWeight: 600, fontSize: 12.5, color: T.emberInk, bgcolor: T.emberTint, border: "none", m: "3px" }}
              />
            );
          })
        }
        renderInput={(params) => <TextField {...params} placeholder="Search or type your own…" sx={fieldSx} />}
      />
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue" skipLabel="Skip for now" loading={saving} nextDisabled={false} />
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Step 4 — Find friends
   ------------------------------------------------------------------ */
function FriendsStep({ onNext, onBack }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchService.searchUsers(query);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleSend = async (userId) => {
    try {
      await searchService.sendFriendRequest(undefined, userId);
      setSentIds((prev) => new Set(prev).add(userId));
    } catch {
      // request errors are non-fatal here; the person can retry from Friends later
    }
  };

  return (
    <Box>
      <StepHeader eyebrow="Step 4 of 4" title="Find your first few people." subtitle="Search by username and send a few requests to get your circle started." />
      <TextField
        fullWidth
        placeholder="Search by username…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={fieldSx}
      />
      <Box sx={{ mt: 2, minHeight: 220 }}>
        {searching ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={22} sx={{ color: T.ember }} />
          </Stack>
        ) : results.length === 0 ? (
          <Typography sx={{ fontSize: 13.5, color: T.inkFaint, textAlign: "center", py: 4 }}>
            {query.trim().length >= 2 ? "No matches — try a different name." : "Start typing a username to search."}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {results.map((u) => {
              const sent = sentIds.has(u.id);
              return (
                <Stack
                  key={u.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ ...cardSx, p: 1.5, px: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 38, height: 38, bgcolor: T.ember, fontWeight: 600 }}>
                      {u.username?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: T.ink }}>{u.username}</Typography>
                  </Stack>
                  <Button
                    onClick={() => handleSend(u.id)}
                    disabled={sent}
                    startIcon={sent ? <HourglassTopRoundedIcon sx={{ fontSize: 16 }} /> : <PersonAddRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      borderRadius: "999px",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 12.5,
                      px: 2,
                      color: sent ? T.inkFaint : T.emberInk,
                      bgcolor: sent ? "transparent" : T.emberTint,
                      "&:hover": { bgcolor: sent ? "transparent" : "#f6d4c4" },
                    }}
                  >
                    {sent ? "Sent" : "Add"}
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Finish" skipLabel="Skip for now" />
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Step 5 — Done
   ------------------------------------------------------------------ */
function DoneStep({ onFinish, loading }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Box
        sx={{
          width: 84,
          height: 84,
          borderRadius: "24px",
          bgcolor: T.signalTint,
          color: T.signal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 3,
        }}
      >
        <CheckCircleRoundedIcon sx={{ fontSize: 42 }} />
      </Box>
      <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 30, color: T.ink, mb: 1 }}>
        You're all set.
      </Typography>
      <Typography sx={{ fontSize: 15.5, color: T.inkSoft, mb: 4, maxWidth: 380, mx: "auto" }}>
        Your circle is ready. Head to your feed to see what's happening.
      </Typography>
      <Button
        onClick={onFinish}
        disabled={loading}
        disableElevation
        sx={{
          borderRadius: "999px",
          textTransform: "none",
          fontWeight: 700,
          fontSize: 15,
          px: 4,
          py: 1.3,
          bgcolor: T.ember,
          color: "#fff8f4",
          "&:hover": { bgcolor: "#c93a19" },
        }}
      >
        {loading ? <CircularProgress size={20} sx={{ color: "#fff8f4" }} /> : "Go to my feed"}
      </Button>
    </Box>
  );
}

/* ---------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */
function Onboarding() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [about, setAbout] = useState({ bio: "", gender: "", age: "", country: "", education: "" });
  const [hobbies, setHobbies] = useState([]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const savePhoto = useCallback(
    async (skipped) => {
      if (skipped || !profileImageFile) return goNext();
      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("profileImage", profileImageFile);
        await profileService.updateProfile(fd);
      } catch (err) {
        console.error("Failed to save photo:", err);
      } finally {
        setSaving(false);
        goNext();
      }
    },
    [profileImageFile]
  );

  const saveAbout = useCallback(
    async (skipped) => {
      if (skipped) return goNext();
      setSaving(true);
      try {
        const fd = new FormData();
        Object.entries(about).forEach(([k, v]) => v && fd.append(k, v));
        await profileService.updateProfile(fd);
      } catch (err) {
        console.error("Failed to save about info:", err);
      } finally {
        setSaving(false);
        goNext();
      }
    },
    [about]
  );

  const saveInterests = useCallback(
    async (skipped) => {
      if (skipped || hobbies.length === 0) return goNext();
      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("hobbies", hobbies.map(hobbyLabel).join(", "));
        await profileService.updateProfile(fd);
      } catch (err) {
        console.error("Failed to save interests:", err);
      } finally {
        setSaving(false);
        goNext();
      }
    },
    [hobbies]
  );

  const finish = async () => {
    setSaving(true);
    try {
      await profileService.completeOnboarding();
      await checkAuth(); // refresh so onboardingCompleted flips in context
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      setSaving(false);
      navigate("/home");
    }
  };

  const step = STEPS[stepIndex];

  return (
    <StepShell stepIndex={stepIndex} total={STEPS.length}>
      {step === "welcome" && <WelcomeStep username={user?.username} onNext={goNext} />}
      {step === "photo" && (
        <PhotoStep
          username={user?.username}
          file={profileImageFile}
          onFileChange={setProfileImageFile}
          onNext={savePhoto}
          onBack={goBack}
          saving={saving}
        />
      )}
      {step === "about" && (
        <AboutStep
          data={about}
          onChange={(patch) => setAbout((prev) => ({ ...prev, ...patch }))}
          onNext={saveAbout}
          onBack={goBack}
          saving={saving}
        />
      )}
      {step === "interests" && (
        <InterestsStep hobbies={hobbies} onChange={setHobbies} onNext={saveInterests} onBack={goBack} saving={saving} />
      )}
      {step === "friends" && <FriendsStep onNext={goNext} onBack={goBack} />}
      {step === "done" && <DoneStep onFinish={finish} loading={saving} />}
    </StepShell>
  );
}

export default Onboarding;