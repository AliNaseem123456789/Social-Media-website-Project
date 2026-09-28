import { Box, Stack, Typography } from "@mui/material";

export default function PageHeader({ eyebrow, title, subtitle, actions, sx }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between", mb: 3, ...sx }}
    >
      <Box>
        {eyebrow && (
          <Typography variant="overline" color="text.disabled" sx={{ display: "block", mb: 0.5 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
    </Stack>
  );
}
