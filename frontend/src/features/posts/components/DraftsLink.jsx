import { Link as RouterLink } from "react-router-dom";
import { Button } from "@mui/material";
import { FileText } from "lucide-react";
import { useDrafts } from "../hooks";

export default function DraftsLink({ enabled = true, sx }) {
  const { data: drafts = [] } = useDrafts({ enabled });
  if (!drafts.length) return null;

  return (
    <Button
      size="small"
      variant="text"
      component={RouterLink}
      to="/drafts"
      startIcon={<FileText size={14} />}
      sx={{ alignSelf: "flex-start", ml: -1, ...sx }}
    >
      {drafts.length === 1 ? "1 draft waiting" : `${drafts.length} drafts waiting`}
    </Button>
  );
}
