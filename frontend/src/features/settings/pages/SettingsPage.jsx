import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  AtSign,
  ChevronRight,
  Globe,
  Heart,
  Laptop,
  Lock,
  LogOut,
  MailCheck,
  MailPlus,
  MailWarning,
  MessageCircle,
  MessageCircleOff,
  Monitor,
  Moon,
  Send,
  ShieldBan,
  Smartphone,
  Sun,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import SectionCard from "../../../components/ui/SectionCard";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { getErrorMessage, getFieldErrors } from "../../../lib/apiClient";
import { queryKeys } from "../../../lib/queryClient";
import { timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { useToast } from "../../../context/ToastContext";
import { useColorMode } from "../../../context/ColorModeContext";
import { useAuth } from "../../auth/context/AuthContext";
import { authService } from "../../auth/services/authService";
import PasswordField from "../../auth/components/PasswordField";
import { profileService } from "../../profile/services/profileService";
import ChangeEmailDialog from "../components/ChangeEmailDialog";
import { DEFAULT_SETTINGS, useSettings, useUpdateSettings } from "../hooks";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const VISIBILITY = [
  { value: "public", label: "Public", icon: Globe, help: "Anyone on Circle can find you and read your posts." },
  { value: "followers", label: "Followers only", icon: Users, help: "Only people who follow you can see your posts and profile details." },
  { value: "private", label: "Private", icon: Lock, help: "Your profile and posts stay hidden. Only you can see them." },
];

const MESSAGE_POLICY = [
  { value: "everyone", label: "Everyone", icon: Globe, help: "Anyone on Circle can send you a first message." },
  { value: "following", label: "People you follow", icon: UserCheck, help: "Only accounts you follow can open a new chat with you." },
  { value: "friends", label: "Friends only", icon: Users, help: "Only people you have accepted as friends can open a new chat." },
  { value: "nobody", label: "No one", icon: MessageCircleOff, help: "Nobody new can start a chat with you." },
];

const EMAIL_PREFS = [
  { field: "emailOnLike", label: "Likes", help: "Someone likes your post or comment.", icon: Heart },
  { field: "emailOnComment", label: "Comments", help: "Someone comments on your post or replies to you.", icon: MessageCircle },
  { field: "emailOnMention", label: "Mentions", help: "Someone writes @you in a post or comment.", icon: AtSign },
  { field: "emailOnFriendRequest", label: "Friend requests", help: "Someone asks to be friends or starts following you.", icon: UserPlus },
  { field: "emailOnMessage", label: "Messages", help: "You get a direct message while you're away.", icon: Send },
];

function SettingsSkeleton({ rows = 3 }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={44} />
      ))}
    </Stack>
  );
}

function describeDevice(userAgent = "") {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) && !/Mobile/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return { label: `${browser} on ${os}`, mobile: /Mobile|Android|iPhone/.test(ua) };
}

function AccountSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [changingEmail, setChangingEmail] = useState(false);
  const resend = useMutation({
    mutationFn: authService.resendVerification,
    onSuccess: () => toast.success("Verification email sent. Check your inbox."),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <SectionCard title="Account" subtitle="Your sign-in details">
      <Stack divider={<Divider flexItem />} spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" component="p">
              Email
            </Typography>
            <Typography sx={{ fontWeight: 600, wordBreak: "break-all" }}>{user?.email}</Typography>
          </Box>
          {user?.emailVerified ? (
            <Chip icon={<MailCheck size={15} />} label="Verified" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, bgcolor: tokens.signalTint, color: tokens.signal, "& .MuiChip-icon": { color: tokens.signal } }} />
          ) : (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip icon={<MailWarning size={15} />} label="Not verified" sx={{ bgcolor: tokens.emberTint, color: tokens.emberInk, "& .MuiChip-icon": { color: tokens.emberInk } }} />
              <Button size="small" variant="outlined" onClick={() => resend.mutate()} disabled={resend.isPending}>
                Resend email
              </Button>
            </Stack>
          )}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>Change email</Typography>
            <Typography variant="caption" component="p">
              We send a confirmation link to the new address. Nothing changes until you open it.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MailPlus size={15} />}
            onClick={() => setChangingEmail(true)}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
          >
            Change email
          </Button>
        </Stack>
      </Stack>
      {changingEmail && <ChangeEmailDialog open onClose={() => setChangingEmail(false)} />}
    </SectionCard>
  );
}

function AppearanceSection({ settings, update }) {
  const { preference, setPreference } = useColorMode();
  const serverApplied = useRef(false);

  useEffect(() => {
    if (serverApplied.current || !settings.data) return;
    serverApplied.current = true;
    const stored = settings.data.theme;
    if (THEMES.some((t) => t.value === stored) && stored !== preference) setPreference(stored);
  }, [settings.data, preference, setPreference]);

  const choose = (next) => {
    if (!next || next === preference) return;
    const previous = preference;
    setPreference(next);
    update.mutate({ theme: next }, { onError: () => setPreference(previous) });
  };

  const pending = update.isPending && update.variables?.theme !== undefined;

  return (
    <SectionCard title="Appearance" subtitle="Choose how Circle looks on this account.">
      <ToggleButtonGroup
        exclusive
        value={preference}
        onChange={(_, next) => choose(next)}
        aria-label="Colour theme"
        sx={{
          gap: 1,
          flexWrap: "wrap",
          "& .MuiToggleButton-root": {
            flex: { xs: "1 1 100px", sm: "0 0 auto" },
            gap: 1,
            px: 2,
            py: 1.25,
            borderRadius: `${tokens.radius.pill}px`,
            border: `1px solid ${tokens.line}`,
            color: tokens.inkSoft,
            textTransform: "none",
            fontWeight: 600,
            "&:hover": { bgcolor: tokens.wash.ink },
            "&.Mui-selected": {
              bgcolor: tokens.emberTint,
              color: tokens.emberInk,
              borderColor: `color-mix(in srgb, ${tokens.ember} 45%, transparent)`,
              "&:hover": { bgcolor: tokens.emberTint },
            },
          },
        }}
      >
        {THEMES.map(({ value, label, icon: Icon }) => (
          <ToggleButton key={value} value={value} disabled={pending}>
            <Icon size={16} />
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography variant="caption" component="p" sx={{ mt: 1.5 }}>
        System follows your device setting and switches with it.
      </Typography>
    </SectionCard>
  );
}

function ChoiceGroup({ options, value, disabled, label, onChange }) {
  return (
    <RadioGroup value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} sx={{ gap: 0.5 }}>
      {options.map(({ value: option, label: optionLabel, icon: Icon, help }) => (
        <FormControlLabel
          key={option}
          value={option}
          disabled={disabled}
          control={<Radio size="small" sx={{ mt: 0.25, alignSelf: "flex-start" }} />}
          sx={{
            alignItems: "flex-start",
            m: 0,
            px: 1,
            py: 1.25,
            borderRadius: 3,
            border: `1px solid ${value === option ? tokens.ink : tokens.line}`,
            bgcolor: value === option ? tokens.wash.ink : "transparent",
            transition: "border-color .15s, background-color .15s",
            "&:hover": { borderColor: tokens.inkFaint },
          }}
          label={
            <Box sx={{ pt: 0.15 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Icon size={15} />
                <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>{optionLabel}</Typography>
              </Stack>
              <Typography variant="caption" component="p">
                {help}
              </Typography>
            </Box>
          }
        />
      ))}
    </RadioGroup>
  );
}

function GroupHeading({ children }) {
  return (
    <Typography variant="overline" component="p" sx={{ color: tokens.inkFaint, mb: 0.75 }}>
      {children}
    </Typography>
  );
}

function PrivacySection({ settings, update }) {
  const visibility = settings.data?.profileVisibility ?? DEFAULT_SETTINGS.profileVisibility;
  const messages = settings.data?.allowMessagesFrom ?? DEFAULT_SETTINGS.allowMessagesFrom;
  const visibilityPending = update.isPending && update.variables?.profileVisibility !== undefined;
  const messagesPending = update.isPending && update.variables?.allowMessagesFrom !== undefined;

  return (
    <SectionCard title="Privacy" subtitle="Decide who can see your profile and who can reach you.">
      <Stack spacing={2.5} divider={<Divider flexItem />}>
        {settings.isLoading ? (
          <SettingsSkeleton rows={4} />
        ) : (
          <Box>
            <GroupHeading>Profile visibility</GroupHeading>
            <ChoiceGroup
              options={VISIBILITY}
              value={visibility}
              disabled={visibilityPending}
              label="Who can see your profile"
              onChange={(next) => update.mutate({ profileVisibility: next })}
            />
          </Box>
        )}

        {!settings.isLoading && (
          <Box>
            <GroupHeading>Who can message you</GroupHeading>
            <ChoiceGroup
              options={MESSAGE_POLICY}
              value={messages}
              disabled={messagesPending}
              label="Who can message you"
              onChange={(next) => update.mutate({ allowMessagesFrom: next })}
            />
            <Typography variant="caption" component="p" sx={{ mt: 1 }}>
              This only decides who can start a new conversation. Chats you are already in stay open whichever option
              you pick.
            </Typography>
          </Box>
        )}

        <Box
          component={RouterLink}
          to="/settings/blocked"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.25,
            py: 1.25,
            borderRadius: 3,
            border: `1px solid ${tokens.line}`,
            textDecoration: "none",
            color: "inherit",
            transition: "border-color .15s, background-color .15s",
            "&:hover": { bgcolor: tokens.wash.ink, borderColor: tokens.inkFaint },
            "&:focus-visible": { outline: `2px solid ${tokens.ember}`, outlineOffset: 2 },
          }}
        >
          <Box sx={{ display: "flex", color: tokens.inkFaint }}>
            <ShieldBan size={18} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>Blocked accounts</Typography>
            <Typography variant="caption" component="p">
              Review who you have blocked and unblock them.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", color: tokens.inkFaint }}>
            <ChevronRight size={18} />
          </Box>
        </Box>
      </Stack>
    </SectionCard>
  );
}

function EmailNotificationsSection({ settings, update }) {
  return (
    <SectionCard title="Email notifications" subtitle="We only email you about the things you keep switched on.">
      {settings.isLoading ? (
        <SettingsSkeleton rows={5} />
      ) : (
        <Stack divider={<Divider flexItem />}>
          {EMAIL_PREFS.map(({ field, label, help, icon: Icon }) => {
            const checked = settings.data?.[field] ?? DEFAULT_SETTINGS[field];
            const pending = update.isPending && update.variables?.[field] !== undefined;
            return (
              <FormControlLabel
                key={field}
                labelPlacement="start"
                disabled={pending}
                control={
                  <Switch
                    checked={Boolean(checked)}
                    onChange={(event) => update.mutate({ [field]: event.target.checked })}
                    slotProps={{ input: { "aria-label": `Email me about ${label.toLowerCase()}` } }}
                  />
                }
                sx={{ m: 0, py: 1.25, gap: 2, justifyContent: "space-between", "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 } }}
                label={
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                    <Box sx={{ color: tokens.inkFaint, pt: 0.35 }}>
                      <Icon size={16} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>{label}</Typography>
                      <Typography variant="caption" component="p">
                        {help}
                      </Typography>
                    </Box>
                  </Stack>
                }
              />
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
}

function PasswordSection() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const hasPassword = user?.hasPassword !== false;

  const change = useMutation({
    mutationFn: () => authService.changePassword({ currentPassword: hasPassword ? form.currentPassword : undefined, newPassword: form.newPassword }),
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setErrors({});
      refreshUser();
      toast.success("Password updated. Other devices were signed out.");
    },
    onError: (err) => setErrors({ ...getFieldErrors(err), form: getErrorMessage(err) }),
  });

  const submit = (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirm) return setErrors({ confirm: "Passwords don't match" });
    change.mutate();
  };

  return (
    <SectionCard title={hasPassword ? "Change password" : "Set a password"} subtitle={hasPassword ? "Changing it signs you out everywhere else." : "You sign in with Google. Add a password to also sign in with email."}>
      <Stack component="form" onSubmit={submit} spacing={2} sx={{ maxWidth: 420 }}>
        {errors.form && <Alert severity="error">{errors.form}</Alert>}
        {hasPassword && (
          <PasswordField label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        )}
        <PasswordField label="New password" autoComplete="new-password" showStrength value={form.newPassword} error={errors.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <Box>
          <Button type="submit" variant="contained" color="secondary" disabled={change.isPending || !form.newPassword}>
            {change.isPending ? "Updating..." : "Update password"}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}

function SessionsSection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [confirmAll, setConfirmAll] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: queryKeys.sessions, queryFn: authService.sessions });

  const revoke = useMutation({
    mutationFn: authService.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      toast.success("Device signed out");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logoutAll = useMutation({
    mutationFn: authService.logoutAll,
    onSuccess: () => {
      clearSession();
      navigate("/login", { replace: true });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <SectionCard
      title="Where you're signed in"
      subtitle="Sign out devices you don't recognise."
      action={
        <Button size="small" variant="outlined" startIcon={<LogOut size={15} />} onClick={() => setConfirmAll(true)}>
          Sign out everywhere
        </Button>
      }
    >
      {isLoading && [0, 1].map((i) => <Skeleton key={i} height={56} />)}
      <Stack divider={<Divider flexItem />}>
        {data.map((session) => {
          const device = describeDevice(session.userAgent);
          const Icon = device.mobile ? Smartphone : Laptop;
          return (
            <Stack key={session.id} direction="row" spacing={1.5} sx={{ py: 1.5, alignItems: "center" }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: tokens.paper, border: `1px solid ${tokens.line}` }}>
                <Icon size={18} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>{device.label}</Typography>
                  {session.current && <Chip size="small" label="This device" sx={{ height: 20, bgcolor: tokens.signalTint, color: tokens.signal }} />}
                </Stack>
                <Typography variant="caption">
                  {session.ipAddress || "Unknown IP"} · Active {timeAgo(session.lastUsedAt)}
                </Typography>
              </Box>
              {!session.current && (
                <Button size="small" onClick={() => revoke.mutate(session.id)} disabled={revoke.isPending}>
                  Sign out
                </Button>
              )}
            </Stack>
          );
        })}
      </Stack>
      <ConfirmDialog
        open={confirmAll}
        title="Sign out everywhere?"
        description="You'll be signed out on every device, including this one."
        confirmLabel="Sign out everywhere"
        loading={logoutAll.isPending}
        onClose={() => setConfirmAll(false)}
        onConfirm={() => logoutAll.mutate()}
      />
    </SectionCard>
  );
}

function DangerSection() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const remove = useMutation({
    mutationFn: () => profileService.deleteAccount({ password: password || undefined, confirm }),
    onSuccess: () => {
      clearSession();
      navigate("/", { replace: true });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <SectionCard title="Delete account" subtitle="Permanently remove your profile, posts and messages.">
      <Button variant="outlined" color="error" onClick={() => setOpen(true)} sx={{ borderColor: "rgba(192,50,28,.4)", color: "error.main" }}>
        Delete my account
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete your account?"
        description="This is permanent and cannot be undone."
        confirmLabel="Delete account"
        destructive
        loading={remove.isPending}
        onClose={() => setOpen(false)}
        onConfirm={() => (confirm === "DELETE" ? remove.mutate() : setError('Type "DELETE" to confirm'))}
      >
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {user?.hasPassword !== false && <PasswordField label="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          <TextField label='Type "DELETE" to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Stack>
      </ConfirmDialog>
    </SectionCard>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const settings = useSettings();
  const update = useUpdateSettings();

  return (
    <ContentLayout maxWidth={760}>
      <PageHeader eyebrow="Preferences" title="Settings" subtitle="Manage your account, privacy and security." />
      <Stack spacing={2.5}>
        {settings.isError && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={() => settings.refetch()}>
                Retry
              </Button>
            }
          >
            Couldn't load your preferences. Appearance still works on this device.
          </Alert>
        )}
        <AccountSection />
        <AppearanceSection settings={settings} update={update} />
        <PrivacySection settings={settings} update={update} />
        <EmailNotificationsSection settings={settings} update={update} />
        <PasswordSection />
        <SessionsSection />
        <DangerSection />
      </Stack>
    </ContentLayout>
  );
}
