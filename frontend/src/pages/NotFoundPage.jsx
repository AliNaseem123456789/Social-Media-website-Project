import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import Logo from "../components/ui/Logo";
import { tokens } from "../theme/tokens";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", px: 3, bgcolor: tokens.paper }}>
      <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
        <Logo size={22} />
        <Typography sx={{ fontFamily: tokens.fontDisplay, fontSize: { xs: 72, sm: 110 }, lineHeight: 1, color: tokens.ember }}>404</Typography>
        <Typography variant="h5">This page wandered off</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 380 }}>
          The link may be broken, or the page may have been removed.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" size="large">
          Take me home
        </Button>
      </Stack>
    </Box>
  );
}
