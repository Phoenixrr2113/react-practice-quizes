import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ALL_CHALLENGES } from "@/data/challenges";

const challenges = ALL_CHALLENGES;

function CodeBlock({ code }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load Prism CSS + JS from CDN
    if (!document.getElementById("prism-css")) {
      const link = document.createElement("link");
      link.id = "prism-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
      document.head.appendChild(link);

      // Override Prism background to match our UI
      const override = document.createElement("style");
      override.textContent = `
        pre[class*="language-"], code[class*="language-"] {
          background: #0d0d18 !important;
          font-size: 13px !important;
          line-height: 1.65 !important;
          text-shadow: none !important;
        }
        pre[class*="language-"] {
          border: 1px solid #1e1e32 !important;
          border-radius: 8px !important;
          padding: 18px 20px !important;
          margin: 0 !important;
        }
      `;
      document.head.appendChild(override);
    }

    const loadPrism = () => {
      return new Promise((resolve) => {
        if (window.Prism) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js";
        s.onload = () => {
          // Load JSX plugin after core
          const jsx = document.createElement("script");
          jsx.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js";
          jsx.onload = resolve;
          document.head.appendChild(jsx);
        };
        document.head.appendChild(s);
      });
    };

    loadPrism().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && ref.current) {
      window.Prism.highlightElement(ref.current);
    }
  }, [ready, code]);

  return (
    <pre style={styles.codeBlock}>
      <code ref={ref} className="language-jsx" style={{ fontFamily: "inherit", fontSize: "inherit" }}>
        {code}
      </code>
    </pre>
  );
}

const categoryColors = {
  "Hooks & State": { bg: "#1a1a2e", accent: "#e94560", tag: "#e94560" },
  Performance: { bg: "#1a1a2e", accent: "#0f3460", tag: "#16c79a" },
  Architecture: { bg: "#1a1a2e", accent: "#533483", tag: "#e94560" },
};

const difficultyBadge = {
  Medium: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  Hard: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  Expert: { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)" },
};

export default function ReactInterviewChallenges() {
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const startChallenge = useCallback((challenge) => {
    setCurrentChallenge(challenge);
    setShowSolution(false);
    setShowHints(false);
    setSeconds(0);
    setTimerActive(true);
  }, []);

  const markComplete = useCallback((id) => {
    setCompletedIds((prev) => new Set([...prev, id]));
  }, []);

  const goBack = useCallback(() => {
    setCurrentChallenge(null);
    setTimerActive(false);
    setSeconds(0);
  }, []);

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = useMemo(
    () =>
      Math.round((completedIds.size / challenges.length) * 100),
    [completedIds]
  );

  if (currentChallenge) {
    return (
      <ChallengeView
        challenge={currentChallenge}
        showSolution={showSolution}
        setShowSolution={setShowSolution}
        showHints={showHints}
        setShowHints={setShowHints}
        onBack={goBack}
        onComplete={() => markComplete(currentChallenge.id)}
        isCompleted={completedIds.has(currentChallenge.id)}
        timer={formatTime(seconds)}
        timerActive={timerActive}
        setTimerActive={setTimerActive}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.title}>React Interview Lab</h1>
            <p style={styles.subtitle}>Expert Level · 8+ Years · 36 Challenges</p>
          </div>
          <div style={styles.progressArea}>
            <div style={styles.progressBar}>
              <div
                style={{ ...styles.progressFill, width: `${progress}%` }}
              />
            </div>
            <span style={styles.progressText}>
              {completedIds.size}/{challenges.length} completed
            </span>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {challenges.map((c) => {
          const isComplete = completedIds.has(c.id);
          const diff = difficultyBadge[c.difficulty];
          return (
            <div
              key={c.id}
              style={{
                ...styles.card,
                borderLeft: `3px solid ${categoryColors[c.category]?.tag || "#666"}`,
                opacity: isComplete ? 0.7 : 1,
              }}
              onClick={() => startChallenge(c)}
            >
              <div style={styles.cardTop}>
                <span
                  style={{
                    ...styles.categoryTag,
                    color: categoryColors[c.category]?.tag || "#aaa",
                    background: `${categoryColors[c.category]?.tag || "#aaa"}18`,
                  }}
                >
                  {c.category}
                </span>
                <span style={{ ...styles.diffBadge, color: diff.color, background: diff.bg }}>
                  {c.difficulty}
                </span>
              </div>
              <h3 style={styles.cardTitle}>
                {isComplete && <span style={{ marginRight: 8 }}>✓</span>}
                {c.title}
              </h3>
              <p style={styles.cardDesc}>{c.description.slice(0, 120)}…</p>
              <div style={styles.cardFooter}>
                <span style={styles.timeEst}>⏱ {c.timeEstimate}</span>
                <span style={styles.startLink}>Start →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengeView({
  challenge,
  showSolution,
  setShowSolution,
  showHints,
  setShowHints,
  onBack,
  onComplete,
  isCompleted,
  timer,
  timerActive,
  setTimerActive,
}) {
  const diff = difficultyBadge[challenge.difficulty];
  const catColor = categoryColors[challenge.category]?.tag || "#aaa";

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.challengeTopBar}>
        <button onClick={onBack} style={styles.backBtn}>
          ← Back
        </button>
        <div style={styles.timerArea}>
          <span style={styles.timerDisplay}>{timer}</span>
          <button
            onClick={() => setTimerActive(!timerActive)}
            style={styles.timerToggle}
          >
            {timerActive ? "⏸" : "▶"}
          </button>
        </div>
        <button
          onClick={onComplete}
          style={{
            ...styles.completeBtn,
            background: isCompleted ? "#16c79a" : "transparent",
            color: isCompleted ? "#0a0a12" : "#16c79a",
          }}
        >
          {isCompleted ? "✓ Done" : "Mark Complete"}
        </button>
      </div>

      {/* Challenge header */}
      <div style={styles.challengeHeader}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ ...styles.categoryTag, color: catColor, background: `${catColor}18` }}>
            {challenge.category}
          </span>
          <span style={{ ...styles.diffBadge, color: diff.color, background: diff.bg }}>
            {challenge.difficulty}
          </span>
          <span style={{ color: "#666", fontSize: 13 }}>⏱ {challenge.timeEstimate}</span>
        </div>
        <h2 style={styles.challengeTitle}>{challenge.title}</h2>
        <p style={styles.challengeDesc}>{challenge.description}</p>
        {challenge.realWorld && (
          <div style={styles.realWorldBox}>
            <h4 style={styles.realWorldTitle}>⚡ Real-World Context</h4>
            <p style={styles.realWorldText}>{challenge.realWorld}</p>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Requirements</h3>
        <div style={styles.reqList}>
          {challenge.requirements.map((r, i) => (
            <div key={i} style={styles.reqItem}>
              <span style={styles.reqBullet}>→</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Starter Code */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Starter Code</h3>
        <CodeBlock code={challenge.starterCode} />
      </div>

      {/* Hints toggle */}
      <div style={styles.section}>
        <button onClick={() => setShowHints(!showHints)} style={styles.revealBtn}>
          {showHints ? "Hide Hints ▲" : "Show Hints ▼"}
        </button>
        {showHints && (
          <div style={styles.hintsBox}>
            {challenge.keyPoints.map((p, i) => (
              <div key={i} style={styles.hintItem}>
                <span style={styles.hintNum}>{i + 1}</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solution toggle */}
      <div style={styles.section}>
        <button
          onClick={() => setShowSolution(!showSolution)}
          style={{
            ...styles.revealBtn,
            background: showSolution ? "rgba(239,68,68,0.1)" : "rgba(22,199,154,0.1)",
            color: showSolution ? "#ef4444" : "#16c79a",
            borderColor: showSolution ? "#ef4444" : "#16c79a",
          }}
        >
          {showSolution ? "Hide Solution ▲" : "Reveal Solution ▼"}
        </button>
        {showSolution && (
          <div>
            <CodeBlock code={challenge.solutionCode} />
            <div style={styles.followUpBox}>
              <h4 style={styles.followUpTitle}>Follow-Up Question</h4>
              <p style={styles.followUpText}>{challenge.followUp}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    background: "#0a0a12",
    color: "#e0e0e8",
    minHeight: "100vh",
    padding: "0 0 40px 0",
  },
  header: {
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
    borderBottom: "1px solid #1e1e32",
    padding: "28px 24px 24px",
    marginBottom: 28,
  },
  headerInner: {
    maxWidth: 880,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#f0f0f8",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#666",
    fontWeight: 400,
  },
  progressArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    width: 120,
    height: 6,
    background: "#1e1e32",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #16c79a, #0f3460)",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  grid: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "0 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380, 1fr))",
    gap: 16,
  },
  card: {
    background: "#111120",
    borderRadius: 8,
    padding: "20px 22px",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
    border: "1px solid #1e1e32",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    padding: "3px 8px",
    borderRadius: 4,
  },
  diffBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 4,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 16,
    fontWeight: 600,
    color: "#f0f0f8",
    lineHeight: 1.3,
  },
  cardDesc: {
    margin: "0 0 14px",
    fontSize: 13,
    color: "#888",
    lineHeight: 1.5,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeEst: {
    fontSize: 12,
    color: "#555",
  },
  startLink: {
    fontSize: 13,
    color: "#16c79a",
    fontWeight: 600,
  },

  // Challenge view
  challengeTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
    background: "#0f0f1a",
    borderBottom: "1px solid #1e1e32",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "1px solid #333",
    color: "#aaa",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
  },
  timerArea: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  timerDisplay: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f0f0f8",
    fontVariantNumeric: "tabular-nums",
  },
  timerToggle: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 6px",
  },
  completeBtn: {
    border: "1px solid #16c79a",
    padding: "6px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  challengeHeader: {
    maxWidth: 740,
    margin: "0 auto",
    padding: "28px 24px 0",
  },
  challengeTitle: {
    margin: "14px 0 10px",
    fontSize: 24,
    fontWeight: 700,
    color: "#f0f0f8",
    letterSpacing: "-0.5px",
  },
  challengeDesc: {
    margin: 0,
    fontSize: 14,
    color: "#999",
    lineHeight: 1.65,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  section: {
    maxWidth: 740,
    margin: "0 auto",
    padding: "20px 24px 0",
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#555",
  },
  reqList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  reqItem: {
    display: "flex",
    gap: 10,
    fontSize: 14,
    color: "#ccc",
    lineHeight: 1.5,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  reqBullet: {
    color: "#16c79a",
    fontWeight: 700,
    flexShrink: 0,
  },
  codeBlock: {
    background: "#0d0d18",
    border: "1px solid #1e1e32",
    borderRadius: 8,
    padding: "18px 20px",
    fontSize: 13,
    lineHeight: 1.65,
    overflowX: "auto",
    color: "#c8c8d8",
    margin: "0 0 0 0",
  },
  revealBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #333",
    color: "#aaa",
    padding: "10px 20px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    width: "100%",
    textAlign: "center",
    transition: "all 0.2s",
    marginBottom: 14,
  },
  hintsBox: {
    background: "#0f0f1a",
    border: "1px solid #1e1e32",
    borderRadius: 8,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  hintItem: {
    display: "flex",
    gap: 12,
    fontSize: 13,
    color: "#bbb",
    lineHeight: 1.55,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  hintNum: {
    color: "#f59e0b",
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(245,158,11,0.1)",
    borderRadius: 4,
    marginTop: 2,
  },
  followUpBox: {
    background: "rgba(83, 52, 131, 0.15)",
    border: "1px solid rgba(83, 52, 131, 0.3)",
    borderRadius: 8,
    padding: "16px 18px",
    marginTop: 16,
  },
  followUpTitle: {
    margin: "0 0 8px",
    fontSize: 13,
    fontWeight: 700,
    color: "#a78bfa",
  },
  followUpText: {
    margin: 0,
    fontSize: 14,
    color: "#bbb",
    lineHeight: 1.6,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  realWorldBox: {
    background: "rgba(22, 199, 154, 0.06)",
    border: "1px solid rgba(22, 199, 154, 0.2)",
    borderRadius: 8,
    padding: "14px 18px",
    marginTop: 16,
  },
  realWorldTitle: {
    margin: "0 0 8px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "#16c79a",
  },
  realWorldText: {
    margin: 0,
    fontSize: 13,
    color: "#aab",
    lineHeight: 1.6,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
};