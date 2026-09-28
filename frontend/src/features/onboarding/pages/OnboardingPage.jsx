import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Card, LinearProgress, Stack, Typography } from "@mui/material";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Logo from "../../../components/ui/Logo";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { getErrorMessage } from "../../../lib/apiClient";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import { profileService } from "../../profile/services/profileService";
import ProfileFields, { profileToForm, validateProfile } from "../../profile/components/ProfileFields";
import { AvatarPicker, CoverPicker } from "../../profile/components/ImagePicker";

const STEPS = [
  { title: "Put a face to your name", subtitle: "A photo and a short bio help friends recognise you.", sections: ["identity"] },
  { title: "A little about you", subtitle: "All optional. Share only what you're comfortable with.", sections: ["about"] },
  { title: "What are you into?", subtitle: "Pick a few interests so we can suggest people and posts.", sections: ["interests"] },
];

export default function OnboardingPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [cover, setCover] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useDocumentTitle("Set up your profile");

  const profileQuery = useQuery({ queryKey: queryKeys.profile(user.id), queryFn: profileService.me });
  const values = form ?? profileToForm(profileQuery.data ?? { username: user.username });

  const finish = async (skip = false) => {
    setSaving(true);
    setError("");
    try {
      let updated = null;
      if (!skip) updated = await profileService.update({ ...values, avatar, cover });
      await profileService.completeOnboarding();
      updateUser({
        onboardingCompleted: true,
        ...(updated ? { username: updated.username, avatarUrl: updated.avatarUrl } : {}),
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your profile"));
      setSaving(false);
    }
  };

  const next = () => {
    const found = validateProfile(values);
    const relevant = Object.fromEntries(
      Object.entries(found).filter(([field]) => (step === 0 ? ["username", "bio"] : step === 1 ? ["age"] : []).includes(field)),
    );
    setErrors(relevant);
    if (Object.keys(relevant).length) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: tokens.paper, py: { xs: 3, sm: 6 }, px: 2 }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Logo size={20} to="/onboarding" />
          <Button size="small" onClick={() => logout()}>
            Log out
          </Button>
        </Stack>

        <Typography variant="overline" color="text.disabled">
          Step {step + 1} of {STEPS.length}
        </Typography>
        <LinearProgress variant="determinate" value={((step + 1) / STEPS.length) * 100} sx={{ height: 5, my: 1.5, "& .MuiLinearProgress-bar": { bgcolor: tokens.ember } }} />
        <Typography variant="h3" component="h1" sx={{ mt: 2 }}>
          {current.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {current.subtitle}
        </Typography>

        <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {step === 0 && (
            <Box sx={{ position: "relative", mb: 8 }}>
              <CoverPicker coverUrl={profileQuery.data?.coverUrl} file={cover} onChange={setCover} onError={setError} height={130} />
              <Box sx={{ position: "absolute", left: 20, bottom: -48 }}>
                <AvatarPicker user={{ ...user, avatarUrl: profileQuery.data?.avatarUrl }} file={avatar} onChange={setAvatar} onError={setError} />
              </Box>
            </Box>
          )}
          <ProfileFields form={values} onChange={setForm} errors={errors} sections={current.sections} />

          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 3.5 }}>
            {step > 0 ? (
              <Button startIcon={<ArrowLeft size={16} />} onClick={() => setStep(step - 1)} disabled={saving}>
                Back
              </Button>
            ) : (
              <Button onClick={() => finish(true)} disabled={saving}>
                Skip for now
              </Button>
            )}
            <Button variant="contained" size="large" endIcon={step < STEPS.length - 1 ? <ArrowRight size={16} /> : null} onClick={next} disabled={saving}>
              {saving ? "Saving..." : step < STEPS.length - 1 ? "Continue" : "Finish setup"}
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
