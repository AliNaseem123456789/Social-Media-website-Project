import React from "react";
import Feed from "../features/posts/pages/Feed";
import RecentChats from "../features/friends/pages/RecentChats";
import Sidebar from "./Sidebar";
import { Box } from "@mui/material";

function Home() {
  return (
    <Box sx={{ bgcolor: "#f0f2f5", color: "#000", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", pt: 2, px: 2, alignItems: "flex-start" }}>
        <Box
          sx={{ display: "flex", flexDirection: "column", width: 280, mr: 2 }}
        >
          <Sidebar />
          <Box sx={{ mt: 2 }}>
            <RecentChats />
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, ml: -30 }}>
          <Feed />
        </Box>
      </Box>
    </Box>
  );
}

export default Home;
