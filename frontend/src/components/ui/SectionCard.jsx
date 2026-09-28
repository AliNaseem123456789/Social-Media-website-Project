import { Box, Card, Stack, Typography } from "@mui/material";

export default function SectionCard({ title, subtitle, action, children, padding = 2.5, sx }) {
  return (
    <Card sx={sx}>
      {(title || action) && (
        <Stack
          direction="row"
          sx={{ px: padding, pt: padding, pb: 1.5, alignItems: "center", justifyContent: "space-between", gap: 2 }}
        >
          <Box>
            {title && <Typography variant="subtitle1">{title}</Typography>}
            {subtitle && (
              <Typography variant="caption" component="p">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ px: padding, pb: padding, pt: title || action ? 0 : padding }}>{children}</Box>
    </Card>
  );
}
