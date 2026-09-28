import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Camera } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { tokens } from "../../../theme/tokens";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function usePicker(onPick, onError) {
  const ref = useRef(null);
  const open = () => ref.current?.click();
  const input = (
    <input
      ref={ref}
      type="file"
      hidden
      accept={TYPES.join(",")}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!TYPES.includes(file.type)) return onError?.("Use a JPEG, PNG, GIF or WEBP image");
        if (file.size > MAX_BYTES) return onError?.("Images must be 5 MB or smaller");
        onPick(file);
      }}
    />
  );
  return { open, input };
}

function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function AvatarPicker({ user, file, onChange, onError, size = 96 }) {
  const preview = useObjectUrl(file);
  const { open, input } = usePicker(onChange, onError);
  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <UserAvatar user={{ ...user, avatarUrl: preview || user?.avatarUrl }} size={size} sx={{ border: `4px solid ${tokens.surface}`, boxShadow: tokens.shadow.card }} />
      <Tooltip title="Change photo">
        <IconButton onClick={open} size="small" aria-label="Change photo" sx={{ position: "absolute", right: 0, bottom: 0, bgcolor: tokens.ink, color: "#fff", border: `3px solid ${tokens.surface}`, "&:hover": { bgcolor: "#2b2720", color: "#fff" } }}>
          <Camera size={15} />
        </IconButton>
      </Tooltip>
      {input}
    </Box>
  );
}

export function CoverPicker({ coverUrl, file, onChange, onError, height = 150 }) {
  const preview = useObjectUrl(file);
  const { open, input } = usePicker(onChange, onError);
  const src = preview || coverUrl;
  return (
    <Box
      sx={{
        position: "relative",
        height,
        borderRadius: 3,
        overflow: "hidden",
        background: src ? `center / cover no-repeat url(${src})` : `linear-gradient(120deg, ${tokens.emberTint}, #f3e3c9 55%, ${tokens.signalTint})`,
      }}
    >
      <Tooltip title="Change cover">
        <IconButton onClick={open} aria-label="Change cover" sx={{ position: "absolute", right: 12, bottom: 12, bgcolor: "rgba(22,20,15,.65)", color: "#fff", "&:hover": { bgcolor: tokens.ink, color: "#fff" } }}>
          <Camera size={17} />
        </IconButton>
      </Tooltip>
      {input}
    </Box>
  );
}
