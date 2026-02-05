import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Footer } from "./components/LandingPage/Footer";
import LoginSignuppage from "./features/auth/pages/LoginSignuppage";
import Login from "./features/auth/pages/Login";
import Signup from "./features/auth/pages/Signup";
import Home from "./components/Home";
import WritePost from "./features/posts/pages/WritePost";
import PostDetails from "./features/posts/pages/PostDetails";
import MyPost from "../src/features/posts/pages/MyPost";
import Profile from "./features/profile/pages/Profile";
import FriendRequestsPage from "./features/friends/pages/FriendsRequestpage";
import FriendsPage from "./features/friends/pages/FriendsPage";
import RecentChats from "./features/friends/pages/RecentChats";
import ChatPage from "./features/friends/pages/Chatbox";
import Navbar from "./components/Navbar";
import VideoCall from "./features/friends/pages/VideoCall";
import ProtectedRoute from "./features/auth/components/RouteGuards";
import Chatbot from "./pages/Chatbot";
export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* PUBLIC ROUTES - Accessible by anyone */}
        <Route path="/" element={<LoginSignuppage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PROTECTED ROUTES - Only for logged in users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/postwrite" element={<WritePost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/friendrequests/:id" element={<FriendRequestsPage />} />
          <Route path="/fullpost/:id" element={<PostDetails />} />
          <Route path="/myposts/:id" element={<MyPost />} />
          <Route path="/friendspage/:id" element={<FriendsPage />} />
          <Route path="/chat/:user1/:user2" element={<ChatPage />} />
          <Route path="/recentchat/:id" element={<RecentChats />} />
          <Route path="/videocall" element={<VideoCall />} />
          {/* <Route path="/chatbot" element={<Chatbot />} /> */}
        </Route>

        {/* FALLBACK - Redirect to login/landing if route doesn't exist */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Chatbot />
      <Footer />
    </Router>
  );
}
