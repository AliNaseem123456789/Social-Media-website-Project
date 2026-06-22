// components/ProfileStats.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Typography,
  Divider,
  Box,
  Skeleton
} from "@mui/material";
import PostAddIcon from '@mui/icons-material/PostAdd';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import PeopleIcon from '@mui/icons-material/People';
import { analyticsService } from '../services/analyticsService';

const ProfileStats = ({ userId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (userId) {
          // Fetch specific user's analytics
          response = await analyticsService.getUserAnalytics(userId);
        } else {
          // Fetch current user's analytics
          response = await analyticsService.getMyAnalytics();
        }

        if (response && response.success && response.stats) {
          setStats(response.stats);
        } else {
          setStats({
            totalPosts: 0,
            totalLikesReceived: 0,
            totalCommentsReceived: 0,
            totalFriends: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setError(error.message || 'Failed to load stats');
        setStats({
          totalPosts: 0,
          totalLikesReceived: 0,
          totalCommentsReceived: 0,
          totalFriends: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId]);

  // Format numbers (e.g., 1240 -> 1.2k)
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num;
  };

  // Stats configuration
  const statItems = [
    {
      label: 'Posts',
      value: stats?.totalPosts || 0,
      icon: <PostAddIcon sx={{ fontSize: 20 }} />,
      color: '#1877f2'
    },
    {
      label: 'Likes',
      value: stats?.totalLikesReceived || 0,
      icon: <FavoriteIcon sx={{ fontSize: 20 }} />,
      color: '#ff4757'
    },
    {
      label: 'Comments',
      value: stats?.totalCommentsReceived || 0,
      icon: <CommentIcon sx={{ fontSize: 20 }} />,
      color: '#2ecc71'
    },
    {
      label: 'Friends',
      value: stats?.totalFriends || 0,
      icon: <PeopleIcon sx={{ fontSize: 20 }} />,
      color: '#f39c12'
    }
  ];

  // Loading state
  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 6,
          boxShadow: "0 10px 40px rgba(0,0,0,0.03)"
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-evenly"
          divider={<Divider orientation="vertical" flexItem />}
        >
          {[1, 2, 3, 4].map((_, index) => (
            <Box key={index} sx={{ textAlign: "center", minWidth: 60 }}>
              <Skeleton variant="text" width={50} height={32} />
              <Skeleton variant="text" width={60} height={20} />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 6,
          boxShadow: "0 10px 40px rgba(0,0,0,0.03)"
        }}
      >
        <Typography variant="body2" color="error" align="center">
          Failed to load stats
        </Typography>
      </Paper>
    );
  }

  // If no stats, show empty state
  if (!stats) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 6,
          boxShadow: "0 10px 40px rgba(0,0,0,0.03)"
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          No stats available yet
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 6,
        boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: "0 15px 50px rgba(0,0,0,0.06)"
        }
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-evenly"
        alignItems="center"
        divider={<Divider orientation="vertical" flexItem />}
      >
        {statItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              textAlign: "center",
              cursor: 'default',
              px: 1
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                opacity: 0.7
              }}>
                {item.icon}
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatNumber(item.value)}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default ProfileStats;