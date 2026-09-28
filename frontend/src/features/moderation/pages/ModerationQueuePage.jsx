import { useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Chip,
  Link,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Eye, FileWarning, Inbox, ShieldAlert, Trash2, X } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import UserAvatar from "../../../components/ui/UserAvatar";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { fullDate, timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { reasonLabel, subjectNoun } from "../reasons";
import { useModeratorAccess, useReports, useResolveReport } from "../hooks";

const MAX_NOTE = 500;

const TABS = [
  { value: "open", label: "Open", emptyTitle: "Nothing waiting", emptyDescription: "New reports show up here as they come in." },
  { value: "reviewing", label: "Reviewing", emptyTitle: "Nothing in review", emptyDescription: "Reports you mark as reviewing stay here until you close them." },
  { value: "actioned", label: "Actioned", emptyTitle: "Nothing actioned yet", emptyDescription: "Reports you act on are kept here for the record." },
  { value: "dismissed", label: "Dismissed", emptyTitle: "Nothing dismissed yet", emptyDescription: "Reports you dismiss are kept here for the record." },
];

const STATUS_CHIP = {
  open: { label: "Open", bgcolor: tokens.emberTint, color: tokens.emberInk },
  reviewing: { label: "Reviewing", bgcolor: tokens.signalTint, color: tokens.ink },
  actioned: { label: "Actioned", bgcolor: tokens.surfaceMuted, color: tokens.inkSoft },
  dismissed: { label: "Dismissed", bgcolor: tokens.surfaceMuted, color: tokens.inkSoft },
};

function subjectLink(subject) {
  if (!subject) return null;
  if (subject.kind === "post") return { to: `/posts/${subject.id}`, label: "Open post" };
  if (subject.kind === "comment") return subject.postId ? { to: `/posts/${subject.postId}`, label: "Open the post" } : null;
  if (subject.kind === "message") {
    return subject.conversationId ? { to: `/messages/${subject.conversationId}`, label: "Open conversation" } : null;
  }
  return { to: `/u/${subject.id}`, label: "Open profile" };
}

function ReportedContent({ subject, subjectType }) {
  if (!subject) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mt: 1.5,
          px: 1.5,
          py: 1.25,
          alignItems: "center",
          borderRadius: `${tokens.radius.sm}px`,
          border: `1px dashed ${tokens.line}`,
          color: tokens.inkFaint,
        }}
      >
        <FileWarning size={16} />
        <Typography variant="body2" sx={{ color: "inherit" }}>
          This {subjectNoun(subjectType)} is no longer available.
        </Typography>
      </Stack>
    );
  }

  const link = subjectLink(subject);

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        borderRadius: `${tokens.radius.sm}px`,
        border: `1px solid ${tokens.line}`,
        bgcolor: tokens.paper,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
        <UserAvatar user={subject.author} size={24} />
        <Link
          component={RouterLink}
          to={`/u/${subject.author?.id}`}
          underline="hover"
          noWrap
          sx={{ color: tokens.ink, fontWeight: 650, fontSize: "0.85rem" }}
        >
          {subject.author?.username ?? "Unknown account"}
        </Link>
        {subject.createdAt && (
          <Tooltip title={fullDate(subject.createdAt)}>
            <Typography variant="caption" sx={{ flexShrink: 0 }}>
              {timeAgo(subject.createdAt)}
            </Typography>
          </Tooltip>
        )}
      </Stack>

      {subject.text && (
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            color: tokens.ink,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {subject.text}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mt: 1.25, alignItems: "flex-end", flexWrap: "wrap", gap: 1 }}>
        {subject.imageUrl && (
          <Box
            component="img"
            src={subject.imageUrl}
            alt=""
            loading="lazy"
            sx={{
              width: 76,
              height: 76,
              objectFit: "cover",
              borderRadius: 2,
              border: `1px solid ${tokens.lineSoft}`,
            }}
          />
        )}
        {!subject.text && !subject.imageUrl && (
          <Typography variant="caption" sx={{ fontStyle: "italic" }}>
            No text on this {subjectNoun(subjectType)}.
          </Typography>
        )}
        {link && (
          <Button size="small" variant="text" component={RouterLink} to={link.to} sx={{ ml: "auto", px: 1 }}>
            {link.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function ReportRow({ report }) {
  const [note, setNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const resolve = useResolveReport();

  const noun = subjectNoun(report.subjectType);
  const status = STATUS_CHIP[report.status] ?? STATUS_CHIP.open;
  const pending = resolve.isPending;
  const decided = report.status === "actioned" || report.status === "dismissed";
  const removable = Boolean(report.subject) && report.subject.kind !== "user";

  const send = (nextStatus, removeContent = false) =>
    resolve.mutate(
      { reportId: report.id, status: nextStatus, resolution: note.trim() || undefined, removeContent },
      {
        onSuccess: () => {
          setConfirmRemove(false);
          setNote("");
        },
      },
    );

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Chip
          size="small"
          label={reasonLabel(report.reason)}
          sx={{ bgcolor: tokens.emberTint, color: tokens.emberInk, fontWeight: 600 }}
        />
        <Chip size="small" label={status.label} sx={{ bgcolor: status.bgcolor, color: status.color }} />
        <Typography variant="caption" sx={{ ml: "auto" }}>
          <Tooltip title={fullDate(report.createdAt)}>
            <span>{timeAgo(report.createdAt)}</span>
          </Tooltip>
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", minWidth: 0 }}>
        <UserAvatar user={report.reporter} size={26} />
        <Typography variant="body2" sx={{ color: tokens.inkSoft, minWidth: 0 }} noWrap>
          <Link
            component={RouterLink}
            to={`/u/${report.reporter?.id}`}
            underline="hover"
            sx={{ color: tokens.ink, fontWeight: 650 }}
          >
            {report.reporter?.username ?? "Unknown account"}
          </Link>{" "}
          reported this {noun}
        </Typography>
      </Stack>

      {report.details && (
        <Box sx={{ mt: 1.25, pl: 1.5, borderLeft: `2px solid ${tokens.line}` }}>
          <Typography variant="caption" component="p" sx={{ mb: 0.25 }}>
            What they told us
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {report.details}
          </Typography>
        </Box>
      )}

      <ReportedContent subject={report.subject} subjectType={report.subjectType} />

      {decided && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" component="p">
            {report.reviewedBy ? `Closed by moderator #${report.reviewedBy}` : "Closed"}
            {report.reviewedAt ? ` · ${timeAgo(report.reviewedAt)}` : ""}
          </Typography>
          {report.resolution && (
            <Typography variant="body2" sx={{ mt: 0.5, color: tokens.inkSoft }}>
              {report.resolution}
            </Typography>
          )}
        </Box>
      )}

      {!decided && (
        <Stack spacing={1.5} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.lineSoft}` }}>
          <TextField
            size="small"
            multiline
            minRows={2}
            maxRows={5}
            label="Note for the record (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE))}
            disabled={pending}
            slotProps={{ htmlInput: { maxLength: MAX_NOTE } }}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<X size={15} />}
              disabled={pending}
              onClick={() => send("dismissed")}
            >
              Dismiss
            </Button>
            {report.status !== "reviewing" && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={15} />}
                disabled={pending}
                onClick={() => send("reviewing")}
              >
                Mark reviewing
              </Button>
            )}
            {removable ? (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<Trash2 size={15} />}
                disabled={pending}
                onClick={() => setConfirmRemove(true)}
                sx={{ boxShadow: "none" }}
              >
                Remove content and action
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                disabled={pending}
                onClick={() => send("actioned")}
              >
                Mark actioned
              </Button>
            )}
          </Stack>
          {!removable && (
            <Typography variant="caption">
              {report.subject
                ? "An account can't be removed from here. Close the report and handle the account separately."
                : "The content is already gone, so there is nothing left to remove."}
            </Typography>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove this ${noun}?`}
        description={
          report.subjectType === "message"
            ? "The message is replaced with a note that it was deleted, and the report is closed as actioned."
            : `The ${noun} is deleted for everyone and can't be restored. The report is closed as actioned.`
        }
        confirmLabel="Remove and action"
        destructive
        loading={pending}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => send("actioned", true)}
      />
    </Card>
  );
}

function QueueSkeleton() {
  return (
    <Stack spacing={2}>
      {[0, 1].map((i) => (
        <Skeleton key={i} variant="rounded" height={260} sx={{ borderRadius: 5 }} />
      ))}
    </Stack>
  );
}

export default function ModerationQueuePage() {
  const [search, setSearch] = useSearchParams();
  const access = useModeratorAccess();
  const isModerator = access.data === true;

  const requested = search.get("status");
  const tab = TABS.find((t) => t.value === requested) ?? TABS[0];
  const reports = useReports(tab.value, { enabled: isModerator });

  useDocumentTitle("Moderation");

  if (access.isLoading) {
    return (
      <ContentLayout maxWidth={760}>
        <Skeleton variant="rounded" height={64} sx={{ mb: 3, borderRadius: 3 }} />
        <QueueSkeleton />
      </ContentLayout>
    );
  }

  if (!isModerator) {
    return (
      <ContentLayout maxWidth={620}>
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="This area is for moderators"
            description="Your account doesn't have access to the report queue. If you think it should, ask an admin to add you."
            action={
              <Button variant="outlined" component={RouterLink} to="/home">
                Go to feed
              </Button>
            }
          />
        </Card>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout maxWidth={760}>
      <PageHeader
        eyebrow="Moderation"
        title="Reports"
        subtitle="What people have reported, newest first. Take a look at the content before you decide."
        actions={
          reports.isSuccess ? (
            <Chip
              label={`${reports.openCount} ${reports.openCount === 1 ? "report" : "reports"} open`}
              sx={{ bgcolor: tokens.emberTint, color: tokens.emberInk, fontWeight: 600 }}
            />
          ) : null
        }
      />

      <Tabs
        value={tab.value}
        onChange={(_, value) => setSearch(value === "open" ? {} : { status: value }, { replace: true })}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Report status"
        sx={{ mb: 2, borderBottom: `1px solid ${tokens.line}` }}
      >
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      {reports.isLoading && <QueueSkeleton />}

      {!reports.isLoading && reports.isError && (
        <Card>
          <EmptyState
            compact
            icon={Inbox}
            title="Couldn't load the queue"
            description="Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => reports.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      )}

      {!reports.isLoading && !reports.isError && reports.items.length === 0 && (
        <Card>
          <EmptyState compact icon={Inbox} title={tab.emptyTitle} description={tab.emptyDescription} />
        </Card>
      )}

      <Stack spacing={2}>
        {reports.items.map((report) => (
          <ReportRow key={report.id} report={report} />
        ))}
      </Stack>

      {reports.items.length > 0 && (
        <InfiniteSentinel
          hasMore={Boolean(reports.hasNextPage)}
          loading={reports.isFetchingNextPage}
          onLoadMore={reports.fetchNextPage}
          endLabel=""
        />
      )}
    </ContentLayout>
  );
}
