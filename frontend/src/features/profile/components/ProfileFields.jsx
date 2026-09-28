import { Autocomplete, Box, Chip, Grid, MenuItem, TextField } from "@mui/material";
import { COUNTRIES, getFlagEmoji } from "../data/countriesData";
import { HOBBIES } from "../data/hobbiesData";

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export function profileToForm(profile) {
  return {
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    gender: profile?.gender ?? "",
    age: profile?.age ? String(profile.age) : "",
    country: profile?.country ?? "",
    education: profile?.education ?? "",
    hobbies: profile?.hobbies ?? [],
  };
}

export function validateProfile(form) {
  const errors = {};
  if (form.username !== undefined && form.username.trim().length < 3) errors.username = "At least 3 characters";
  if (form.bio.length > 500) errors.bio = "Keep it under 500 characters";
  if (form.age !== "") {
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 13 || age > 120) errors.age = "Enter an age between 13 and 120";
  }
  return errors;
}

export default function ProfileFields({ form, onChange, errors = {}, sections = ["identity", "about", "interests"] }) {
  const set = (field) => (event) => onChange({ ...form, [field]: event.target.value });
  const country = COUNTRIES.find((c) => c.name === form.country) || null;

  return (
    <Grid container spacing={2}>
      {sections.includes("identity") && (
        <>
          <Grid size={12}>
            <TextField label="Display name" value={form.username} onChange={set("username")} error={Boolean(errors.username)} helperText={errors.username} slotProps={{ htmlInput: { maxLength: 30 } }} />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Bio"
              multiline
              minRows={3}
              value={form.bio}
              onChange={set("bio")}
              error={Boolean(errors.bio)}
              helperText={errors.bio || `${form.bio.length}/500`}
              placeholder="A line or two about you"
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Grid>
        </>
      )}

      {sections.includes("about") && (
        <>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select label="Gender" value={form.gender} onChange={set("gender")}>
              <MenuItem value="">
                <em>Not specified</em>
              </MenuItem>
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Age"
              value={form.age}
              onChange={(e) => onChange({ ...form, age: e.target.value.replace(/\D/g, "").slice(0, 3) })}
              error={Boolean(errors.age)}
              helperText={errors.age}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              options={COUNTRIES}
              value={country}
              onChange={(_, value) => onChange({ ...form, country: value?.name ?? "" })}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(a, b) => a.code === b.code}
              renderOption={({ key, ...props }, option) => (
                <Box component="li" key={key} {...props} sx={{ gap: 1 }}>
                  <span>{getFlagEmoji(option.code)}</span>
                  {option.name}
                </Box>
              )}
              renderInput={(params) => <TextField {...params} label="Country" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Education" value={form.education} onChange={set("education")} placeholder="School or degree" slotProps={{ htmlInput: { maxLength: 120 } }} />
          </Grid>
        </>
      )}

      {sections.includes("interests") && (
        <Grid size={12}>
          <Autocomplete
            multiple
            freeSolo
            options={HOBBIES.map((h) => h.label)}
            groupBy={(label) => HOBBIES.find((h) => h.label === label)?.category ?? "Other"}
            value={form.hobbies}
            onChange={(_, value) => onChange({ ...form, hobbies: [...new Set(value.map((v) => v.trim()).filter(Boolean))].slice(0, 20) })}
            renderValue={(value, getItemProps) =>
              value.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip key={key} label={option} size="small" {...itemProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Interests" placeholder={form.hobbies.length ? "" : "Type or pick a few"} helperText="Up to 20" />}
          />
        </Grid>
      )}
    </Grid>
  );
}
