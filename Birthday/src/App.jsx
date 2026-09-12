import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Lightbulb,
  Volume2,
  VolumeX,
  X,
  Heart,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import * as Tone from "tone";
import axios from "axios";

// Point this at your deployed backend (see /backend in this project).
// Locally that's usually http://localhost:8080/api/wishes.
const WISH_API_URL = "https://birthday-backend-gv57.onrender.com/api/wishes";

/* ---------------------------------------------------------
   Gurleen Kaur's Birthday Site
   Stages: intro -> ask -> lookmsg -> night
   night has internal phases: off -> lit -> decorated -> caked
--------------------------------------------------------- */

const MELODY = [
  { n: "C4", d: 0.32 },
  { n: "C4", d: 0.32 },
  { n: "D4", d: 0.6 },
  { n: "C4", d: 0.6 },
  { n: "F4", d: 0.6 },
  { n: "E4", d: 1.15 },
  { n: "C4", d: 0.32 },
  { n: "C4", d: 0.32 },
  { n: "D4", d: 0.6 },
  { n: "C4", d: 0.6 },
  { n: "G4", d: 0.6 },
  { n: "F4", d: 1.15 },
  { n: "C4", d: 0.32 },
  { n: "C4", d: 0.32 },
  { n: "C5", d: 0.6 },
  { n: "A4", d: 0.6 },
  { n: "F4", d: 0.6 },
  { n: "E4", d: 0.6 },
  { n: "D4", d: 1.15 },
  { n: "A#4", d: 0.32 },
  { n: "A#4", d: 0.32 },
  { n: "A4", d: 0.6 },
  { n: "F4", d: 0.6 },
  { n: "G4", d: 0.6 },
  { n: "F4", d: 1.3 },
];
const MELODY_LEN = MELODY.reduce((s, m) => s + m.d, 0) + 0.6;

const BALLOON_COLORS = [
  "#FF6FA5",
  "#FFD166",
  "#8ED1B4",
  "#C9A7FF",
  "#6FC3FF",
  "#FF9B71",
];

const COMPLIMENTS = [
  "main character energy",
  "certified icon",
  "so loved",
  "pure sunshine",
  "iconic, honestly",
  "the best kind of chaos",
  "glowing today",
  "worth celebrating",
];

const TAUNTS = [
  "nice try 😏",
  "not so fast!",
  "almost had me!",
  "nuh uh.",
  "you'll never catch me!",
  "persistent, i like it",
  "ok fine, keep trying",
  "getting warmer... jk",
];

function useBalloons(count) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: 4 + Math.random() * 88,
        size: 46 + Math.random() * 26,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
        duration: 9 + Math.random() * 6,
        delay: -(Math.random() * 12),
        sway: 14 + Math.random() * 20,
      })),
    [count],
  );
}

function useConfetti(count) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
        duration: 3.2 + Math.random() * 2.6,
        delay: Math.random() * 6,
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [count],
  );
}

function useStars(count) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 62,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 3,
        duration: 1.8 + Math.random() * 2.2,
      })),
    [count],
  );
}

export default function GurleenBirthday() {
  const [stage, setStage] = useState("intro"); // intro, ask, lookmsg, night
  const [showMessage, setShowMessage] = useState(false);
  const [muted, setMuted] = useState(false);
  const [noPos, setNoPos] = useState(null);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  const synthRef = useRef(null);
  const mutedRef = useRef(false);
  const playingRef = useRef(false);
  const timeoutRef = useRef(null);
  const askAreaRef = useRef(null);

  const balloons = useBalloons(9);
  const confetti = useConfetti(28);
  const stars = useStars(55);

  useEffect(() => {
    mutedRef.current = muted;
    if (synthRef.current) {
      synthRef.current.volume.value = muted ? -Infinity : -6;
    }
  }, [muted]);

  useEffect(() => {
    if (stage === "lookmsg") {
      const t = setTimeout(() => setStage("night"), 1900);
      return () => clearTimeout(t);
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (synthRef.current) synthRef.current.dispose();
    };
  }, []);

  const startMelodyLoop = useCallback(() => {
    if (!synthRef.current) return;
    const synth = synthRef.current;
    const playOnce = () => {
      if (!playingRef.current) return;
      let t = 0;
      MELODY.forEach(({ n, d }) => {
        const at = t;
        setTimeout(() => {
          if (playingRef.current) synth.triggerAttackRelease(n, d * 0.92);
        }, at * 1000);
        t += d;
      });
      timeoutRef.current = setTimeout(playOnce, MELODY_LEN * 1000);
    };
    playOnce();
  }, []);

  const startMusic = useCallback(async () => {
    try {
      await Tone.start();
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.25, release: 0.3 },
      }).toDestination();
      synth.volume.value = mutedRef.current ? -Infinity : -6;
      synthRef.current = synth;
      playingRef.current = true;
      startMelodyLoop();
    } catch (e) {
      /* audio not available, continue silently */
    }
  }, [startMelodyLoop]);

  const stopMusic = useCallback(() => {
    playingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
  }, []);

  const handleReplay = useCallback(() => {
    stopMusic();
    setShowMessage(false);
    setNoPos(null);
    setDodgeCount(0);
    setReplayKey((k) => k + 1);
    setStage("intro");
  }, [stopMusic]);

  /* ---- "no" button: runs away from the cursor/finger as it gets close ---- */
  const NO_W = 88;
  const NO_H = 52;
  const SAFE_DIST = 92;

  const initNoPos = (rect) => ({
    x: Math.min(rect.width - NO_W - 10, rect.width * 0.62),
    y: rect.height / 2 - NO_H / 2,
  });

  const runAway = useCallback((clientX, clientY) => {
    const area = askAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    setNoPos((prev) => {
      const cur = prev || initNoPos(rect);
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      const btnCx = cur.x + NO_W / 2;
      const btnCy = cur.y + NO_H / 2;
      const dx = btnCx - cx;
      const dy = btnCy - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < SAFE_DIST) {
        const angle =
          (dist < 1 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx)) +
          (Math.random() - 0.5) * 0.7;
        const jump = SAFE_DIST + 50;
        let nx = btnCx + Math.cos(angle) * jump - NO_W / 2;
        let ny = btnCy + Math.sin(angle) * jump - NO_H / 2;
        nx = Math.min(Math.max(nx, 0), Math.max(0, rect.width - NO_W));
        ny = Math.min(Math.max(ny, 0), Math.max(0, rect.height - NO_H));
        setDodgeCount((d) => d + 1);
        return { x: nx, y: ny };
      }
      return cur;
    });
  }, []);

  const onAskAreaMouseMove = (e) => runAway(e.clientX, e.clientY);
  const onAskAreaTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      runAway(e.touches[0].clientX, e.touches[0].clientY);
      if (e.cancelable) e.preventDefault();
    }
  };
  const onNoDirectHit = (e) => {
    if (e.cancelable) e.preventDefault();
    const t = e.touches && e.touches[0] ? e.touches[0] : e;
    runAway(t.clientX, t.clientY);
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Quicksand:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }
        .gb-root { font-family: 'Quicksand', sans-serif; }
        .gb-display { font-family: 'Baloo 2', cursive; }

        @keyframes floatUp {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translateY(-52vh) translateX(var(--sway)) rotate(4deg); }
          100% { transform: translateY(-108vh) translateX(0) rotate(-4deg); opacity: 0.95; }
        }
        .balloon-wrap {
          position: absolute; bottom: -140px; animation-name: floatUp;
          animation-timing-function: ease-in-out; animation-iteration-count: infinite;
          cursor: pointer;
        }
        .balloon-body {
          position: relative; border-radius: 50% 50% 48% 48% / 58% 58% 42% 42%;
          box-shadow: inset -8px -10px 0 rgba(0,0,0,0.08), inset 6px 8px 10px rgba(255,255,255,0.35);
          transition: transform 0.15s ease;
        }
        .balloon-wrap:hover .balloon-body { transform: scale(1.07); }
        .balloon-body::after {
          content: ''; position: absolute; left: 50%; bottom: -3px; width: 0; height: 0;
          border-left: 5px solid transparent; border-right: 5px solid transparent;
          border-top: 7px solid currentColor; transform: translateX(-50%);
        }
        .balloon-string {
          position: absolute; left: 50%; top: 100%; width: 1px; height: 60px;
          background: rgba(255,255,255,0.4); transform: translateX(-50%);
        }

        @keyframes confettiFall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(540deg); opacity: 0.9; }
        }
        .confetti-piece { position: absolute; top: -20px; animation-name: confettiFall; animation-timing-function: linear; animation-iteration-count: infinite; }

        @keyframes twinkle {
          0%, 100% { opacity: 0.35; box-shadow: 0 0 4px currentColor; }
          50% { opacity: 1; box-shadow: 0 0 14px 4px currentColor; }
        }
        .twinkle-bulb { animation: twinkle 1.6s ease-in-out infinite; }
        .twinkle-star { animation: twinkle 2.4s ease-in-out infinite; }

        @keyframes shootStar {
          0%   { transform: translate(0,0); opacity: 0; }
          8%   { opacity: 1; }
          16%  { transform: translate(-180px, 180px); opacity: 0; }
          100% { transform: translate(-180px, 180px); opacity: 0; }
        }
        .shooting-star {
          position: absolute; width: 2px; height: 2px; background: #fff; border-radius: 50%;
          box-shadow: 0 0 6px 1px #fff;
          animation-name: shootStar; animation-timing-function: ease-in; animation-iteration-count: infinite;
        }
        .shooting-star::before {
          content: ''; position: absolute; top: 1px; right: 1px; width: 70px; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.85), transparent);
          transform: rotate(45deg); transform-origin: right center;
        }

        @keyframes flicker {
          0%, 100% { transform: scaleY(1) translateX(0); opacity: 1; }
          25% { transform: scaleY(1.12) translateX(0.6px); }
          50% { transform: scaleY(0.92) translateX(-0.6px); opacity: 0.85; }
          75% { transform: scaleY(1.08) translateX(0.4px); }
        }
        .flame { animation: flicker 0.45s ease-in-out infinite; transform-origin: bottom center; }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 40px 14px rgba(255,209,102,0.55), 0 0 90px 40px rgba(255,209,102,0.22); }
          50% { box-shadow: 0 0 55px 20px rgba(255,209,102,0.75), 0 0 120px 55px rgba(255,209,102,0.3); }
        }
        .bulb-on { animation: glowPulse 1.8s ease-in-out infinite; }

        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-in { animation: popIn 0.5s cubic-bezier(.2,.9,.3,1.2) both; }

        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }

        @keyframes gentleBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .bob { animation: gentleBob 3s ease-in-out infinite; }

        @keyframes burstFloat {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { transform: translateY(-6px) scale(1.08); opacity: 1; }
          100% { transform: translateY(-70px) scale(1); opacity: 0; }
        }
        .balloon-burst { position: absolute; pointer-events: none; animation: burstFloat 1.3s ease-out forwards; text-align: center; white-space: nowrap; }

        @keyframes lanternRise {
          0%   { transform: translate(-50%, 0) scale(0.9); opacity: 0; }
          10%  { opacity: 1; }
          45%  { transform: translate(calc(-50% + 18px), -46vh) scale(1); }
          100% { transform: translate(calc(-50% - 14px), -98vh) scale(0.85); opacity: 0; }
        }
        .lantern-rise { position: absolute; left: 50%; bottom: 10px; animation: lanternRise 3.1s ease-in forwards; }

        .no-btn-run {
          transition: left 0.14s ease-out, top 0.14s ease-out;
        }

        @keyframes bgToParty {
          0% { background: #050307; }
          100% { background: linear-gradient(160deg,#1b0f3a 0%,#3a1a52 50%,#5c1f4f 100%); }
        }
        .bg-decorate { animation: bgToParty 1.1s ease forwards; }

        .replay-btn:hover { opacity: 0.85; }
      `}</style>

      {stage === "intro" && <IntroStage onNext={() => setStage("ask")} />}

      {stage === "ask" && (
        <AskStage
          areaRef={askAreaRef}
          noPos={noPos}
          dodgeCount={dodgeCount}
          onAreaMouseMove={onAskAreaMouseMove}
          onAreaTouchMove={onAskAreaTouchMove}
          onNoDirectHit={onNoDirectHit}
          onYes={() => setStage("lookmsg")}
        />
      )}

      {stage === "lookmsg" && <LookMsgStage />}

      {stage === "night" && (
        <NightStage
          key={replayKey}
          balloons={balloons}
          confetti={confetti}
          stars={stars}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onLight={startMusic}
          onOpenMessage={() => setShowMessage(true)}
        />
      )}

      {showMessage && (
        <MessageModal
          onClose={() => setShowMessage(false)}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}

/* ---------------- Stage components ---------------- */

function IntroStage({ onNext }) {
  const stars = useStars(30);
  return (
    <div
      style={{
        ...styles.centerScreen,
        background:
          "linear-gradient(160deg,#2b0f4e 0%,#4a1a5c 45%,#7a2b6e 100%)",
        overflow: "hidden",
      }}
    >
      {stars.map((s) => (
        <div
          key={s.id}
          className="twinkle-star"
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            color: "#fff",
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      <div
        className="fade-up"
        style={{ textAlign: "center", padding: "0 18px", zIndex: 2 }}
      >
        <div style={{ fontSize: 54, marginBottom: 10 }}>🎉</div>
        <h1 className="gb-display" style={styles.h1}>
          It's your special day, Gurleen!
        </h1>
        <p
          className="gb-display"
          style={{
            ...styles.h1,
            fontSize: "clamp(28px,6vw,44px)",
            color: "#FFD166",
            marginTop: 4,
            textShadow: "0 0 22px rgba(255,209,102,0.45)",
          }}
        >
          yeyey!!
        </p>
        <button style={styles.primaryBtn} onClick={onNext}>
          okay okay, show me &rarr;
        </button>
      </div>
    </div>
  );
}

function AskStage({
  areaRef,
  noPos,
  dodgeCount,
  onAreaMouseMove,
  onAreaTouchMove,
  onNoDirectHit,
  onYes,
}) {
  const taunt =
    dodgeCount > 0 ? TAUNTS[(dodgeCount - 1) % TAUNTS.length] : null;
  const yesScale = 1 + Math.min(dodgeCount, 8) * 0.035;

  return (
    <div
      style={{
        ...styles.centerScreen,
        background:
          "linear-gradient(160deg,#2b0f4e 0%,#4a1a5c 45%,#7a2b6e 100%)",
      }}
    >
      <div
        className="fade-up"
        style={{
          textAlign: "center",
          padding: "0 18px",
          maxWidth: 480,
          width: "100%",
        }}
      >
        <p className="gb-display" style={{ ...styles.h2 }}>
          I made something for you.
        </p>
        <p className="gb-display" style={{ ...styles.h2, marginTop: 2 }}>
          Do you wanna see what I made?
        </p>

        <div
          ref={areaRef}
          onMouseMove={onAreaMouseMove}
          onTouchMove={onAreaTouchMove}
          style={{
            position: "relative",
            height: 170,
            marginTop: 30,
            width: "100%",
          }}
        >
          <button
            style={{
              ...styles.yesBtn,
              position: "absolute",
              left: "50%",
              top: 16,
              transform: `translateX(calc(-50% - min(64px, 17vw))) scale(${yesScale})`,
            }}
            onClick={onYes}
          >
            yas 🎁
          </button>

          <button
            className="no-btn-run"
            style={{
              ...styles.noBtn,
              position: "absolute",
              left: noPos ? noPos.x : "calc(60% - 44px)",
              top: noPos ? noPos.y : 16,
            }}
            onMouseEnter={onNoDirectHit}
            onTouchStart={onNoDirectHit}
            onClick={onNoDirectHit}
          >
            no
          </button>
        </div>
        <p
          style={{ opacity: 0.65, fontSize: 13, marginTop: 10, minHeight: 18 }}
        >
          {taunt ? taunt : '(psst, "no" doesn\'t like to be caught)'}
        </p>
      </div>
    </div>
  );
}

function LookMsgStage() {
  return (
    <div
      style={{
        ...styles.centerScreen,
        background:
          "linear-gradient(160deg,#2b0f4e 0%,#4a1a5c 45%,#7a2b6e 100%)",
      }}
    >
      <p
        className="gb-display pop-in"
        style={{ ...styles.h1, textAlign: "center", padding: "0 18px" }}
      >
        Have a look at it, madam jiii 👀
      </p>
    </div>
  );
}

/* NightStage: off -> lit -> decorated -> caked, each step user-triggered. */
function NightStage({
  balloons,
  confetti,
  stars,
  muted,
  onToggleMute,
  onLight,
  onOpenMessage,
}) {
  const [phase, setPhase] = useState("off"); // off, lit, decorated, caked
  const [showMsgBtn, setShowMsgBtn] = useState(false);
  const [poppedBalloons, setPoppedBalloons] = useState({});
  const [bursts, setBursts] = useState([]);
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishText, setWishText] = useState("");
  const [launchedWish, setLaunchedWish] = useState(null);
  const [wishStatus, setWishStatus] = useState("idle"); // idle, sending, saved, error

  const handleBulbClick = () => {
    if (phase !== "off") return;
    setPhase("lit");
    onLight();
  };

  const handleDecorate = () => setPhase("decorated");
  const handleCake = () => {
    setPhase("caked");
    setTimeout(() => setShowWishForm(true), 1400);
  };

  const handleLaunchWish = async () => {
    if (launchedWish) return;
    const finalWish = wishText.trim() || "something wonderful, always";
    setLaunchedWish(finalWish);
    setShowWishForm(false);

    // Send the wish to the backend so it's saved in MongoDB.
    // The lantern animation plays regardless of whether this succeeds.
    setWishStatus("sending");
    try {
      await axios.post(WISH_API_URL, {
        name: "Gurleen",
        message: finalWish,
      });
      setWishStatus("saved");
    } catch (err) {
      console.error("couldn't save the wish:", err);
      setWishStatus("error");
    }
  };

  const handleLanternDone = () => {
    setTimeout(() => setShowMsgBtn(true), 300);
  };

  const handlePopBalloon = (b) => {
    setPoppedBalloons((prev) => ({ ...prev, [b.id]: true }));
    const message = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    const burstId = `${b.id}-${Date.now()}`;
    setBursts((prev) => [
      ...prev,
      { id: burstId, left: b.left, color: b.color, message },
    ]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((x) => x.id !== burstId));
    }, 1350);
  };

  const decorated = phase === "decorated" || phase === "caked";
  const caked = phase === "caked";

  return (
    <div
      className={decorated ? "bg-decorate" : ""}
      style={{
        ...styles.centerScreen,
        background: decorated ? undefined : "#050307",
        overflow: "hidden",
      }}
    >
      {!decorated &&
        stars.map((s) => (
          <div
            key={s.id}
            className="twinkle-star"
            style={{
              position: "absolute",
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "#fff",
              color: "#fff",
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}

      {!decorated && (
        <>
          <div
            className="shooting-star"
            style={{
              top: "14%",
              left: "70%",
              animationDuration: "5s",
              animationDelay: "0.6s",
            }}
          />
          <div
            className="shooting-star"
            style={{
              top: "28%",
              left: "85%",
              animationDuration: "6.5s",
              animationDelay: "3.2s",
            }}
          />
          <div
            className="shooting-star"
            style={{
              top: "8%",
              left: "55%",
              animationDuration: "7.5s",
              animationDelay: "5.8s",
            }}
          />
        </>
      )}

      {decorated && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-evenly",
            padding: "10px 6px 0",
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="twinkle-bulb"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: BALLOON_COLORS[i % BALLOON_COLORS.length],
                color: BALLOON_COLORS[i % BALLOON_COLORS.length],
                animationDelay: `${(i % 5) * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}

      {decorated &&
        confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 0.5,
              background: c.color,
              borderRadius: 2,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}

      {decorated &&
        balloons.map((b) =>
          poppedBalloons[b.id] ? null : (
            <div
              key={b.id}
              className="balloon-wrap"
              onClick={() => handlePopBalloon(b)}
              style={{
                left: `${b.left}%`,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
                "--sway": `${b.sway}px`,
              }}
              title="pop me"
            >
              <div
                className="balloon-body"
                style={{
                  width: b.size,
                  height: b.size * 1.15,
                  background: b.color,
                  color: b.color,
                }}
              />
              <div className="balloon-string" />
            </div>
          ),
        )}

      {decorated &&
        bursts.map((burst) => (
          <div
            key={burst.id}
            className="balloon-burst"
            style={{ left: `${burst.left}%`, bottom: "18%" }}
          >
            <Sparkles
              size={16}
              color={burst.color}
              style={{ marginBottom: 2 }}
            />
            <div
              className="gb-display"
              style={{ color: "#FFF6E9", fontSize: 14, fontWeight: 700 }}
            >
              {burst.message}
            </div>
          </div>
        ))}

      {phase === "off" && (
        <button
          onClick={handleBulbClick}
          style={styles.bulbBtn}
          aria-label="turn on the light"
        >
          <div className="bob" style={styles.bulbCircleOff}>
            <Lightbulb size={44} color="#6b6b78" strokeWidth={2} />
          </div>
          <span style={styles.bulbHint}>tap the light</span>
        </button>
      )}

      {phase === "lit" && (
        <div className="fade-up" style={{ textAlign: "center", zIndex: 3 }}>
          <div className="bulb-on" style={styles.bulbCircleOn}>
            <Lightbulb size={44} color="#5b3d00" strokeWidth={2} />
          </div>
          <p style={{ ...styles.bulbHint, marginTop: 18 }}>there we go...</p>
          <button
            style={{ ...styles.primaryBtn, marginTop: 18 }}
            onClick={handleDecorate}
          >
            start ✨
          </button>
        </div>
      )}

      {decorated && (
        <div
          className="fade-up"
          style={{ textAlign: "center", zIndex: 3, padding: "0 20px" }}
        >
          <h1
            className="gb-display"
            style={{
              ...styles.h1,
              fontSize: "clamp(30px,6vw,50px)",
              textShadow: "0 0 26px rgba(255,209,102,0.35)",
            }}
          >
            Happy Birthday, Gurleen! 🎂
          </h1>
          <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>
            (tap the balloons floating by — they don't bite)
          </p>
          {!caked && (
            <button
              style={{ ...styles.primaryBtn, marginTop: 18 }}
              onClick={handleCake}
            >
              click here for the cake 🎂
            </button>
          )}
        </div>
      )}

      {caked && <Cake />}

      {showWishForm && (
        <div
          className="fade-up"
          style={{
            marginTop: 18,
            zIndex: 3,
            textAlign: "center",
            width: "100%",
            maxWidth: 380,
            padding: "0 20px",
          }}
        >
          <p style={{ ...styles.bulbHint, marginBottom: 10 }}>
            now make a wish...
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={wishText}
              onChange={(e) => setWishText(e.target.value.slice(0, 60))}
              placeholder="type your wish here"
              style={styles.wishInput}
            />
            <button style={styles.wishSendBtn} onClick={handleLaunchWish}>
              send ✨
            </button>
          </div>
        </div>
      )}

      {launchedWish && (
        <div
          className="lantern-rise"
          onAnimationEnd={handleLanternDone}
          style={{ zIndex: 5 }}
        >
          <div style={styles.lantern}>
            <span style={{ fontSize: 22 }}>🏮</span>
          </div>
          <div style={styles.lanternText} className="gb-display">
            {launchedWish}
          </div>
        </div>
      )}

      {wishStatus === "sending" && (
        <p style={{ opacity: 0.5, fontSize: 12, marginTop: 8, zIndex: 3 }}>
          sending your wish...
        </p>
      )}
      {wishStatus === "error" && (
        <p
          style={{
            opacity: 0.6,
            fontSize: 12,
            marginTop: 8,
            zIndex: 3,
            color: "#FFB4B4",
          }}
        >
          couldn't save it, but it still counts 🌙
        </p>
      )}

      {showMsgBtn && (
        <button
          className="fade-up"
          style={{ ...styles.primaryBtn, marginTop: 26, zIndex: 3 }}
          onClick={onOpenMessage}
        >
          well, i have a message for you 💌
        </button>
      )}

      {decorated && (
        <button
          onClick={onToggleMute}
          aria-label="toggle music"
          style={styles.muteBtn}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
    </div>
  );
}

function Cake() {
  const candles = [0, 1, 2, 3, 4];
  return (
    <div
      className="fade-up"
      style={{
        position: "relative",
        marginTop: 18,
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "clamp(8px,3vw,14px)",
          marginBottom: -6,
        }}
      >
        {candles.map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              className="flame"
              style={{
                width: 8,
                height: 14,
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                background:
                  "radial-gradient(circle at 50% 30%, #FFF6C9, #FFD166 55%, #FF8A3D 100%)",
                marginBottom: 1,
                animationDelay: `${i * 0.08}s`,
              }}
            />
            <div
              style={{
                width: 3,
                height: "clamp(18px,7vw,26px)",
                background: "#FFF3D6",
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          width: "clamp(120px,42vw,150px)",
          height: "clamp(26px,9vw,34px)",
          background: "linear-gradient(180deg,#FF9BC1,#FF6FA5)",
          borderRadius: "10px 10px 4px 4px",
          boxShadow: "inset 0 -6px 0 rgba(0,0,0,0.08)",
        }}
      />
      <div
        style={{
          width: "clamp(160px,58vw,210px)",
          height: "clamp(34px,13vw,46px)",
          background: "linear-gradient(180deg,#FFE08A,#FFD166)",
          borderRadius: "6px 6px 10px 10px",
          boxShadow: "inset 0 -8px 0 rgba(0,0,0,0.08)",
          marginTop: 2,
        }}
      />
      <div
        style={{
          width: "clamp(190px,68vw,250px)",
          height: "clamp(10px,4vw,14px)",
          background: "rgba(255,255,255,0.85)",
          borderRadius: "50%",
          marginTop: 4,
          boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

function MessageModal({ onClose, onReplay }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,4,20,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        padding: 18,
      }}
    >
      <div className="pop-in" style={styles.card}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="close">
          <X size={18} />
        </button>
        <Heart
          size={30}
          color="#FF6FA5"
          style={{ marginBottom: 6 }}
          fill="#FF6FA5"
        />
        <h2
          className="gb-display"
          style={{ fontSize: 24, color: "#3a1a52", marginBottom: 10 }}
        >
          Dear Gurleen,
        </h2>
        <p style={styles.msgText}>
          Happy birthday! I hope today feels exactly like you deserve it to
          &mdash; loud with laughter, full of your favorite people, and just a
          little bit extra, the way all good birthdays should be.
        </p>
        <p style={styles.msgText}>
          Making this for you took a few tries (and yes, the "no" button fought
          back), but that's kind of how our friendship goes too &mdash; a little
          chaotic, a lot of fun, and always worth it.
        </p>
        <p style={styles.msgText}>
          Here's to another year of you being exactly, wonderfully yourself. Go
          eat some cake, make a wish, and know that you're appreciated more than
          a webpage could ever say.
        </p>
        <p style={{ ...styles.msgText, fontWeight: 700, marginTop: 14 }}>
          With love,
          <br />
          your friend
        </p>
        <button
          className="replay-btn"
          style={styles.replayBtn}
          onClick={onReplay}
        >
          <RotateCcw size={14} /> watch it again
        </button>
      </div>
    </div>
  );
}

/* ---------------- shared styles ---------------- */

const styles = {
  root: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
    overflowX: "hidden",
  },
  centerScreen: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflowX: "hidden",
  },
  h1: {
    color: "#FFF6E9",
    fontSize: "clamp(26px,5.5vw,42px)",
    lineHeight: 1.15,
    margin: 0,
    fontWeight: 700,
  },
  h2: {
    color: "#FFF6E9",
    fontSize: "clamp(20px,4.4vw,28px)",
    margin: 0,
    fontWeight: 600,
  },
  primaryBtn: {
    background: "#FFD166",
    color: "#3a1a52",
    border: "none",
    borderRadius: 999,
    padding: "13px 26px",
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(255,209,102,0.35)",
  },
  yesBtn: {
    background: "#8ED1B4",
    color: "#0e3b2a",
    border: "none",
    borderRadius: 999,
    padding: "13px 20px",
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(14px,3.8vw,16px)",
    cursor: "pointer",
    height: 52,
    width: "clamp(88px,26vw,110px)",
    transition: "transform 0.25s ease",
  },
  noBtn: {
    background: "#FF6FA5",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "13px 18px",
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(14px,3.8vw,16px)",
    cursor: "pointer",
    height: 52,
    width: "clamp(76px,22vw,96px)",
  },
  bulbBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  },
  bulbCircleOff: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1c1c22",
    border: "2px solid #3a3a44",
  },
  bulbCircleOn: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 35% 30%, #FFF3C4, #FFD166 60%, #E8A93A 100%)",
    border: "2px solid #FFD166",
    margin: "0 auto",
  },
  bulbHint: {
    color: "#9a95a8",
    fontFamily: "Quicksand, sans-serif",
    fontSize: 15,
  },
  muteBtn: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 4,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "50%",
    width: 42,
    height: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
  },
  wishInput: {
    flex: 1,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: 999,
    padding: "11px 16px",
    color: "#FFF6E9",
    fontFamily: "'Quicksand', sans-serif",
    fontSize: 14,
    outline: "none",
  },
  wishSendBtn: {
    background: "#C9A7FF",
    color: "#2b0f4e",
    border: "none",
    borderRadius: 999,
    padding: "11px 18px",
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  lantern: {
    width: 44,
    height: 54,
    borderRadius: "12px 12px 18px 18px",
    background: "linear-gradient(180deg,#FFE9A8,#FFD166 60%,#E8A93A)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 24px 10px rgba(255,209,102,0.45)",
    margin: "0 auto",
  },
  lanternText: {
    marginTop: 6,
    color: "#FFF6E9",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 140,
    textShadow: "0 1px 6px rgba(0,0,0,0.5)",
  },
  card: {
    position: "relative",
    background: "#FFF6E9",
    borderRadius: 20,
    padding: "30px 22px",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "rgba(0,0,0,0.06)",
    border: "none",
    borderRadius: "50%",
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#3a1a52",
  },
  msgText: {
    color: "#4a3a55",
    fontSize: 15.5,
    lineHeight: 1.6,
    margin: "0 0 12px",
  },
  replayBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px solid rgba(58,26,82,0.25)",
    borderRadius: 999,
    padding: "9px 16px",
    color: "#3a1a52",
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    marginTop: 6,
  },
};
