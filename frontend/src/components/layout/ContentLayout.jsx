import { Box, Stack } from "@mui/material";

export default function ContentLayout({ children, aside, maxWidth = 680 }) {
  return (
    <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", justifyContent: "center" }}>
      <Box component="section" sx={{ flex: 1, minWidth: 0, maxWidth }}>
        {children}
      </Box>
      {aside && (
        <Stack
          component="aside"
          spacing={2}
          sx={{ display: { xs: "none", lg: "flex" }, width: 320, flexShrink: 0, position: "sticky", top: 88 }}
        >
          {aside}
        </Stack>
      )}
    </Box>
  );
}
