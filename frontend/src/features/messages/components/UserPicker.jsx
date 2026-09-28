import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { Plus, Search } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { useDebounce } from "../../../hooks/useDebounce";
import { queryKeys } from "../../../lib/queryClient";
import { tokens } from "../../../theme/tokens";
import { searchService } from "../../search/services/searchService";

export default function UserPicker({ selected, onChange, excludeIds = [], max = 49, placeholder = "Search people by username" }) {
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term.trim(), 350);
  const enabled = debounced.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debounced, "users"),
    queryFn: () => searchService.search(debounced, "users", 15),
    enabled,
    placeholderData: (previous) => previous,
  });

  const taken = new Set([...excludeIds, ...selected.map((person) => person.id)]);
  const results = (data?.users ?? []).filter((person) => !taken.has(person.id));
  const full = selected.length >= max;

  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: isFetching ? <CircularProgress size={15} thickness={5} sx={{ color: tokens.inkFaint }} /> : undefined,
          },
          htmlInput: { "aria-label": "Search people" },
        }}
      />

      {selected.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
          {selected.map((person) => (
            <Chip
              key={person.id}
              label={person.username}
              onDelete={() => onChange(selected.filter((other) => other.id !== person.id))}
              avatar={<UserAvatar user={person} size={22} />}
              variant="outlined"
              size="small"
            />
          ))}
        </Stack>
      )}

      <Box
        sx={{
          maxHeight: 240,
          overflowY: "auto",
          border: `1px solid ${tokens.line}`,
          borderRadius: `${tokens.radius.sm}px`,
          bgcolor: tokens.paper,
        }}
      >
        {!enabled && (
          <Typography variant="body2" sx={{ p: 2, textAlign: "center", color: tokens.inkFaint }}>
            Type at least 2 characters to find people.
          </Typography>
        )}
        {enabled && !isFetching && results.length === 0 && (
          <Typography variant="body2" sx={{ p: 2, textAlign: "center", color: tokens.inkFaint }}>
            No one else matches "{debounced}".
          </Typography>
        )}
        {enabled &&
          results.map((person) => (
            <Box
              key={person.id}
              component="button"
              type="button"
              disabled={full}
              onClick={() => onChange([...selected, person])}
              sx={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                gap: 1.25,
                px: 1.5,
                py: 1,
                border: 0,
                bgcolor: "transparent",
                textAlign: "left",
                cursor: "pointer",
                color: tokens.ink,
                fontFamily: "inherit",
                transition: "background-color .15s",
                "&:hover": { bgcolor: tokens.wash.ink },
                "&:focus-visible": { bgcolor: tokens.wash.ink, outline: `2px solid ${tokens.ember}`, outlineOffset: -2 },
                "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
              }}
            >
              <UserAvatar user={person} size={34} />
              <Typography noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                {person.username}
              </Typography>
              <Plus size={16} />
            </Box>
          ))}
      </Box>

      <Typography variant="caption">
        {selected.length} selected{full ? ` (limit of ${max} reached)` : ""}
      </Typography>
    </Stack>
  );
}
