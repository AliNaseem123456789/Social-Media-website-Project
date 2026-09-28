import { useEffect, useState } from "react";
import { Box, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { tokens } from "../../../theme/tokens";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function MessageComposer({ connected, sending, onSend, onTyping }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Use a JPEG, PNG, GIF or WEBP image");
    if (file.size > MAX_BYTES) return toast.error("Images must be 5 MB or smaller");
    setImage(file);
  };

  const submit = async (event) => {
    event?.preventDefault();
    const value = text.trim();
    if (sending || (!value && !image)) return;
    onTyping(false);
    const sent = await onSend({ text: value, image });
    if (sent) {
      setText("");
      setImage(null);
    }
  };

  const empty = !text.trim() && !image;

  return (
    <Stack component="form" onSubmit={submit} sx={{ p: 1.5, borderTop: `1px solid ${tokens.line}`, gap: 1 }}>
      {preview && (
        <Box sx={{ position: "relative", width: 84, height: 84 }}>
          <Box
            component="img"
            src={preview}
            alt="Attached image"
            sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.line}` }}
          />
          <IconButton
            size="small"
            onClick={() => setImage(null)}
            aria-label="Remove attached image"
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: tokens.ink,
              color: tokens.onInk,
              border: `2px solid ${tokens.surface}`,
              "&:hover": { bgcolor: tokens.ink, color: tokens.onInk },
            }}
          >
            <X size={13} />
          </IconButton>
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
        <Tooltip title="Attach an image">
          <IconButton component="label" aria-label="Attach an image" disabled={sending} sx={{ width: 42, height: 42 }}>
            <ImagePlus size={19} />
            <input type="file" hidden accept={TYPES.join(",")} disabled={sending} onChange={pick} />
          </IconButton>
        </Tooltip>
        <TextField
          multiline
          maxRows={5}
          size="small"
          placeholder={connected ? "Write a message..." : "Reconnecting... messages will still be sent"}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onTyping(event.target.value.length > 0);
          }}
          onBlur={() => onTyping(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) submit(event);
          }}
          slotProps={{ htmlInput: { maxLength: 4000, "aria-label": "Message" } }}
        />
        <IconButton
          type="submit"
          disabled={empty || sending}
          aria-label="Send"
          sx={{
            width: 42,
            height: 42,
            bgcolor: tokens.ember,
            color: "#fff",
            "&:hover": { bgcolor: tokens.emberDark, color: "#fff" },
            "&.Mui-disabled": { bgcolor: tokens.lineSoft },
          }}
        >
          <SendHorizontal size={18} />
        </IconButton>
      </Stack>
    </Stack>
  );
}
