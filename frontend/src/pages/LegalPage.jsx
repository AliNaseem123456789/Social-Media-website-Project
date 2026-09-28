import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import Logo from "../components/ui/Logo";
import { tokens } from "../theme/tokens";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const CONTENT = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "Your account details (name, email), the profile information you choose to add, the posts, comments and messages you create, and basic technical data such as the device and IP address used to sign in."],
      ["How we use it", "To run Circle: showing your posts to your friends, delivering messages and notifications, keeping your account secure, and improving how the feed ranks posts."],
      ["Your controls", "You can edit your profile at any time, sign out devices from Settings, and permanently delete your account and its content."],
      ["Security", "Passwords are hashed, sessions can be revoked individually, and sign-in activity is logged to help detect misuse."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["Your account", "Keep your sign-in details private and let us know if you think your account has been compromised."],
      ["Your content", "You own what you post. By posting, you let Circle display it to the audience you share it with."],
      ["Acceptable use", "No harassment, spam, impersonation or illegal content. We may remove content or suspend accounts that break these rules."],
      ["Changes", "We may update these terms. Continuing to use Circle after changes means you accept them."],
    ],
  },
  guidelines: {
    title: "Community Guidelines",
    sections: [
      ["Be kind", "Disagree with ideas, not people. Personal attacks and harassment aren't welcome."],
      ["Be real", "Use your real identity and don't mislead others about who you are."],
      ["Respect privacy", "Don't share other people's private information without their consent."],
    ],
  },
};

export default function LegalPage({ type }) {
  const page = CONTENT[type];
  useDocumentTitle(page.title);
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: tokens.paper, px: 2.5, py: 5 }}>
      <Box sx={{ maxWidth: 720, mx: "auto" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 6 }}>
          <Logo size={20} />
          <Button component={RouterLink} to="/" startIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
        </Stack>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: "2.2rem", sm: "3rem" } }}>
          {page.title}
        </Typography>
        <Typography variant="overline" color="text.disabled" sx={{ display: "block", mt: 1, mb: 5 }}>
          Last updated {new Date().getFullYear()}
        </Typography>
        <Stack spacing={4}>
          {page.sections.map(([heading, text]) => (
            <Box key={heading}>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {heading}
              </Typography>
              <Typography color="text.secondary">{text}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
