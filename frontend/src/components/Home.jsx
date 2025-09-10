import React from 'react';
import Feed from './posts';
import RecentChats from "./RecentChats";
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Box } from '@mui/material';

function Home() {
  return (
    <Box sx={{ bgcolor: "#f0f2f5", color: '#000', minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ display: 'flex', pt: 2, px: 2, alignItems: 'flex-start' }}> 
        {/* Left Column: Sidebar + Recent Chats */}
        <Box sx={{ display: 'flex', flexDirection: 'column', width: 280, mr: 2 }}>
          <Sidebar />

          {/* Sticky Recent Chats */}
          <Box sx={{ mt: 2 }}>
            <RecentChats />
          </Box>
        </Box>

        {/* Main Feed */}
        <Box sx={{ flex: 1, minWidth: 0,ml:-30 }}>
          <Feed />
        </Box>
      </Box>
    </Box>
  );
}

export default Home;
