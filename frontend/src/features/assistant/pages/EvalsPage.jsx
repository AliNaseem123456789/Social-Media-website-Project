import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AlertTriangle, Check, Play, ShieldAlert, X } from "lucide-react";
import ContentLayout from "../../../components/layout/ContentLayout";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useModeratorAccess } from "../../moderation/hooks";
import { assistantEnabled, assistantService } from "../services/assistantClient";
import { timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";

/**
 * How the assistant is doing, measured rather than asserted.
 *
 * Accuracy and safety are shown as two separate numbers on purpose. Accuracy is "did it pick the right
 * tool"; safety is "did it avoid the tools that would have been a real mistake". An assistant that is
 * 90% accurate and occasionally proposes an unasked-for post is worse than one that is 80% accurate and
 * never does, and a single blended score hides exactly that.
 *
 * Latency is p50 and p95, never the mean — the mean hides the tail, and the tail is what people notice.
 */

function Stat({ label, value, hint, tone }) {
  return (
    <Box sx={{ flex: "1 1 130px", minWidth: 130 }}>
      <Typography variant="caption" sx={{ color: tokens.inkFaint, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{ fontFamily: tokens.fontDisplay, lineHeight: 1.1, color: tone ?? tokens.ink, mt: 0.25 }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" sx={{ color: tokens.inkFaint }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function GroupBar({ name, stats }) {
  const share = stats.total ? stats.correct / stats.total : 0;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.5 }}>
      <Typography variant="body2" sx={{ width: 110, flexShrink: 0, color: tokens.inkSoft }}>
        {name}
      </Typography>
      <Box sx={{ flex: 1, height: 8, borderRadius: 999, bgcolor: tokens.surfaceMuted, overflow: "hidden" }}>
        <Box
          sx={{
            width: `${share * 100}%`,
            height: "100%",
            bgcolor: stats.violations ? tokens.danger : share === 1 ? tokens.signal : tokens.ember,
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ width: 52, textAlign: "right", color: tokens.inkFaint }}>
        {stats.correct}/{stats.total}
      </Typography>
    </Stack>
  );
}

function CaseRow({ result }) {
  const bad = !result.correct || result.violations.length || result.executed_writes.length;
  const took = result.called.concat(result.proposed);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ py: 0.85, alignItems: "flex-start", borderTop: `1px solid ${tokens.lineSoft}` }}
    >
      <Box sx={{ pt: 0.3, color: bad ? tokens.danger : tokens.signal, display: "flex" }}>
        {bad ? <X size={14} /> : <Check size={14} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
          {result.question}
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.inkFaint }}>
          {took.length ? took.join(" → ") : "answered without a tool"}
          {result.expected && !result.correct ? ` · expected ${result.expected}` : ""}
          {` · ${Math.round(result.ms)}ms`}
        </Typography>
        {result.violations.length ? (
          <Typography variant="caption" sx={{ display: "block", color: tokens.danger }}>
            called {result.violations.join(", ")}, which this case says it must not
          </Typography>
        ) : null}
        {result.executed_writes.length ? (
          <Typography variant="caption" sx={{ display: "block", color: tokens.danger, fontWeight: 600 }}>
            ran {result.executed_writes.join(", ")} without asking — a bug, not a score
          </Typography>
        ) : null}
        {bad && result.note ? (
          <Typography variant="caption" sx={{ display: "block", color: tokens.inkSoft, fontStyle: "italic" }}>
            {result.note}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

export default function EvalsPage() {
  const access = useModeratorAccess();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  useDocumentTitle("Assistant evals");

  const isModerator = access.data === true;
  const enabled = assistantEnabled && isModerator;

  const summaryOf = (q) => q.data?.summary;

  const latest = useQuery({
    queryKey: ["assistant", "evals", "latest"],
    queryFn: assistantService.evals.latest,
    enabled,
  });
  const history = useQuery({
    queryKey: ["assistant", "evals", "history"],
    queryFn: assistantService.evals.history,
    enabled,
  });

  const summary = summaryOf(latest);

  const run = useMutation({
    mutationFn: assistantService.evals.run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant", "evals"] }),
  });
  const onFake = summary?.provider === "fake";

  if (!assistantEnabled) {
    return (
      <ContentLayout maxWidth={620}>
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="No assistant service configured"
            description="Set VITE_ASSISTANT_URL and point it at the Python service to see eval runs here."
          />
        </Card>
      </ContentLayout>
    );
  }

  if (access.isLoading) {
    return (
      <ContentLayout maxWidth={760}>
        <Skeleton variant="rounded" height={64} sx={{ mb: 3, borderRadius: 3 }} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
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
            description="Eval runs are only visible to accounts with moderation access."
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

  const results = latest.data?.results ?? [];
  const failures = results.filter((r) => !r.correct || r.violations.length || r.executed_writes.length);
  const shown = showAll ? results : failures;
  const runs = history.data?.items ?? [];
  const previous = runs[1];

  const delta = summary && previous ? summary.accuracy - previous.accuracy : null;

  return (
    <ContentLayout maxWidth={760}>
      <PageHeader
        eyebrow="Assistant"
        title="Evals"
        subtitle="What the assistant does with a fixed set of questions: which tool it reaches for, how long it takes, and what it costs."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={run.isPending ? <CircularProgress size={14} color="inherit" /> : <Play size={15} />}
              onClick={() => run.mutate({})}
              disabled={run.isPending}
            >
              {run.isPending ? "Running" : onFake ? "Run now" : "Run a sample"}
            </Button>
            {/* Separate button, because against a real model this is most of a day's free-tier tokens
                and that should take a deliberate press rather than a stray one. */}
            {!onFake ? (
              <Button
                variant="outlined"
                onClick={() => run.mutate({ full: true })}
                disabled={run.isPending}
                sx={{ borderColor: tokens.line, color: tokens.inkSoft }}
              >
                All 56
              </Button>
            ) : null}
          </Stack>
        }
      />

      {run.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {run.error?.message ?? "The run failed."}
        </Alert>
      ) : null}

      {latest.isLoading ? <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} /> : null}

      {!latest.isLoading && !summary ? (
        <Card>
          <EmptyState
            compact
            icon={Play}
            title="No runs yet"
            description="Run the set to see how the assistant is doing. With the fake provider it costs nothing."
          />
        </Card>
      ) : null}

      {summary ? (
        <>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Chip size="small" label={summary.model} sx={{ bgcolor: tokens.surfaceMuted, color: tokens.inkSoft }} />
              {summary.sampled ? (
                <Tooltip title="A spread across groups, keeping every 'careful' case. Not comparable with a full run.">
                  <Chip size="small" variant="outlined" label="sample" sx={{ borderColor: tokens.line, color: tokens.inkSoft }} />
                </Tooltip>
              ) : null}
              <Typography variant="caption" sx={{ color: tokens.inkFaint }}>
                {timeAgo(summary.at)} · {summary.cases} cases
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
              <Stat
                label="Accuracy"
                value={`${Math.round(summary.accuracy * 100)}%`}
                hint={
                  delta === null
                    ? "reached for the right tool"
                    : `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} pts since last run`
                }
                tone={summary.accuracy === 1 ? tokens.signal : undefined}
              />
              <Stat
                label="Safety"
                value={`${Math.round(summary.safety * 100)}%`}
                hint={summary.violations ? `${summary.violations} avoidable` : "avoided every wrong tool"}
                tone={summary.violations ? tokens.danger : tokens.signal}
              />
              <Stat label="p50" value={`${Math.round(summary.p50_ms)}ms`} hint="typical" />
              <Stat label="p95" value={`${Math.round(summary.p95_ms)}ms`} hint="slowest 1 in 20" />
              <Stat label="Tokens" value={summary.total_tokens.toLocaleString()} hint="for the whole run" />
            </Stack>

            {summary.unconfirmed_writes ? (
              <Alert severity="error" icon={<AlertTriangle size={18} />} sx={{ mt: 2 }}>
                {summary.unconfirmed_writes} write ran without confirmation. That is a bug in the agent loop, not a
                score — nothing should post, send or follow before someone presses the button.
              </Alert>
            ) : null}

            {summary.provider === "fake" ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                This run used the offline stand-in, which is a small rules table written alongside these cases. Read it
                as a regression net rather than a measure of quality — the number worth quoting is the one a real model
                gets.
              </Alert>
            ) : null}
          </Card>

          <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              By group
            </Typography>
            {Object.entries(summary.groups).map(([name, stats]) => (
              <GroupBar key={name} name={name} stats={stats} />
            ))}
            <Typography variant="caption" sx={{ color: tokens.inkFaint, display: "block", mt: 1 }}>
              &ldquo;Careful&rdquo; is the group that matters: questions where the right answer is to not act —
              ambiguity, other people&rsquo;s private data, and instructions hidden inside content.
            </Typography>
          </Card>

          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="subtitle2">
                {showAll ? "Every case" : failures.length ? `${failures.length} to look at` : "Nothing failed"}
              </Typography>
              <Button size="small" variant="text" onClick={() => setShowAll((v) => !v)} sx={{ color: tokens.inkSoft }}>
                {showAll ? "Only failures" : "Show all"}
              </Button>
            </Stack>

            {shown.length ? (
              shown.map((result) => <CaseRow key={result.id} result={result} />)
            ) : (
              <Typography variant="body2" sx={{ color: tokens.inkFaint, py: 1 }}>
                Every case picked an acceptable tool and avoided the ones it should.
              </Typography>
            )}
          </Card>

          {runs.length > 1 ? (
            <Card sx={{ p: { xs: 2, sm: 2.5 }, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                History
              </Typography>
              <Stack divider={<Divider flexItem />}>
                {runs.map((item) => (
                  <Stack
                    key={item.run}
                    direction="row"
                    spacing={1}
                    sx={{ py: 0.75, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Tooltip title={item.at}>
                      <Typography variant="caption" sx={{ width: 96, color: tokens.inkFaint }}>
                        {timeAgo(item.at)}
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2" sx={{ width: 64 }}>
                      {Math.round(item.accuracy * 100)}%
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ width: 90, color: item.violations ? tokens.danger : tokens.inkSoft }}
                    >
                      {item.violations ? `${item.violations} unsafe` : "safe"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.inkFaint }}>
                      p95 {Math.round(item.p95_ms)}ms · {item.total_tokens.toLocaleString()} tokens · {item.model}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          ) : null}
        </>
      ) : null}
    </ContentLayout>
  );
}
