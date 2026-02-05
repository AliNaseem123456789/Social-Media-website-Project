import { useState } from "react";
import { Tabs, Tab, Box, Typography, Grid } from "@mui/material";

const ProfileTabs = ({ userId }) => {
  const [value, setValue] = useState(0);

  return (
    <Box>
      <Tabs
        value={value}
        onChange={(e, val) => setValue(val)}
        sx={{
          mb: 3,
          "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
        }}
      >
        <Tab label="Posts" sx={{ fontWeight: 700, textTransform: "none" }} />
        <Tab label="Photos" sx={{ fontWeight: 700, textTransform: "none" }} />
        <Tab label="About" sx={{ fontWeight: 700, textTransform: "none" }} />
      </Tabs>

      {value === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 10 }}
        >
          User's post feed will load here...
        </Typography>
      )}
      {value === 1 && (
        <Grid container spacing={1}>
          {/* Placeholder for a photo grid */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={4} key={i}>
              <Box
                sx={{ aspectRatio: "1/1", bgcolor: "#e0e0e0", borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
export default ProfileTabs;
