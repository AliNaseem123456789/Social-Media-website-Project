import { Paper, Stack, Typography, Divider, Box } from "@mui/material"; // Added Box
const ProfileStats = ({ userId }) => (
  <Paper
    elevation={0}
    sx={{ p: 3, borderRadius: 6, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}
  >
    <Stack
      direction="row"
      justifyContent="space-evenly"
      divider={<Divider orientation="vertical" flexItem />}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          124
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Posts
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          1.2k
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Friends
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          850
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Likes
        </Typography>
      </Box>
    </Stack>
  </Paper>
);
export default ProfileStats;
