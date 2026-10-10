import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import tracks from "../data/shodash-audio.json";
import { createAudioController } from "../lib/audio/controller";
import { lowMediaVolume } from "../lib/audio/volume";
import { audioSource } from "../lib/audio/storage";

const time = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function AudioTransport({ id, onAdvance, onNotice }) {
  const controller = useRef(null);
  const [seekingId, setSeekingId] = useState(null);
  const advance = useRef(onAdvance);
  const [state, setState] = useState({
    ready: false,
    busy: false,
    intent: false,
    current: 0,
    duration: 0,
    error: "",
  });
  useLayoutEffect(() => {
    advance.current = onAdvance;
  }, [onAdvance]);
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    const player = createAudioController({
      audio,
      source: audioSource,
      onAdvance: (next) => advance.current(next),
    });
    controller.current = player;
    const unsubscribe = player.subscribe(() => setState(player.getSnapshot()));
    return () => {
      unsubscribe();
      player.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    controller.current?.setTrack(tracks[id] || null);
  }, [id]);
  const current = state.id === id ? state.current : 0;
  const duration = state.id === id ? state.duration : tracks[id]?.duration || 0;
  const checking = state.id !== id || state.busy;
  const seeking = seekingId === id && !checking && state.ready;
  const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <>
      <div
        className={`audio-progress${seeking ? " is-seeking" : ""}`}
        onContextMenu={(event) => event.preventDefault()}
        style={{ "--audio-progress": `${percent}%` }}
      >
        <span className="audio-progress-fill" />
        <span className="audio-progress-dot" />
        {seeking && state.id === id && (
          <span className="audio-seek-preview">{time(current)}</span>
        )}
        <input
          type="range"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setSeekingId(id);
          }}
          onPointerUp={() => setSeekingId(null)}
          onPointerCancel={() => setSeekingId(null)}
          onLostPointerCapture={() => setSeekingId(null)}
          onKeyDown={(event) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "PageUp",
                "PageDown",
              ].includes(event.key)
            )
              setSeekingId(id);
          }}
          onKeyUp={() => setSeekingId(null)}
          onBlur={() => setSeekingId(null)}
          min="0"
          max={duration || 1}
          step="0.1"
          value={current}
          disabled={checking || !state.ready}
          onChange={(event) =>
            controller.current?.seek(Number(event.target.value))
          }
          aria-label="ऑडियो में आगे या पीछे जाएँ"
          aria-valuetext={`${time(current)} / ${time(duration)}`}
        />
      </div>
      {state.id === id && state.hasPlayed && (
        <div className="audio-times" aria-hidden="true">
          <span>{time(current)}</span>
          <span>{time(duration)}</span>
        </div>
      )}
      <div className="audio-actions">
        <button
          aria-label={
            state.intent && state.ready
              ? "ऑडियो रोकें"
              : state.busy && state.intent
                ? "डाउनलोड रद्द करें"
                : "ऑडियो चलाएँ"
          }
          aria-pressed={state.intent}
          onClick={() => {
            if (!state.intent)
              lowMediaVolume().then((low) => {
                if (low)
                  onNotice?.("आवाज़ कम है। कृपया मीडिया वॉल्यूम बढ़ाएँ।");
              });
            controller.current?.toggle();
          }}
        >
          <Icon name={state.intent && state.ready ? "pause" : "play"} />
          {!state.ready && (
            <span className="audio-badge" aria-hidden="true">
              {state.busy && state.intent ? (
                <svg viewBox="0 0 24 24" className="download-ring">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    className="download-ring-track"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    pathLength="100"
                    strokeDasharray={`${Math.round((state.progress || 0) * 100)} 100`}
                    transform="rotate(-90 12 12)"
                  />
                  <text x="12" y="15">
                    {Math.round((state.progress || 0) * 100)}
                  </text>
                </svg>
              ) : (
                !checking && <Icon name="download" />
              )}
            </span>
          )}
        </button>
      </div>
      <span
        className={`audio-message ${state.error ? "has-error" : ""}`}
        role="status"
      >
        {state.error || (state.busy ? "ऑडियो तैयार हो रहा है…" : "")}
      </span>
    </>
  );
}
