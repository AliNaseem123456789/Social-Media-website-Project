import { Box, Typography } from "@mui/material";
import { tokens } from "../../theme/tokens";

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <Box sx={{ textAlign: "center", py: compact ? 4 : 8, px: 3 }}>
      {Icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            borderRadius: "18px",
            display: "grid",
            placeItems: "center",
            bgcolor: tokens.emberTint,
            color: tokens.emberInk,
          }}
        >
          <Icon size={24} strokeWidth={1.8} />
        </Box>
      )}
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  );
}
