import { useCallback, useEffect, useRef, useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { Mic, Square } from "lucide-react";
import { assistantService } from "../services/assistantClient";
import { tokens } from "../../../theme/tokens";

/**
 * Speak instead of typing.
 *
 * The recorder also measures the live signal level, which is passed up so the robot's mouth moves with the
 * person's actual voice. That is not a gimmick: it is the only honest way to show that the microphone is
 * working. A static "recording" label tells you nothing about whether anything is being heard, and the
 * commonest microphone problem is a muted input, not a missing permission.
 *
 * Everything is released on stop and on unmount — the tracks, the audio context, the analyser loop. A
 * MediaStream left open keeps the browser's recording indicator lit, which people rightly find alarming.
 */
export default function VoiceButton({ onTranscript, onLevel, onRecordingChange, disabled }) {
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(0);

  const release = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.close().catch(() => {});
    audioRef.current = null;
    recorderRef.current = null;
    onLevel?.(0);
  }, [onLevel]);

  useEffect(() => release, [release]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setUnsupported(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Level metering, for the avatar's mouth.
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audio = new AudioContextClass();
        audioRef.current = audio;
        const analyser = audio.createAnalyser();
        analyser.fftSize = 512;
        audio.createMediaStreamSource(stream).connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount);

        const meter = () => {
          analyser.getByteTimeDomainData(buffer);
          // Root mean square of the waveform around its centre: a real loudness measure rather than a
          // peak, so it does not flicker on every consonant.
          let sum = 0;
          for (let i = 0; i < buffer.length; i += 1) {
            const v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          onLevel?.(Math.min(1, Math.sqrt(sum / buffer.length) * 4));
          rafRef.current = requestAnimationFrame(meter);
        };
        meter();
      }

      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        release();
        setRecording(false);
        onRecordingChange?.(false);

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        // Below about a kilobyte there is no speech in there, only a click. Sending it wastes a request and
        // comes back with nonsense.
        if (blob.size < 1200) return;

        setWorking(true);
        try {
          const result = await assistantService.transcribe(blob);
          if (result?.text) onTranscript(result.text);
        } catch {
          onTranscript("", "That did not transcribe. Try again, or type it.");
        } finally {
          setWorking(false);
        }
      };

      recorder.start();
      setRecording(true);
      onRecordingChange?.(true);
    } catch {
      // Almost always a declined permission. Nothing to do but say so via the tooltip.
      setUnsupported(true);
      release();
    }
  };

  const stop = () => recorderRef.current?.stop();

  if (working) {
    return (
      <IconButton disabled size="small" aria-label="Transcribing">
        <CircularProgress size={16} />
      </IconButton>
    );
  }

  return (
    <Tooltip title={unsupported ? "No microphone available" : recording ? "Stop and transcribe" : "Speak instead"}>
      <IconButton
        size="small"
        onClick={recording ? stop : start}
        disabled={disabled || unsupported}
        aria-label={recording ? "Stop recording" : "Record a voice note"}
        sx={{
          color: recording ? tokens.onInk : tokens.inkSoft,
          bgcolor: recording ? tokens.ember : "transparent",
          "&:hover": { bgcolor: recording ? tokens.emberDark : tokens.wash.ink },
        }}
      >
        {recording ? <Square size={15} /> : <Mic size={17} />}
      </IconButton>
    </Tooltip>
  );
}
