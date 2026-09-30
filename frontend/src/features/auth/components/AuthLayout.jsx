import { Box, Stack, Typography } from "@mui/material";
import Logo from "../../../components/ui/Logo";
import { tokens } from "../../../theme/tokens";
import { GraphCanvas } from "../../../components/LandingPage/GraphCanvas";

// Three things the app does, stated plainly. Not benefits, not adjectives.
const NOTES = [
  { title: "Threads that keep their shape", text: "Replies sit under what they answer, however long it runs." },
  { title: "Calls from the message", text: "One tap out of a conversation. No link to send anyone." },
  { title: "Yours to leave", text: "Delete the account from settings and it goes with you." },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
        bgcolor: tokens.paper,
      }}
    >
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          bgcolor: tokens.dark,
          color: tokens.paper,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* The same graph as the landing page, sunk into the corner so it reads as atmosphere. */}
        <Box
          sx={{
            position: "absolute",
            right: "-24%",
            bottom: "-18%",
            width: 680,
            height: 680,
            opacity: 0.62,
            pointerEvents: "none",
            "& > canvas": { width: "100%", height: "100%", display: "block" },
          }}
        >
          <GraphCanvas className="auth-orb" />
        </Box>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 70% 75%, ${tokens.ember}1f, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        <Box sx={{ position: "relative" }}>
          <Logo size={22} inverted />
        </Box>

        <Box sx={{ position: "relative", maxWidth: 440 }}>
          <Typography
            sx={{
              fontFamily: tokens.fontDisplay,
              fontSize: "2.9rem",
              lineHeight: 1.03,
              letterSpacing: "-0.03em",
              mb: 4,
            }}
          >
            Post it. Say it.{" "}
            <Box component="em" sx={{ color: tokens.ember, fontStyle: "italic" }}>
              Call
            </Box>{" "}
            about it.
          </Typography>
          <Stack spacing={2.5}>
            {NOTES.map((note) => (
              <Stack key={note.title} direction="row" spacing={2}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    mt: 1.1,
                    borderRadius: "50%",
                    bgcolor: tokens.ember,
                    flexShrink: 0,
                    boxShadow: `0 0 0 4px ${tokens.ember}26`,
                  }}
                />
                <Box>
                  <Typography sx={{ fontWeight: 650, fontSize: "0.96rem" }}>{note.title}</Typography>
                  <Typography sx={{ color: "rgba(250,248,244,.62)", fontSize: "0.88rem", lineHeight: 1.55 }}>
                    {note.text}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Typography
          sx={{
            position: "relative",
            fontFamily: tokens.fontMono,
            fontSize: 12,
            color: "rgba(250,248,244,.45)",
            letterSpacing: "0.08em",
          }}
        >
          © {new Date().getFullYear()} CIRCLE
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2.5, sm: 4 },
          py: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 392 }}>
          <Box sx={{ display: { md: "none" }, mb: 4 }}>
            <Logo size={22} />
          </Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: tokens.fontDisplay,
              fontSize: "2.1rem",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 1.25, mb: 3.5, fontSize: "0.98rem", lineHeight: 1.55 }}>
              {subtitle}
            </Typography>
          )}
          {children}
          {footer && <Box sx={{ mt: 3, textAlign: "center" }}>{footer}</Box>}
        </Box>
      </Box>
    </Box>
  );
}
