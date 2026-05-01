import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Skeleton,
  Paper,
  Chip,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import apiClient from "../../../api/apiClient";
import Sidebar from "../../../components/Sidebar";

function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get("q") || "";

  const [tabValue, setTabValue] = useState(0);
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState({
    people: false,
    posts: false,
  });
  const [currentUserId] = useState(localStorage.getItem("user_id"));
  useEffect(() => {
    console.log("SearchResults mounted with query:", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      console.log("Searching for:", searchQuery);
      searchPeople();
      searchPosts();
    } else {
      console.log("Query too short or empty:", searchQuery);
    }
  }, [searchQuery]);

  const searchPeople = async () => {
    setLoading((prev) => ({ ...prev, people: true }));
    try {
      console.log("Fetching people with query:", searchQuery);
      const response = await apiClient.get(
        `/search/users?q=${encodeURIComponent(searchQuery)}`,
      );
      console.log("People results:", response.data);
      setPeople(response.data);
    } catch (error) {
      console.error("Error searching people:", error);
    } finally {
      setLoading((prev) => ({ ...prev, people: false }));
    }
  };

  const searchPosts = async () => {
    setLoading((prev) => ({ ...prev, posts: true }));
    try {
      console.log("Fetching posts with query:", searchQuery);
      const response = await apiClient.get(
        `/search/posts?q=${encodeURIComponent(searchQuery)}`,
      );
      console.log("Posts results:", response.data);
      setPosts(response.data);
    } catch (error) {
      console.error("Error searching posts:", error);
    } finally {
      setLoading((prev) => ({ ...prev, posts: false }));
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await apiClient.post("/friends/request", {
        from_user: currentUserId,
        to_user: userId,
      });
      setPeople((prev) =>
        prev.map((person) =>
          person.id === userId ? { ...person, requestSent: true } : person,
        ),
      );
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  const handleChat = (userId) => {
    navigate(`/chat/${currentUserId}/${userId}`);
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleViewPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Show message if no query
  if (!searchQuery || searchQuery.trim().length < 2) {
    return (
      <Box sx={{ display: "flex", bgcolor: "#f4f7fe", minHeight: "100vh" }}>
        <Sidebar />
        <Container maxWidth="lg" sx={{ py: 4, ml: { sm: 0, md: 30 } }}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h6" color="text.secondary">
              Please enter a search term to see results
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", bgcolor: "#f4f7fe", minHeight: "100vh" }}>
      <Sidebar />

      <Container maxWidth="lg" sx={{ py: 4, ml: { sm: 0, md: 30 } }}>
        {/* Search Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Search Results for "{searchQuery}"
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Found {people.length + posts.length} results
          </Typography>
        </Paper>

        {/* Tabs for People/Posts */}
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              px: 2,
              pt: 1,
            }}
          >
            <Tab
              label={`People (${people.length})`}
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Posts (${posts.length})`}
              icon={<ChatBubbleOutlineIcon />}
              iconPosition="start"
            />
          </Tabs>

          {/* People Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              {loading.people ? (
                Array.from(new Array(3)).map((_, i) => (
                  <Box
                    key={i}
                    sx={{ display: "flex", alignItems: "center", mb: 3 }}
                  >
                    <Skeleton variant="circular" width={60} height={60} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Skeleton width="60%" height={30} />
                      <Skeleton width="40%" height={20} />
                    </Box>
                  </Box>
                ))
              ) : people.length > 0 ? (
                <Grid container spacing={2}>
                  {people.map((person) => (
                    <Grid item xs={12} key={person.id}>
                      <Card
                        sx={{ borderRadius: 2, "&:hover": { boxShadow: 3 } }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                flex: 1,
                              }}
                            >
                              <Avatar
                                src={person.avatar_url}
                                sx={{
                                  width: 60,
                                  height: 60,
                                  bgcolor: "#1877f2",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleViewProfile(person.id)}
                              >
                                {person.username?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ ml: 2 }}>
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  sx={{
                                    cursor: "pointer",
                                    "&:hover": { color: "#1877f2" },
                                  }}
                                  onClick={() => handleViewProfile(person.id)}
                                >
                                  {person.username}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {person.email}
                                </Typography>
                                {person.bio && (
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    {person.bio}
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {Number(person.id) !== Number(currentUserId) && (
                              <Box>
                                {person.isFriend ? (
                                  <Chip
                                    label="Friends"
                                    color="success"
                                    size="small"
                                  />
                                ) : person.requestSent ? (
                                  <Chip
                                    label="Request Sent"
                                    color="warning"
                                    size="small"
                                  />
                                ) : (
                                  <>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<PersonAddIcon />}
                                      onClick={() =>
                                        handleSendFriendRequest(person.id)
                                      }
                                      sx={{ mr: 1, textTransform: "none" }}
                                    >
                                      Add Friend
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleChat(person.id)}
                                      sx={{ textTransform: "none" }}
                                    >
                                      Message
                                    </Button>
                                  </>
                                )}
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    No people found matching "{searchQuery}"
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Posts Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              {loading.posts ? (
                Array.from(new Array(3)).map((_, i) => (
                  <Box key={i} sx={{ mb: 3 }}>
                    <Skeleton
                      variant="rectangular"
                      height={200}
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                ))
              ) : posts.length > 0 ? (
                <Grid container spacing={3}>
                  {posts.map((post) => (
                    <Grid item xs={12} key={post.id}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          cursor: "pointer",
                          "&:hover": { boxShadow: 6 },
                        }}
                        onClick={() => handleViewPost(post.id)}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <Avatar
                              src={post.avatar_url}
                              sx={{ bgcolor: "#1877f2" }}
                            >
                              {post.username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ ml: 2 }}>
                              <Typography fontWeight="bold">
                                {post.username}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {new Date(post.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>

                          <Typography variant="body1" sx={{ mb: 2 }}>
                            {post.content?.length > 200
                              ? `${post.content.substring(0, 200)}...`
                              : post.content}
                          </Typography>

                          {post.image_url && (
                            <Box
                              component="img"
                              src={post.image_url}
                              alt="Post content"
                              sx={{
                                width: "100%",
                                maxHeight: 400,
                                objectFit: "cover",
                                borderRadius: 2,
                                mb: 2,
                              }}
                            />
                          )}

                          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                            <Chip
                              icon={<FavoriteBorderIcon />}
                              label={`${post.total_likes || 0} likes`}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              icon={<ChatBubbleOutlineIcon />}
                              label={`${post.comment_count || 0} comments`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    No posts found matching "{searchQuery}"
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default SearchResults;
