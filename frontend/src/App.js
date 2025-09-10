import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme'; // your MUI theme with dark background

import LoginSignuppage from './components/LoginSignuppage';
import Login from './components/Login'; 
import Signup from './components/Signup';
import Home from './components/Home';
import Postwrite from './components/postwrite';
import PostDetails from './components/PostDetails';
import MyPost from './components/MyPost';
import Profile from './components/Profile';
import FriendRequestsPage from './components/FriendsRequestpage';
import FriendsPage from './components/FriendsPage';
import ChatPage from './components/Chatbox';
import RecentChats from './components/RecentChats';
export default function App() {
  return (
  
      <Router>
        <Routes>
          <Route path="/" element={<LoginSignuppage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/postwrite" element={<Postwrite />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/friendrequests/:id" element={<FriendRequestsPage />} />
          <Route path="/fullpost/:id" element={<PostDetails />} />
          <Route path="/myposts/:id" element={<MyPost />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/friendspage/:id" element={<FriendsPage />} />
          <Route path="/chat/:user1/:user2" element={<ChatPage />} />
          <Route path="/recentchat/:id" element={<RecentChats />} />



        </Routes>
      </Router>
   
  );
}
