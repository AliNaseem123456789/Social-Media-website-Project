import { useCallback, useEffect, useState } from "react";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { tokens } from "../../theme/tokens";

const LAYOUTS = {
  1: { columns: "1fr", rows: "1fr", areas: null },
  2: { columns: "1fr 1fr", rows: "1fr", areas: null },
  3: { columns: "2fr 1fr", rows: "1fr 1fr", areas: ['"a b"', '"a c"'] },
  4: { columns: "1fr 1fr", rows: "1fr 1fr", areas: null },
};

/**
 * Shows one to four images in a single frame and opens them full size with keyboard navigation.
 * Alt text travels with each image so screen readers and the lightbox caption both use it.
 */
export default function PostGallery({ images = [], maxHeight = 480, rounded = 3 }) {
  const [openAt, setOpenAt] = useState(null);
  const visible = images.slice(0, 4);
  const layout = LAYOUTS[visible.length] ?? LAYOUTS[4];

  const move = useCallback(
    (step) => setOpenAt((current) => (current === null ? current : (current + step + visible.length) % visible.length)),
    [visible.length],
  );

  useEffect(() => {
    if (openAt === null) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAt, move]);

  if (!visible.length) return null;
  const active = openAt === null ? null : visible[openAt];

  return (
    <>
      <Box
        sx={{
          mt: 1.5,
          display: "grid",
          gap: 0.5,
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          ...(layout.areas ? { gridTemplateAreas: layout.areas.join(" ") } : {}),
          borderRadius: rounded,
          overflow: "hidden",
          border: `1px solid ${tokens.line}`,
          bgcolor: tokens.paperDeep,
          maxHeight,
        }}
      >
        {visible.map((image, index) => (
          <Box
            key={image.url ?? index}
            component="button"
            type="button"
            onClick={() => setOpenAt(index)}
            aria-label={image.alt || `Open image ${index + 1}`}
            sx={{
              position: "relative",
              p: 0,
              border: 0,
              cursor: "zoom-in",
              bgcolor: "transparent",
              minHeight: visible.length === 1 ? 0 : 150,
              ...(layout.areas ? { gridArea: ["a", "b", "c"][index] } : {}),
            }}
          >
            <Box
              component="img"
              src={image.url}
              alt={image.alt || ""}
              loading="lazy"
              sx={{
                display: "block",
                width: "100%",
                height: "100%",
                maxHeight: visible.length === 1 ? maxHeight : undefined,
                objectFit: "cover",
              }}
            />
            {image.alt && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: tokens.scrim,
                  color: "#fff",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                ALT
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Dialog
        open={openAt !== null}
        onClose={() => setOpenAt(null)}
        maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: "transparent", border: 0, boxShadow: "none", overflow: "visible" } } }}
      >
        {active && (
          <Box sx={{ position: "relative" }}>
            <Box
              component="img"
              src={active.url}
              alt={active.alt || ""}
              sx={{ display: "block", maxWidth: "100%", maxHeight: "82vh", borderRadius: 3 }}
            />
            <IconButton
              onClick={() => setOpenAt(null)}
              aria-label="Close"
              sx={{ position: "absolute", top: 8, right: 8, bgcolor: tokens.scrim, color: "#fff" }}
            >
              <X size={18} />
            </IconButton>
            {visible.length > 1 && (
              <>
                <IconButton
                  onClick={() => move(-1)}
                  aria-label="Previous image"
                  sx={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", bgcolor: tokens.scrim, color: "#fff" }}
                >
                  <ChevronLeft size={20} />
                </IconButton>
                <IconButton
                  onClick={() => move(1)}
                  aria-label="Next image"
                  sx={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", bgcolor: tokens.scrim, color: "#fff" }}
                >
                  <ChevronRight size={20} />
                </IconButton>
              </>
            )}
            {active.alt && (
              <Typography variant="caption" sx={{ display: "block", mt: 1, textAlign: "center", color: "#fff" }}>
                {active.alt}
              </Typography>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}
