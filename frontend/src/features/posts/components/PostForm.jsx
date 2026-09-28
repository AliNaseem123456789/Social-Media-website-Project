import { useEffect, useRef, useState } from "react";
import { Box, Button, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { CalendarClock, Crop, ImagePlus, X } from "lucide-react";
import { tokens } from "../../../theme/tokens";

const MAX_LENGTH = 5000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ALT_LENGTH = 200;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

let imageKey = 0;

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * Crops to a centred square on a canvas so the upload matches what the thumbnail strip shows. The
 * original file is kept alongside it, which is what lets the toggle go back.
 */
async function cropToSquare(file) {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Canvas export failed");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-square.jpg`, { type: "image/jpeg" });
}

function Thumb({ src, alt = "", size = 64 }) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        display: "block",
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: "cover",
        borderRadius: 2,
        border: `1px solid ${tokens.line}`,
        bgcolor: tokens.paperDeep,
      }}
    />
  );
}

function ExistingImages({ images, atomic, onRemoveAll, onRemoveAt, disabled }) {
  if (!images.length) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
        <Typography variant="caption">Current {images.length > 1 ? "images" : "image"}</Typography>
        {atomic && (
          <Button size="small" variant="text" onClick={onRemoveAll} disabled={disabled}>
            {images.length > 1 ? "Remove all" : "Remove"}
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {images.map((image, index) => (
          <Box key={image.url} sx={{ position: "relative" }}>
            <Thumb src={image.url} alt={image.alt || ""} />
            {!atomic && (
              <Tooltip title="Remove this image">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onRemoveAt(index)}
                    disabled={disabled}
                    aria-label="Remove this image"
                    sx={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      bgcolor: tokens.scrim,
                      color: "#fff",
                      "&:hover": { bgcolor: tokens.ink, color: "#fff" },
                      "&.Mui-disabled": { bgcolor: tokens.lineSoft, color: tokens.inkFaint },
                    }}
                  >
                    <X size={13} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        ))}
      </Stack>
      {atomic && images.length > 0 && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.75 }}>
          Images are replaced as a set, so new ones take over from these.
        </Typography>
      )}
    </Box>
  );
}

function NewImageRow({ item, first, busy, disabled, onAlt, onCrop, onRemove }) {
  const isGif = item.original.type === "image/gif";

  return (
    <Stack direction="row" spacing={1.25} sx={{ mt: 1.25, alignItems: "flex-start" }}>
      <Thumb src={item.url} alt={item.alt} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          size="small"
          value={item.alt}
          onChange={(event) => onAlt(event.target.value)}
          placeholder="Describe this image"
          disabled={disabled}
          helperText={first ? "Alt text helps people using a screen reader." : undefined}
          slotProps={{ htmlInput: { maxLength: MAX_ALT_LENGTH, "aria-label": "Alt text for this image" } }}
        />
      </Box>
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Tooltip title={isGif ? "Cropping isn't available for GIFs" : item.cropped ? "Undo square crop" : "Crop to a square"}>
          <span>
            <IconButton
              size="small"
              onClick={onCrop}
              disabled={disabled || busy || isGif}
              aria-label={item.cropped ? "Undo square crop" : "Crop to a square"}
              aria-pressed={item.cropped}
              sx={{ color: item.cropped ? tokens.ember : undefined }}
            >
              <Crop size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton size="small" onClick={onRemove} disabled={disabled} aria-label="Remove this image">
          <X size={16} />
        </IconButton>
      </Stack>
    </Stack>
  );
}

export default function PostForm({
  initialContent = "",
  initialImageUrl = null,
  initialImages = null,
  initialScheduledFor = null,
  submitLabel = "Post",
  submitting = false,
  autoFocus = false,
  minRows = 3,
  allowScheduling = false,
  allowSaveDraft = false,
  existingImagesAtomic = true,
  onSubmit,
  onCancel,
  placeholder = "What's on your mind?",
}) {
  const startingImages =
    initialImages ?? (initialImageUrl ? [{ url: initialImageUrl, alt: "" }] : []);
  const hadExisting = startingImages.length > 0;

  const [content, setContent] = useState(initialContent);
  const [existing, setExisting] = useState(startingImages);
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState(toLocalInput(initialScheduledFor));
  const [showSchedule, setShowSchedule] = useState(Boolean(initialScheduledFor));
  const [earliest, setEarliest] = useState("");
  const [cropping, setCropping] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const urlsRef = useRef(new Set());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const track = (file) => {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return url;
  };

  const total = existing.length + items.length;
  const remaining = MAX_IMAGES - total;

  const pickImages = (event) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!chosen.length) return;
    if (chosen.some((file) => !IMAGE_TYPES.includes(file.type))) {
      setError("Use a JPEG, PNG, GIF or WEBP image.");
      return;
    }
    if (chosen.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError("Images must be 5 MB or smaller.");
      return;
    }
    setError(chosen.length > remaining ? `You can add up to ${MAX_IMAGES} images.` : "");
    const accepted = chosen.slice(0, remaining).map((file) => {
      imageKey += 1;
      return { key: imageKey, file, original: file, url: track(file), alt: "", cropped: false };
    });
    setItems((current) => [...current, ...accepted]);
  };

  const patchItem = (key, patch) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const toggleCrop = async (item) => {
    if (item.cropped) {
      patchItem(item.key, { file: item.original, url: track(item.original), cropped: false });
      return;
    }
    setCropping(item.key);
    try {
      const file = await cropToSquare(item.original);
      patchItem(item.key, { file, url: track(file), cropped: true });
      setError("");
    } catch {
      setError("Couldn't crop that image. It was left as it is.");
    } finally {
      setCropping(null);
    }
  };

  const trimmed = content.trim();
  const scheduleDate = showSchedule && schedule ? new Date(schedule) : null;
  const scheduledFor = scheduleDate && !Number.isNaN(scheduleDate.getTime()) ? scheduleDate.toISOString() : null;
  const hasBody = trimmed.length > 0 || total > 0;
  const canSubmit = !submitting && !cropping && hasBody && content.length <= MAX_LENGTH;
  const left = MAX_LENGTH - content.length;

  const reset = () => {
    setContent("");
    setItems([]);
    setSchedule("");
    setShowSchedule(false);
  };

  const send = async (asDraft) => {
    if (!canSubmit) return;
    if (scheduleDate && scheduleDate.getTime() <= Date.now()) {
      setError("Pick a time in the future to schedule this post.");
      return;
    }
    setError("");
    const ok = await onSubmit({
      content: trimmed,
      images: items.map((item) => item.file),
      alt: items.map((item) => item.alt.trim()),
      keptImages: existing.map((image) => image.url),
      removeImage: hadExisting && existing.length === 0,
      scheduledFor,
      scheduleTouched: Boolean(initialScheduledFor) || showSchedule,
      asDraft,
    });
    if (ok !== false && !initialContent && !hadExisting) reset();
  };

  const submit = (event) => {
    event.preventDefault();
    send(false);
  };

  return (
    <Box component="form" onSubmit={submit}>
      <TextField
        multiline
        minRows={minRows}
        maxRows={14}
        value={content}
        autoFocus={autoFocus}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        variant="standard"
        slotProps={{ input: { disableUnderline: true, sx: { fontSize: "1.02rem", lineHeight: 1.6 } } }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
        }}
      />

      <ExistingImages
        images={existing}
        atomic={existingImagesAtomic}
        disabled={submitting}
        onRemoveAll={() => setExisting([])}
        onRemoveAt={(index) => setExisting((current) => current.filter((_, i) => i !== index))}
      />

      {items.map((item, index) => (
        <NewImageRow
          key={item.key}
          item={item}
          first={index === 0}
          busy={cropping === item.key}
          disabled={submitting}
          onAlt={(value) => patchItem(item.key, { alt: value })}
          onCrop={() => toggleCrop(item)}
          onRemove={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
        />
      ))}

      {showSchedule && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "flex-start" }}>
          <TextField
            type="datetime-local"
            size="small"
            label="Publish at"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            disabled={submitting}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: earliest || undefined } }}
          />
          <IconButton
            onClick={() => {
              setShowSchedule(false);
              setSchedule("");
            }}
            disabled={submitting}
            aria-label="Cancel scheduling"
            sx={{ mt: 0.25 }}
          >
            <X size={16} />
          </IconButton>
        </Stack>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
          {error}
        </Typography>
      )}

      {(submitting || cropping) && <LinearProgress sx={{ mt: 1.5 }} />}

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 1,
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${tokens.lineSoft}`,
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} multiple hidden onChange={pickImages} />
          <Tooltip title={remaining > 0 ? "Add image" : `Up to ${MAX_IMAGES} images`}>
            <span>
              <IconButton
                onClick={() => fileRef.current?.click()}
                aria-label="Add image"
                disabled={submitting || remaining <= 0}
                sx={{ color: tokens.ember }}
              >
                <ImagePlus size={20} />
              </IconButton>
            </span>
          </Tooltip>
          {allowScheduling && !showSchedule && (
            <Tooltip title="Schedule for later">
              <span>
                <IconButton
                  onClick={() => {
                    setEarliest(toLocalInput(Date.now() + 60_000));
                    setShowSchedule(true);
                  }}
                  aria-label="Schedule for later"
                  disabled={submitting}
                >
                  <CalendarClock size={19} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {total > 0 && (
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {total}/{MAX_IMAGES}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {content.length > MAX_LENGTH * 0.8 && (
            <Typography variant="caption" sx={{ color: left < 0 ? "error.main" : "text.disabled", fontFamily: tokens.fontMono }}>
              {left}
            </Typography>
          )}
          {onCancel && (
            <Button onClick={onCancel} variant="text" disabled={submitting}>
              Cancel
            </Button>
          )}
          {allowSaveDraft && (
            <Button onClick={() => send(true)} variant="text" disabled={!canSubmit}>
              Save draft
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {scheduledFor ? "Schedule" : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
