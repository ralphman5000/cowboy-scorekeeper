import { useRef, useState } from "react";

const BALLS = [
  { id: "b1", label: "1", points: 1 },
  { id: "b3", label: "3", points: 3 },
  { id: "b5", label: "5", points: 5 },
];

const CAROMS = [
  { id: "c2", label: "Carom 2", desc: "Cue hits 2 balls", points: 1 },
  { id: "c3", label: "Carom 3", desc: "Cue hits 3 balls", points: 2 },
];

const TARGET = 101;
const CAROM_ONLY_THRESHOLD = 90;
const WINNING_SHOT_THRESHOLD = 100;

function getRulesSummary(exact90, dramaticFinish) {
  if (exact90 && dramaticFinish) return "Active: Exact 90 + Dramatic Finish";
  if (exact90) return "Active: Exact 90";
  if (dramaticFinish) return "Active: Dramatic Finish";
  return "Active: Standard";
}

function getRulesHint(exact90, dramaticFinish) {
  if (exact90 && dramaticFinish) {
    return "Hit 90 exactly. Any scoring shot over 90 is a scratch. At 90, caroms only. At 100, make the winning shot. Overshooting 100 is a scratch.";
  }
  if (exact90) {
    return "Hit 90 exactly. Any scoring shot over 90 is a scratch. After 90, caroms only. First to 101 wins.";
  }
  if (dramaticFinish) {
    return "90–99 = carom only. Reach 100 exactly to unlock the winning shot. Overshooting 100 is a scratch.";
  }
  return "90+ = carom only. First to 101 wins.";
}

function PlayerSetup({ onStart }) {
  const [names, setNames] = useState(["", ""]);
  const [exact90, setExact90] = useState(false);
  const [dramaticFinish, setDramaticFinish] = useState(false);

  const addPlayer = () => {
    if (names.length < 6) setNames((prev) => [...prev, ""]);
  };

  const removePlayer = (i) => {
    if (names.length > 2) {
      setNames((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const updateName = (i, val) => {
    setNames((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const canStart = names.every((n) => n.trim().length > 0);
  const rulesSummary = getRulesSummary(exact90, dramaticFinish);
  const rulesHint = getRulesHint(exact90, dramaticFinish);

  return (
    <div style={styles.setupContainer}>
      <div style={styles.setupCard}>
        <div style={styles.logoMark}>🎱</div>
        <h1 style={styles.title}>COWBOY</h1>
        <p style={styles.subtitle}>Billiards Scorekeeper</p>

        <div style={styles.rulesCard}>
          <div style={styles.rulesLabel}>HOUSE RULES</div>

          <div style={styles.rulesToggle2}>
            <button
              style={{
                ...styles.rulesToggleBtn,
                ...(exact90 ? styles.rulesToggleBtnActive : {}),
              }}
              onClick={() => setExact90((prev) => !prev)}
            >
              Exact 90
            </button>

            <button
              style={{
                ...styles.rulesToggleBtn,
                ...(dramaticFinish ? styles.rulesToggleBtnActive : {}),
              }}
              onClick={() => setDramaticFinish((prev) => !prev)}
            >
              Dramatic Finish
            </button>
          </div>

          <div style={styles.rulesSummary}>{rulesSummary}</div>
          <div style={styles.rulesHint}>{rulesHint}</div>
        </div>

        <div style={styles.playerList}>
          {names.map((name, i) => (
            <div key={i} style={styles.playerInputRow}>
              <div style={styles.playerNum}>{i + 1}</div>
              <input
                style={styles.input}
                placeholder={`Player ${i + 1} name`}
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                maxLength={16}
              />
              {names.length > 2 && (
                <button
                  style={styles.removeBtn}
                  onClick={() => removePlayer(i)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {names.length < 6 && (
          <button style={styles.addBtn} onClick={addPlayer}>
            + Add Player
          </button>
        )}

        <button
          style={{ ...styles.startBtn, opacity: canStart ? 1 : 0.4 }}
          disabled={!canStart}
          onClick={() =>
            onStart({
              names: names.map((n) => n.trim()),
              exact90,
              dramaticFinish,
            })
          }
        >
          START GAME
        </button>
      </div>
    </div>
  );
}

function ScoreGame({ players, exact90, dramaticFinish, onReset }) {
  const [scores, setScores] = useState(players.map(() => 0));
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [turnPending, setTurnPending] = useState(0);
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [flash, setFlash] = useState(null);

  const flashTimeoutRef = useRef(null);

  const turnStart = scores[currentPlayer];
  const projectedScore = turnStart + turnPending;

  const caromOnly =
    projectedScore >= CAROM_ONLY_THRESHOLD &&
    projectedScore < (dramaticFinish ? WINNING_SHOT_THRESHOLD : TARGET);

  const winningShot =
    dramaticFinish && projectedScore >= WINNING_SHOT_THRESHOLD;

  const modeLabel =
    exact90 && dramaticFinish
      ? "Exact 90 + Dramatic"
      : exact90
      ? "Exact 90"
      : dramaticFinish
      ? "Dramatic Finish"
      : "Standard";

  const infoBannerText = getRulesHint(exact90, dramaticFinish);
  const rulesSummary = getRulesSummary(exact90, dramaticFinish);

  const triggerFlash = (msg) => {
    setFlash(msg);

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    flashTimeoutRef.current = setTimeout(() => {
      setFlash(null);
      flashTimeoutRef.current = null;
    }, 700);
  };

  const advanceTurn = () => {
    const next = (currentPlayer + 1) % players.length;
    setCurrentPlayer(next);
    setTurnPending(0);
    setHistory([]);
  };

  const scratch = (message = "SCRATCH") => {
    if (winner !== null) return;
    triggerFlash(message);
    setTurnPending(0);
    setHistory([]);
    advanceTurn();
  };

  const addPoints = (pts, label, type = "ball") => {
    if (winner !== null || winningShot) return;

    const nextProjected = projectedScore + pts;

    if (
      exact90 &&
      projectedScore < CAROM_ONLY_THRESHOLD &&
      nextProjected > CAROM_ONLY_THRESHOLD
    ) {
      scratch("OVER 90");
      return;
    }

    if (
      dramaticFinish &&
      projectedScore < WINNING_SHOT_THRESHOLD &&
      nextProjected > WINNING_SHOT_THRESHOLD
    ) {
      scratch("OVER 100");
      return;
    }

    setTurnPending((prev) => prev + pts);
    setHistory((prev) => [...prev, { pts, label, type }]);
    triggerFlash(`+${pts}`);
  };

  const undoLast = () => {
    if (history.length === 0 || winner !== null) return;

    const last = history[history.length - 1];
    setTurnPending((prev) => Math.max(0, prev - last.pts));
    setHistory((prev) => prev.slice(0, -1));
  };

  const endTurn = () => {
    if (winner !== null) return;

    let newScore = projectedScore;

    if (dramaticFinish) {
      if (newScore >= WINNING_SHOT_THRESHOLD) {
        newScore = WINNING_SHOT_THRESHOLD;
      }
    } else {
      if (newScore >= TARGET) {
        newScore = TARGET;
      }
    }

    const finalScore = newScore;

    setScores((prev) => {
      const next = [...prev];
      next[currentPlayer] = finalScore;
      return next;
    });

    if (!dramaticFinish && finalScore >= TARGET) {
      setWinner(currentPlayer);
      return;
    }

    advanceTurn();
  };

  const handleWinningShot = () => {
    if (winner !== null || !winningShot || !dramaticFinish) return;

    setScores((prev) => {
      const next = [...prev];
      next[currentPlayer] = TARGET;
      return next;
    });

    setWinner(currentPlayer);
  };

  return (
    <div style={styles.gameContainer}>
      <div style={styles.gameHeader}>
        <button style={styles.resetBtn} onClick={onReset}>
          ↩ New Game
        </button>
        <span style={styles.headerTitle}>COWBOY</span>
        <span style={styles.targetLabel}>{modeLabel}</span>
      </div>

      <div style={styles.rulesSummaryBar}>{rulesSummary}</div>

      <div style={styles.scoreboard}>
        {players.map((name, i) => {
          const isActive = i === currentPlayer;
          const isWinner = i === winner;
          const displayScore =
            isActive && winner === null ? projectedScore : scores[i];

          return (
            <div
              key={i}
              style={{
                ...styles.scoreCard,
                ...(isActive ? styles.scoreCardActive : {}),
                ...(isWinner ? styles.scoreCardWinner : {}),
              }}
            >
              {isWinner && <div style={styles.winnerBadge}>🏆 WINNER</div>}
              <div style={styles.playerName}>{name}</div>
              <div style={styles.playerScore}>{displayScore}</div>
              <div style={styles.scoreBar}>
                <div
                  style={{
                    ...styles.scoreBarFill,
                    width: `${Math.min((displayScore / TARGET) * 100, 100)}%`,
                    background: isWinner
                      ? "#f5c518"
                      : isActive
                      ? "#e8f4e8"
                      : "#5a8a6a",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {winner === null && (
        <>
          {winningShot && (
            <div style={{ ...styles.banner, ...styles.bannerGold }}>
              🎯 <strong>{players[currentPlayer]}</strong> is at{" "}
              {projectedScore} — only the <strong>Winning Shot</strong> counts!
              <div style={styles.bannerSub}>
                Carom off the 1 ball, sink the cue. Anything else is a scratch.
              </div>
            </div>
          )}

          {!winningShot && caromOnly && (
            <div style={{ ...styles.banner, ...styles.bannerAmber }}>
              ⚠️ <strong>{players[currentPlayer]}</strong> is at{" "}
              {projectedScore} —<strong> carom shots only!</strong>
              <div style={styles.bannerSub}>
                Sinking a ball counts as a scratch.
              </div>
            </div>
          )}

          {!caromOnly && !winningShot && (
            <div style={{ ...styles.banner, ...styles.bannerMuted }}>
              {infoBannerText}
            </div>
          )}

          <div style={styles.turnPanel}>
            <div style={styles.turnHeader}>
              <span style={styles.turnPlayerName}>
                {players[currentPlayer]}'s Turn
              </span>
              <span style={styles.turnScore}>
                Turn: <strong>+{turnPending}</strong>
              </span>
            </div>

            {flash && <div style={styles.flashMsg}>{flash}</div>}

            {winningShot ? (
              <div style={styles.winningShotContainer}>
                <p style={styles.winningShotInstructions}>
                  Carom off the{" "}
                  <strong style={{ color: "#e8d5a0" }}>1 ball</strong> and sink
                  the cue ball to win.
                </p>

                <button
                  style={styles.winningShotBtn}
                  onClick={handleWinningShot}
                >
                  🎱 Winning Shot!
                </button>

                <div style={styles.actionRow}>
                  <button style={styles.scratchBtn} onClick={() => scratch()}>
                    😬 Scratch
                  </button>
                  <button style={styles.endTurnBtn} onClick={endTurn}>
                    End Turn ✓
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={styles.sectionLabel}>SINK A BALL</div>
                <div style={styles.ballButtons}>
                  {BALLS.map((b) => (
                    <button
                      key={b.id}
                      style={{
                        ...styles.ballBtn,
                        opacity: caromOnly ? 0.65 : 1,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (caromOnly) {
                          scratch();
                        } else {
                          addPoints(b.points, `Ball ${b.label}`, "ball");
                        }
                      }}
                    >
                      <span style={styles.ballNum}>{b.label}</span>
                      <span style={styles.ballPts}>
                        {caromOnly
                          ? "SCRATCH"
                          : `+${b.points} pt${b.points > 1 ? "s" : ""}`}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={styles.sectionLabel}>CAROM SHOT</div>
                <div style={styles.caromButtons}>
                  {CAROMS.map((c) => (
                    <button
                      key={c.id}
                      style={styles.caromBtn}
                      onClick={() => addPoints(c.points, c.label, "carom")}
                    >
                      <span style={styles.caromLabel}>{c.label}</span>
                      <span style={styles.caromDesc}>{c.desc}</span>
                      <span style={styles.caromPts}>
                        +{c.points} pt{c.points > 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>

                {history.length > 0 && (
                  <div style={styles.historyRow}>
                    {history.map((h, i) => (
                      <span key={i} style={styles.historyChip}>
                        {h.label} +{h.pts}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {!winningShot && (
              <div style={styles.actionRow}>
                <button
                  style={{
                    ...styles.undoBtn,
                    opacity: history.length > 0 ? 1 : 0.35,
                  }}
                  disabled={history.length === 0}
                  onClick={undoLast}
                >
                  ↩ Undo
                </button>
                <button style={styles.scratchBtn} onClick={() => scratch()}>
                  😬 Scratch
                </button>
                <button style={styles.endTurnBtn} onClick={endTurn}>
                  End Turn ✓
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {winner !== null && (
        <div style={styles.winnerPanel}>
          <div style={styles.winnerEmoji}>🏆</div>
          <div style={styles.winnerText}>{players[winner]} wins!</div>
          <div style={styles.winnerScore}>Final Score: {scores[winner]}</div>
          <button style={styles.startBtn} onClick={onReset}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  setupContainer: {
    minHeight: "100vh",
    background: "#1a2e1f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
    padding: "20px",
  },
  setupCard: {
    background: "#243329",
    borderRadius: "20px",
    padding: "40px 32px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    border: "1px solid #3a5a42",
    textAlign: "center",
  },
  logoMark: { fontSize: "48px", marginBottom: "8px" },
  title: {
    color: "#e8d5a0",
    fontSize: "36px",
    fontWeight: "bold",
    letterSpacing: "10px",
    margin: "0 0 4px 0",
    fontFamily: "'Georgia', serif",
  },
  subtitle: {
    color: "#7a9a82",
    fontSize: "13px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    marginBottom: "24px",
  },
  rulesCard: {
    background: "#1d2a21",
    border: "1px solid #334f3a",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "18px",
    textAlign: "left",
  },
  rulesLabel: {
    color: "#7a9a82",
    fontSize: "11px",
    letterSpacing: "3px",
    marginBottom: "10px",
    fontWeight: "bold",
  },
  rulesToggle2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    marginBottom: "10px",
  },
  rulesToggleBtn: {
    background: "#243329",
    border: "1px solid #3a5a42",
    borderRadius: "10px",
    color: "#a0c0a8",
    padding: "10px 8px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  rulesToggleBtnActive: {
    background: "#e8d5a0",
    color: "#1a2e1f",
    border: "1px solid #e8d5a0",
    fontWeight: "bold",
  },
  rulesSummary: {
    color: "#e8d5a0",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "6px",
  },
  rulesHint: {
    color: "#7a9a82",
    fontSize: "12px",
    lineHeight: 1.4,
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "16px",
  },
  playerInputRow: { display: "flex", alignItems: "center", gap: "10px" },
  playerNum: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#3a5a42",
    color: "#e8d5a0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "bold",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "#1a2e1f",
    border: "1px solid #3a5a42",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#e8d5a0",
    fontSize: "15px",
    outline: "none",
    fontFamily: "'Georgia', serif",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#7a9a82",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px",
  },
  addBtn: {
    background: "none",
    border: "1px dashed #3a5a42",
    borderRadius: "10px",
    color: "#7a9a82",
    padding: "10px",
    width: "100%",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "20px",
    fontFamily: "'Georgia', serif",
  },
  startBtn: {
    background: "#e8d5a0",
    border: "none",
    borderRadius: "12px",
    color: "#1a2e1f",
    padding: "14px 32px",
    width: "100%",
    fontSize: "15px",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  gameContainer: {
    minHeight: "100vh",
    background: "#1a2e1f",
    fontFamily: "'Georgia', serif",
    display: "flex",
    flexDirection: "column",
    maxWidth: "480px",
    margin: "0 auto",
  },
  gameHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #3a5a42",
    background: "#243329",
  },
  resetBtn: {
    background: "none",
    border: "none",
    color: "#7a9a82",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  headerTitle: {
    color: "#e8d5a0",
    fontSize: "18px",
    letterSpacing: "6px",
    fontWeight: "bold",
  },
  targetLabel: { color: "#7a9a82", fontSize: "12px" },
  rulesSummaryBar: {
    background: "#1d2a21",
    borderBottom: "1px solid #33473a",
    color: "#e8d5a0",
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "8px 12px",
    letterSpacing: "0.5px",
  },
  scoreboard: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    padding: "16px",
    background: "#1a2e1f",
  },
  scoreCard: {
    flex: "1 1 120px",
    background: "#243329",
    borderRadius: "14px",
    padding: "14px",
    border: "2px solid transparent",
    position: "relative",
    minWidth: "100px",
  },
  scoreCardActive: { border: "2px solid #e8d5a0", background: "#2e4535" },
  scoreCardWinner: { border: "2px solid #f5c518", background: "#2e3520" },
  winnerBadge: {
    fontSize: "10px",
    color: "#f5c518",
    letterSpacing: "1px",
    marginBottom: "4px",
    fontWeight: "bold",
  },
  playerName: {
    color: "#a0c0a8",
    fontSize: "12px",
    letterSpacing: "1px",
    marginBottom: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  playerScore: {
    color: "#e8d5a0",
    fontSize: "32px",
    fontWeight: "bold",
    lineHeight: 1,
    marginBottom: "8px",
  },
  scoreBar: {
    height: "4px",
    background: "#1a2e1f",
    borderRadius: "2px",
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
  banner: {
    margin: "0 16px 0 16px",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    textAlign: "center",
  },
  bannerAmber: {
    background: "#3a2a10",
    border: "1px solid #7a5a20",
    color: "#e8c060",
  },
  bannerGold: {
    background: "#2e2a10",
    border: "1px solid #c8a820",
    color: "#f5d060",
  },
  bannerMuted: {
    background: "#233126",
    border: "1px solid #33473a",
    color: "#90ab98",
  },
  bannerSub: { fontSize: "11px", marginTop: "4px", opacity: 0.8 },
  turnPanel: {
    flex: 1,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  turnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#243329",
    borderRadius: "12px",
    padding: "12px 16px",
  },
  turnPlayerName: {
    color: "#e8d5a0",
    fontSize: "16px",
    fontWeight: "bold",
  },
  turnScore: { color: "#a0c0a8", fontSize: "14px" },
  flashMsg: {
    textAlign: "center",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#e8d5a0",
    letterSpacing: "4px",
    padding: "4px",
  },
  sectionLabel: {
    color: "#5a8a6a",
    fontSize: "11px",
    letterSpacing: "3px",
    fontWeight: "bold",
    paddingLeft: "2px",
  },
  ballButtons: { display: "flex", gap: "10px" },
  ballBtn: {
    flex: 1,
    background: "#2e4535",
    border: "2px solid #3a5a42",
    borderRadius: "14px",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    transition: "opacity 0.2s",
  },
  ballNum: { color: "#e8d5a0", fontSize: "28px", fontWeight: "bold" },
  ballPts: { color: "#7a9a82", fontSize: "12px" },
  caromButtons: { display: "flex", gap: "10px" },
  caromBtn: {
    flex: 1,
    background: "#2a3d4a",
    border: "2px solid #3a5566",
    borderRadius: "14px",
    padding: "14px 8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
  },
  caromLabel: { color: "#a0c8e0", fontSize: "13px", fontWeight: "bold" },
  caromDesc: { color: "#5a7a8a", fontSize: "10px", textAlign: "center" },
  caromPts: { color: "#a0c8e0", fontSize: "13px", fontWeight: "bold" },
  historyRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    padding: "8px",
    background: "#1e3028",
    borderRadius: "10px",
  },
  historyChip: {
    background: "#2e4535",
    color: "#a0c0a8",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "12px",
  },
  winningShotContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    padding: "20px 0",
  },
  winningShotInstructions: {
    color: "#a0a080",
    fontSize: "14px",
    textAlign: "center",
    lineHeight: 1.6,
    margin: 0,
  },
  winningShotBtn: {
    width: "100%",
    maxWidth: "360px",
    background: "linear-gradient(135deg, #c8a820, #f5d060)",
    border: "none",
    borderRadius: "16px",
    color: "#1a1a00",
    padding: "20px 24px",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
    boxShadow: "0 4px 20px rgba(200,168,32,0.4)",
    letterSpacing: "1px",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "auto",
    paddingTop: "8px",
    width: "100%",
  },
  undoBtn: {
    flex: 1,
    background: "#243329",
    border: "1px solid #3a5a42",
    borderRadius: "12px",
    color: "#a0c0a8",
    padding: "14px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  scratchBtn: {
    flex: 1,
    background: "#3a2020",
    border: "1px solid #5a3030",
    borderRadius: "12px",
    color: "#c08080",
    padding: "14px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  endTurnBtn: {
    flex: 1.5,
    background: "#e8d5a0",
    border: "none",
    borderRadius: "12px",
    color: "#1a2e1f",
    padding: "14px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  winnerPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "40px 20px",
  },
  winnerEmoji: { fontSize: "72px" },
  winnerText: {
    color: "#f5c518",
    fontSize: "32px",
    fontWeight: "bold",
    letterSpacing: "2px",
  },
  winnerScore: { color: "#7a9a82", fontSize: "16px", marginBottom: "16px" },
};

export default function App() {
  const [gameConfig, setGameConfig] = useState(null);

  if (!gameConfig) {
    return <PlayerSetup onStart={(config) => setGameConfig(config)} />;
  }

  return (
    <ScoreGame
      players={gameConfig.names}
      exact90={gameConfig.exact90}
      dramaticFinish={gameConfig.dramaticFinish}
      onReset={() => setGameConfig(null)}
    />
  );
}
