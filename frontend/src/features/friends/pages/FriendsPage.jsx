import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Container,
  Grid,
  InputBase,
  Button,
  IconButton,
  Stack,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  GlobalStyles,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import { useNavigate } from "react-router-dom";
import { friendService } from "../services/friendsService";
import { useAuth } from "../../auth/context/AuthContext";
import Sidebar from "../../../components/Sidebar";

/* ---------------------------------------------------------------------
   Circle brand tokens — identical to landing.css so the logged-in app
   doesn't shift identity: paper/ink base, ember as the one loud accent,
   signal green reserved for presence indicators only.
   ------------------------------------------------------------------ */
const T = {
  paper: "#faf8f4",
  surface: "#ffffff",
  ink: "#16140f",
  inkSoft: "#58534a",
  inkFaint: "#948d80",
  line: "#e7e1d5",
  ember: "#e0431f",
  emberInk: "#7c2410",
  emberTint: "#fce6dd",
  signal: "#1c7a54",
  signalTint: "#dcf1e6",
  fontDisplay: `"Fraunces", "Iowan Old Style", serif`,
  fontBody: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
  fontMono: `"IBM Plex Mono", ui-monospace, monospace`,
};

const AVATAR_COLORS = [T.ember, T.signal, "#4a463f", "#c93a19"];
const colorFor = (str = "") =>
  AVATAR_COLORS[[...str].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const LAYOUT_KEY = "circle:friends-layout";

// Width of the app's fixed, right-hand nav Sidebar (components/Sidebar.jsx,
// SidebarWrapper). It's fixed and right:0 on md+, so content needs a
// right-side reservation — NOT a left margin — to avoid running under it.
const SIDEBAR_WIDTH = 250;

/* ---------------------------------------------------------------------
   Small shared bits
   ------------------------------------------------------------------ */

function PresenceDot({ size = 12, border = 2.5 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: T.signal,
        border: `${border}px solid ${T.surface}`,
        flexShrink: 0,
      }}
    />
  );
}

function LayoutToggle({ value, onChange }) {
  const opts = [
    { key: "cards", icon: GridViewRoundedIcon, label: "Card view" },
    { key: "table", icon: ViewListRoundedIcon, label: "Table view" },
  ];
  return (
    <Stack
      direction="row"
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: "999px",
        p: "4px",
        gap: "2px",
        flexShrink: 0,
      }}
    >
      {opts.map((opt) => {
        const active = value === opt.key;
        const Icon = opt.icon;
        return (
          <IconButton
            key={opt.key}
            aria-label={opt.label}
            onClick={() => onChange(opt.key)}
            size="small"
            sx={{
              borderRadius: "999px",
              width: 36,
              height: 36,
              color: active ? T.emberInk : T.inkFaint,
              bgcolor: active ? T.emberTint : "transparent",
              transition: "background 0.15s ease, color 0.15s ease",
              "&:hover": { bgcolor: active ? T.emberTint : T.paper },
            }}
          >
            <Icon sx={{ fontSize: 19 }} />
          </IconButton>
        );
      })}
    </Stack>
  );
}

/* ---------------------------------------------------------------------
   Skeletons
   ------------------------------------------------------------------ */

function CardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "20px",
        border: `1px solid ${T.line}`,
        bgcolor: T.surface,
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" height={56} />
      <Box sx={{ px: 2.5, pb: 2.5, mt: "-28px", textAlign: "center" }}>
        <Skeleton variant="circular" width={72} height={72} sx={{ mx: "auto", border: `4px solid ${T.surface}` }} />
        <Skeleton width="55%" height={22} sx={{ mx: "auto", mt: 1.5, borderRadius: 1 }} />
        <Skeleton width="35%" height={14} sx={{ mx: "auto", mt: 0.5, mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rounded" height={38} sx={{ borderRadius: "999px" }} />
      </Box>
    </Paper>
  );
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from(new Array(6)).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 1.75,
            borderBottom: `1px solid ${T.line}`,
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton width={160} height={18} sx={{ borderRadius: 1 }} />
          <Skeleton width={120} height={14} sx={{ borderRadius: 1, ml: "auto", mr: 4 }} />
          <Skeleton width={70} height={14} sx={{ borderRadius: 1, mr: 4 }} />
          <Skeleton width={70} height={30} sx={{ borderRadius: "999px" }} />
        </Box>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------
   Main page
   ------------------------------------------------------------------ */

function FriendsPage() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(() => {
    if (typeof window === "undefined") return "cards";
    return window.localStorage?.getItem(LAYOUT_KEY) || "cards";
  });

  // shared "..." menu state (works for both card and table rows)
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuFriend, setMenuFriend] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null); // friend pending removal confirmation
  const [removing, setRemoving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await friendService.getFriends();
        setFriends(data.friends || data || []);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUserId) fetchFriends();
  }, [currentUserId]);

  const changeLayout = (next) => {
    setLayout(next);
    window.localStorage?.setItem(LAYOUT_KEY, next);
  };

  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [friends, searchTerm]
  );

  const openMenu = (event, friend) => {
    setMenuAnchor(event.currentTarget);
    setMenuFriend(friend);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuFriend(null);
  };

  const askRemove = () => {
    setRemoveTarget(menuFriend);
    closeMenu();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      // Assumes friendService exposes a removeFriend method — wire this
      // up to whatever your API calls the endpoint (e.g. unfriend, removeFriend).
      if (friendService.removeFriend) {
        await friendService.removeFriend(removeTarget.id);
      }
      setFriends((prev) => prev.filter((f) => f.id !== removeTarget.id));
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  return (
    <Box sx={{ bgcolor: T.paper, minHeight: "100vh", pt: 12, pb: 8, fontFamily: T.fontBody }}>
      <GlobalStyles
        styles={{
          "@import":
            "url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap')",
          "@keyframes circle-pulse": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.35, transform: "scale(0.7)" },
          },
        }}
      />

      <Sidebar />

      {/* Reserve space for the FIXED, RIGHT-hand nav Sidebar on md+.
          Mobile ignores this since Sidebar becomes an off-canvas Drawer. */}
      <Box
        sx={{
          mr: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          transition: "margin 0.2s ease",
        }}
      >
        <Container maxWidth="lg">
          {/* ---------------- header ---------------- */}
          <Box
            sx={{
              mb: 5,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "flex-end" },
              gap: 2.5,
            }}
          >
            <Box>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  fontFamily: T.fontMono,
                  fontSize: 12.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.emberInk,
                  bgcolor: T.emberTint,
                  px: 1.5,
                  py: 0.6,
                  borderRadius: "999px",
                  mb: 2,
                }}
              >
                <Box
                  component="span"
                  sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: T.signal, animation: "circle-pulse 1.8s infinite" }}
                />
                Your circle
              </Box>
              <Typography
                sx={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 600,
                  fontSize: { xs: 34, md: 44 },
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: T.ink,
                }}
              >
                Friends
              </Typography>
              <Typography
                sx={{
                  fontFamily: T.fontMono,
                  fontSize: 13,
                  color: T.inkFaint,
                  mt: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {loading
                  ? "Loading your connections…"
                  : `${friends.length} connection${friends.length === 1 ? "" : "s"} in your circle`}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ width: { xs: "100%", md: "auto" }, flexShrink: 0 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: T.surface,
                  borderRadius: "999px",
                  border: `1px solid ${T.line}`,
                  px: 2.25,
                  py: 1.1,
                  width: { xs: "100%", md: "280px" },
                  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                  "&:focus-within": {
                    borderColor: T.ink,
                    boxShadow: `0 0 0 3px ${T.emberTint}`,
                  },
                }}
              >
                <SearchRoundedIcon sx={{ color: T.inkFaint, mr: 1.25, fontSize: 19 }} />
                <InputBase
                  placeholder="Search friends"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ fontSize: "14.5px", fontFamily: T.fontBody, color: T.ink }}
                />
              </Box>

              <LayoutToggle value={layout} onChange={changeLayout} />
            </Stack>
          </Box>

          {/* ---------------- content ---------------- */}
          {loading ? (
            layout === "cards" ? (
              <Grid container spacing={2.5}>
                {Array.from(new Array(8)).map((_, i) => (
                  <Grid item xs={12} sm={6} lg={4} key={i}>
                    <CardSkeleton />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper elevation={0} sx={{ borderRadius: "18px", border: `1px solid ${T.line}`, overflow: "hidden" }}>
                <TableSkeletonRows />
              </Paper>
            )
          ) : filteredFriends.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 5, md: 9 },
                textAlign: "center",
                borderRadius: "24px",
                bgcolor: T.surface,
                border: `1px solid ${T.line}`,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "18px",
                  bgcolor: T.emberTint,
                  color: T.emberInk,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2.5,
                }}
              >
                <PeopleOutlineRoundedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 22, color: T.ink, mb: 1 }}>
                {friends.length === 0 ? "No friends yet" : `No matches for "${searchTerm}"`}
              </Typography>
              <Typography sx={{ fontSize: 14.5, color: T.inkSoft, maxWidth: 360, mx: "auto" }}>
                {friends.length === 0
                  ? "Search for people and send a request to start building your circle."
                  : "Try a different name, or clear the search."}
              </Typography>
              {friends.length === 0 && (
                <Button
                  disableElevation
                  onClick={() => navigate("/home")}
                  sx={{
                    mt: 3.5,
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 14.5,
                    px: 3,
                    py: 1.2,
                    bgcolor: T.ember,
                    color: "#fff8f4",
                    "&:hover": { bgcolor: "#c93a19" },
                  }}
                >
                  Find people
                </Button>
              )}
            </Paper>
          ) : layout === "cards" ? (
            <Grid container spacing={2.5}>
              {filteredFriends.map((friend) => {
                const initial = friend.username?.charAt(0)?.toUpperCase() || "?";
                const tint = colorFor(friend.username);
                return (
                  <Grid item xs={12} sm={6} lg={4} key={friend.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        position: "relative",
                        borderRadius: "20px",
                        border: `1px solid ${T.line}`,
                        bgcolor: T.surface,
                        overflow: "hidden",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          borderColor: T.ink,
                          boxShadow: "0 18px 36px -22px rgba(22,20,15,0.32)",
                        },
                      }}
                    >
                      {/* top tint band */}
                      <Box sx={{ height: 56, background: `linear-gradient(135deg, ${T.emberTint}, ${T.signalTint})` }} />

                      {/* overflow menu, pinned top-right so it never disturbs the centered layout */}
                      <IconButton
                        onClick={(e) => openMenu(e, friend)}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(255,255,255,0.85)",
                          color: T.inkFaint,
                          "&:hover": { bgcolor: T.surface, color: T.ink },
                        }}
                      >
                        <MoreVertRoundedIcon fontSize="small" />
                      </IconButton>

                      <Box sx={{ px: 2.5, pb: 2.5, mt: "-28px", textAlign: "center" }}>
                        <Box sx={{ position: "relative", display: "inline-block" }}>
                          <Avatar
                            src={friend.profile_image}
                            onClick={() => navigate(`/profile/${friend.id}`)}
                            sx={{
                              width: 72,
                              height: 72,
                              bgcolor: tint,
                              fontFamily: T.fontDisplay,
                              fontSize: "1.5rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: `4px solid ${T.surface}`,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          >
                            {initial}
                          </Avatar>
                          <Box sx={{ position: "absolute", bottom: 4, right: 4 }}>
                            <PresenceDot />
                          </Box>
                        </Box>

                        <Typography
                          component="button"
                          onClick={() => navigate(`/profile/${friend.id}`)}
                          sx={{
                            display: "block",
                            width: "100%",
                            mt: 1.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: T.fontDisplay,
                            fontWeight: 600,
                            fontSize: 17,
                            color: T.ink,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            p: 0,
                            textAlign: "center",
                            "&:hover": { color: T.emberInk },
                          }}
                        >
                          {friend.username}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: T.fontMono,
                            fontSize: 11,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: T.inkFaint,
                            mt: 0.25,
                            mb: 2,
                          }}
                        >
                          {friend.country || "Circle member"}
                        </Typography>

                        <Button
                          fullWidth
                          onClick={() => navigate(`/chat/${friend.id}`)}
                          startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: "17px !important" }} />}
                          sx={{
                            borderRadius: "999px",
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: 13.5,
                            py: 0.9,
                            color: T.emberInk,
                            bgcolor: T.emberTint,
                            "&:hover": { bgcolor: "#f6d4c4" },
                          }}
                        >
                          Message
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            /* ---------------- table layout ---------------- */
            <Paper elevation={0} sx={{ borderRadius: "18px", border: `1px solid ${T.line}`, overflow: "hidden" }}>
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  px: 3,
                  py: 1.75,
                  borderBottom: `1px solid ${T.line}`,
                  bgcolor: T.paper,
                }}
              >
                <Box sx={{ flex: "1 1 260px", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkFaint }}>
                  Name
                </Box>
                <Box sx={{ flex: "1 1 180px", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkFaint }}>
                  Location
                </Box>
                <Box sx={{ flex: "0 0 120px", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkFaint }}>
                  Status
                </Box>
                <Box sx={{ flex: "0 0 140px", textAlign: "right", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkFaint }}>
                  Actions
                </Box>
              </Box>

              {filteredFriends.map((friend, idx) => {
                const initial = friend.username?.charAt(0)?.toUpperCase() || "?";
                const tint = colorFor(friend.username);
                return (
                  <Box
                    key={friend.id}
                    sx={{
                      display: "flex",
                      flexWrap: { xs: "wrap", md: "nowrap" },
                      alignItems: "center",
                      px: 3,
                      py: 1.75,
                      gap: { xs: 1.5, md: 0 },
                      borderBottom: idx === filteredFriends.length - 1 ? "none" : `1px solid ${T.line}`,
                      transition: "background 0.15s ease",
                      "&:hover": { bgcolor: T.paper },
                    }}
                  >
                    <Box sx={{ flex: "1 1 260px", display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <Box sx={{ position: "relative", flexShrink: 0 }}>
                        <Avatar
                          src={friend.profile_image}
                          sx={{ width: 40, height: 40, bgcolor: tint, fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 14 }}
                        >
                          {initial}
                        </Avatar>
                        <Box sx={{ position: "absolute", bottom: -1, right: -1 }}>
                          <PresenceDot size={10} border={2} />
                        </Box>
                      </Box>
                      <Typography
                        component="button"
                        onClick={() => navigate(`/profile/${friend.id}`)}
                        sx={{
                          fontFamily: T.fontDisplay,
                          fontWeight: 600,
                          fontSize: 15,
                          color: T.ink,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          p: 0,
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          "&:hover": { color: T.emberInk },
                        }}
                      >
                        {friend.username}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: "1 1 180px", fontSize: 13.5, color: T.inkSoft }}>
                      {friend.country || "Circle member"}
                    </Box>

                    <Box sx={{ flex: "0 0 120px", display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: T.signal }} />
                      <Typography sx={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.inkSoft, textTransform: "uppercase" }}>
                        Online
                      </Typography>
                    </Box>

                    <Box sx={{ flex: "0 0 140px", display: "flex", justifyContent: "flex-end", gap: 0.75 }}>
                      <IconButton
                        onClick={() => navigate(`/chat/${friend.id}`)}
                        size="small"
                        sx={{
                          bgcolor: T.emberTint,
                          color: T.emberInk,
                          borderRadius: "999px",
                          "&:hover": { bgcolor: "#f6d4c4" },
                        }}
                      >
                        <ChatBubbleOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={(e) => openMenu(e, friend)}
                        size="small"
                        sx={{ color: T.inkFaint, borderRadius: "999px", "&:hover": { bgcolor: T.paper, color: T.ink } }}
                      >
                        <MoreVertRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          )}
        </Container>
      </Box>

      {/* ---------------- shared "..." action menu ---------------- */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            borderRadius: "14px",
            border: `1px solid ${T.line}`,
            boxShadow: "0 20px 40px -20px rgba(22,20,15,0.25)",
            minWidth: 190,
            mt: 0.5,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            navigate(`/profile/${menuFriend?.id}`);
            closeMenu();
          }}
          sx={{ fontSize: 14, py: 1.1, gap: 0.5 }}
        >
          <ListItemIcon sx={{ color: T.inkSoft, minWidth: 32 }}>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/chat/${menuFriend?.id}`);
            closeMenu();
          }}
          sx={{ fontSize: 14, py: 1.1, gap: 0.5 }}
        >
          <ListItemIcon sx={{ color: T.inkSoft, minWidth: 32 }}>
            <ChatBubbleOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Message</ListItemText>
        </MenuItem>
        <MenuItem onClick={askRemove} sx={{ fontSize: 14, py: 1.1, gap: 0.5, color: T.emberInk }}>
          <ListItemIcon sx={{ color: T.emberInk, minWidth: 32 }}>
            <PersonRemoveRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove friend</ListItemText>
        </MenuItem>
      </Menu>

      {/* ---------------- remove confirmation ---------------- */}
      <Dialog
        open={Boolean(removeTarget)}
        onClose={() => (!removing ? setRemoveTarget(null) : null)}
        PaperProps={{ sx: { borderRadius: "20px", p: 1, maxWidth: 380 } }}
      >
        <DialogTitle sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 20, color: T.ink }}>
          Remove {removeTarget?.username}?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14.5, color: T.inkSoft }}>
            They'll be removed from your circle. You can always send a new friend request later.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setRemoveTarget(null)}
            disabled={removing}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "999px",
              color: T.ink,
              border: `1px solid ${T.line}`,
              px: 2.5,
              "&:hover": { borderColor: T.ink, bgcolor: "transparent" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmRemove}
            disabled={removing}
            disableElevation
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "999px",
              px: 2.5,
              bgcolor: T.ember,
              color: "#fff8f4",
              "&:hover": { bgcolor: "#c93a19" },
            }}
          >
            {removing ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FriendsPage;