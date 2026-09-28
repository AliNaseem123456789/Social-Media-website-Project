import { Box, Stack, Typography } from "@mui/material";
import Logo from "../../../components/ui/Logo";
import { tokens } from "../../../theme/tokens";

const HIGHLIGHTS = [
  { title: "Real-time chat", text: "Messages, typing indicators and video calls with the people you care about." },
  { title: "A feed that learns", text: "Posts from your circle, ranked by what you actually engage with." },
  { title: "Private by default", text: "Your sessions, your devices. Sign out anywhere, anytime." },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" }, bgcolor: tokens.paper }}>
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
        <Box sx={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1px solid rgba(250,248,244,.08)", right: -180, top: -160 }} />
        <Box sx={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,67,31,.35), transparent 65%)", left: -120, bottom: -80 }} />
        <Box sx={{ position: "relative" }}>
          <Logo size={22} inverted />
        </Box>
        <Box sx={{ position: "relative", maxWidth: 460 }}>
          <Typography sx={{ fontFamily: tokens.fontDisplay, fontSize: "2.6rem", lineHeight: 1.1, letterSpacing: "-0.03em", mb: 4 }}>
            The internet, but it <Box component="em" sx={{ color: tokens.ember }}>remembers</Box> your friends.
          </Typography>
          <Stack spacing={2.5}>
            {HIGHLIGHTS.map((h) => (
              <Stack key={h.title} direction="row" spacing={2}>
                <Box sx={{ width: 8, height: 8, mt: 1, borderRadius: "50%", bgcolor: tokens.ember, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontWeight: 650 }}>{h.title}</Typography>
                  <Typography sx={{ color: "rgba(250,248,244,.62)", fontSize: "0.9rem" }}>{h.text}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography sx={{ position: "relative", fontFamily: tokens.fontMono, fontSize: 12, color: "rgba(250,248,244,.45)", letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} CIRCLE
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", px: { xs: 2.5, sm: 4 }, py: 6 }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: { md: "none" }, mb: 4 }}>
            <Logo size={22} />
          </Box>
          <Typography variant="h3" component="h1">
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>
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
