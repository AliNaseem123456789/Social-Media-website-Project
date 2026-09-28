import { Fragment, memo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@mui/material";

const PATTERN = /(https?:\/\/\S+|@[\p{L}\p{N}_.]{3,30}|#[\p{L}\p{N}_]{1,50})/gu;

const trimTrailing = (value) => value.replace(/[.,!?)\]]+$/, "");

/**
 * Renders post and comment text with the three things that are links in it: @handles, #hashtags and
 * plain URLs. Everything else stays literal text, so nothing a person types can inject markup.
 */
function RichText({ text, sx }) {
  if (!text) return null;
  const parts = String(text).split(PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.slice(0, 12)}`;

        if (part.startsWith("@")) {
          const handle = trimTrailing(part.slice(1));
          return (
            <Fragment key={key}>
              <Link component={RouterLink} to={`/u/${handle}`} sx={sx}>
                @{handle}
              </Link>
              {part.slice(1 + handle.length)}
            </Fragment>
          );
        }

        if (part.startsWith("#")) {
          const tag = trimTrailing(part.slice(1));
          return (
            <Fragment key={key}>
              <Link component={RouterLink} to={`/tags/${tag.toLowerCase()}`} sx={sx}>
                #{tag}
              </Link>
              {part.slice(1 + tag.length)}
            </Fragment>
          );
        }

        if (/^https?:\/\//.test(part)) {
          const url = trimTrailing(part);
          return (
            <Fragment key={key}>
              <Link href={url} target="_blank" rel="noopener noreferrer" sx={sx}>
                {url.replace(/^https?:\/\//, "")}
              </Link>
              {part.slice(url.length)}
            </Fragment>
          );
        }

        return <Fragment key={key}>{part}</Fragment>;
      })}
    </>
  );
}

export default memo(RichText);
