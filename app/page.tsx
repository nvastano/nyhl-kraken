"use client";

import { useEffect, useMemo, useState } from "react";
import { hasSheetsUrl, sheetsGet, sheetsPost } from "@/lib/sheets";
import { Player, RawPlayerRow, rowToPlayer } from "@/lib/types";
import {
  RotationState,
  benchOrder,
  createRotation,
  nextShift as advanceShift,
  toggleSitting,
} from "@/lib/rotation";

const MIN_SHIFT = 2;
const MAX_SHIFT = 6;
const STORAGE_KEY = "kraken-active-game-v1";

type SavedGame = {
  gameId: string | null;
  date: string;
  goalie: Player | null;
  rotation: RotationState;
};

function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGame;
  } catch {
    return null;
  }
}

function saveGame(game: SavedGame | null) {
  try {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — storage may be unavailable (private browsing, etc.)
  }
}

export default function GameDayPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [goalieHere, setGoalieHere] = useState(true);
  const [shiftSize, setShiftSize] = useState(4);

  const [game, setGame] = useState<SavedGame | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<RotationState | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);

  const skaters = useMemo(() => players.filter((p) => !p.isGoalie), [players]);
  const goalie = useMemo(() => players.find((p) => p.isGoalie) ?? null, [players]);

  useEffect(() => {
    const saved = loadSavedGame();
    // Restoring from localStorage on mount — not state derived from props,
    // so there's no way to do this outside an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setGame(saved);

    if (!hasSheetsUrl()) {
      setLoadError(
        "No Google Sheet connected yet. Deploy the Apps Script web app and set NEXT_PUBLIC_SHEETS_WEBAPP_URL (see README)."
      );
      setLoading(false);
      return;
    }

    sheetsGet("players")
      .then((rows: RawPlayerRow[]) => {
        const list = rows.map(rowToPlayer);
        setPlayers(list);
        const initialPresent: Record<string, boolean> = {};
        list
          .filter((p) => !p.isGoalie)
          .forEach((p) => (initialPresent[p.id] = true));
        setPresent(initialPresent);
      })
      .catch((err) => setLoadError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, []);

  function presentIds() {
    return skaters.filter((p) => present[p.id]).map((p) => p.id);
  }
  function presentNames() {
    return skaters.filter((p) => present[p.id]).map((p) => p.name);
  }

  async function startGame() {
    const names = presentNames();
    if (names.length < MIN_SHIFT) return;
    const date = new Date().toISOString().slice(0, 10);
    const rotation = advanceShift(createRotation(names, shiftSize));

    let gameId: string | null = null;
    try {
      const res = await sheetsPost("startGame", {
        date,
        shiftSize,
        presentPlayerIds: presentIds(),
        goalieId: goalieHere ? goalie?.id ?? null : null,
      });
      gameId = res?.id ?? null;
    } catch {
      setSyncWarning(true);
    }

    const next: SavedGame = {
      gameId,
      date,
      goalie: goalieHere ? goalie : null,
      rotation,
    };
    setGame(next);
    saveGame(next);
    if (gameId) logShift(gameId, rotation);
  }

  function logShift(gameId: string, rotation: RotationState) {
    const latest = rotation.history[0];
    if (!latest) return;
    sheetsPost("logShift", {
      gameId,
      shiftNumber: latest.n,
      playerNames: latest.players,
    }).catch(() => setSyncWarning(true));
  }

  function handleNextShift() {
    if (!game) return;
    setLastSnapshot(game.rotation);
    const rotation = advanceShift(game.rotation);
    const next = { ...game, rotation };
    setGame(next);
    saveGame(next);
    if (game.gameId) logShift(game.gameId, rotation);
  }

  function handleUndo() {
    if (!game || !lastSnapshot) return;
    const next = { ...game, rotation: lastSnapshot };
    setGame(next);
    saveGame(next);
    setLastSnapshot(null);
  }

  function handleSitToggle(name: string) {
    if (!game) return;
    setLastSnapshot(null);
    const rotation = toggleSitting(game.rotation, name);
    const next = { ...game, rotation };
    setGame(next);
    saveGame(next);
  }

  function handleShiftSizeChange(n: number) {
    if (!game) return;
    const next = { ...game, rotation: { ...game.rotation, shiftSize: n } };
    setGame(next);
    saveGame(next);
  }

  function handleEndGame() {
    if (game?.gameId) {
      sheetsPost("endGame", { gameId: game.gameId }).catch(() => setSyncWarning(true));
    }
    setGame(null);
    saveGame(null);
    setConfirmingEnd(false);
    setLastSnapshot(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-muted">
        <p className="font-display text-2xl">Loading roster…</p>
      </div>
    );
  }

  if (loadError && players.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-10">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {loadError}
        </div>
      </div>
    );
  }

  if (game) {
    const rotation = game.rotation;
    const bench = benchOrder(rotation);
    const sortedCounts = Object.keys(rotation.shiftCount).sort(
      (a, b) => (rotation.shiftCount[b] || 0) - (rotation.shiftCount[a] || 0)
    );

    return (
      <div className="flex flex-col gap-4 pb-32 pt-5">
        {syncWarning && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            Having trouble syncing to the Google Sheet — the tracker is still working locally.
          </div>
        )}

        {game.goalie && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-lg">
              🥅
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">In Net</div>
              <div className="font-display text-xl font-semibold leading-none">{game.goalie.name}</div>
            </div>
          </div>
        )}

        <div
          className="rounded-[18px] border border-accent/30 p-4 shadow-lg"
          style={{ background: "linear-gradient(165deg, rgba(79,217,196,0.14), var(--surface) 60%)" }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">On Ice Now</span>
            <span className="font-display text-sm tracking-wide text-muted">SHIFT {rotation.shiftNumber}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {rotation.onIce.length === 0 && (
              <p className="text-sm text-muted">Everyone&rsquo;s sitting out — toggle someone back in below.</p>
            )}
            {rotation.onIce.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-surface px-3 py-2 font-display text-lg font-semibold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Skaters per shift
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: MAX_SHIFT - MIN_SHIFT + 1 }, (_, i) => i + MIN_SHIFT).map((n) => (
              <button
                key={n}
                onClick={() => handleShiftSizeChange(n)}
                className={`flex-1 rounded-xl border py-2.5 text-center font-display text-xl font-semibold ${
                  rotation.shiftSize === n
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Bench Order</p>
          <div className="flex flex-col gap-2">
            {bench.map((name, i) => {
              const sitting = !!rotation.sitting[name];
              return (
                <div
                  key={name}
                  className={`flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 ${
                    sitting ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-muted">
                      {sitting ? "—" : i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      <div className="text-[11px] text-muted">
                        {sitting ? "Sitting out" : i === 0 ? "Up next" : `#${i + 1} in line`} ·{" "}
                        {rotation.shiftCount[name] || 0} shifts
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSitToggle(name)}
                    className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${
                      sitting
                        ? "border-transparent bg-danger/15 text-danger"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {sitting ? "Sitting" : "Sit out"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Shift Counts</p>
          <div className="flex flex-wrap gap-2">
            {sortedCounts.map((name) => (
              <div
                key={name}
                className={`flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 ${
                  rotation.sitting[name] ? "opacity-45" : ""
                }`}
              >
                <span className="text-[12.5px] font-semibold">{name}</span>
                <span className="tnum font-display text-base text-accent">{rotation.shiftCount[name] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {rotation.history.length > 0 && (
          <details className="rounded-2xl border border-border bg-surface p-4">
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              Shift History
            </summary>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {rotation.history.slice(0, 15).map((item) => (
                <div key={item.n} className="flex gap-2.5 border-b border-border py-1.5 text-sm last:border-none">
                  <span className="tnum w-7 shrink-0 font-display text-base text-muted">#{item.n}</span>
                  <span>{item.players.join(", ")}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        <button
          onClick={() => (confirmingEnd ? handleEndGame() : setConfirmingEnd(true))}
          onBlur={() => setConfirmingEnd(false)}
          className={`rounded-xl border py-2.5 text-sm font-semibold ${
            confirmingEnd
              ? "border-transparent bg-danger text-white"
              : "border-border bg-transparent text-muted"
          }`}
        >
          {confirmingEnd ? "Tap again to end game" : "End Game"}
        </button>

        <div
          className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-3"
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
            paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
            paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          }}
        >
          <div className="mx-auto flex max-w-lg gap-2.5">
            {lastSnapshot && (
              <button
                onClick={handleUndo}
                className="shrink-0 rounded-xl border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted active:scale-95"
              >
                ↶ Undo
              </button>
            )}
            <button
              onClick={handleNextShift}
              className="flex-1 rounded-xl bg-accent py-4 text-lg font-bold text-accent-ink shadow-lg active:scale-[0.98]"
            >
              Next Shift →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- pregame screen ----
  const presentCount = presentIds().length;
  const canStart = presentCount >= MIN_SHIFT;

  return (
    <div className="flex flex-col gap-4 py-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Game Day</h1>
        <p className="text-sm text-muted">Who&rsquo;s here today?</p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {loadError}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Goalie</p>
        {goalie ? (
          <button
            onClick={() => setGoalieHere((v) => !v)}
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 ${
              goalieHere ? "border-accent/40 bg-accent/10" : "border-border bg-background opacity-60"
            }`}
          >
            <span className="text-sm font-semibold">{goalie.name}</span>
            <span
              className={`relative h-6 w-[42px] shrink-0 rounded-full border ${
                goalieHere ? "border-accent bg-accent/15" : "border-border bg-surface-2"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                  goalieHere ? "left-5 bg-accent" : "left-0.5 bg-muted"
                }`}
              />
            </span>
          </button>
        ) : (
          <p className="text-sm text-muted">
            No goalie set yet — add one from the <span className="font-semibold text-foreground">Roster</span>{" "}
            page.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          Present skaters ({presentCount} of {skaters.length})
        </p>
        <div className="flex flex-col gap-2.5">
          {skaters.map((p) => {
            const on = !!present[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setPresent((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-3 ${
                  on ? "border-accent/40 bg-accent/10" : "border-border bg-background opacity-60"
                }`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span
                  className={`relative h-6 w-[42px] shrink-0 rounded-full border ${
                    on ? "border-accent bg-accent/15" : "border-border bg-surface-2"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                      on ? "left-5 bg-accent" : "left-0.5 bg-muted"
                    }`}
                  />
                </span>
              </button>
            );
          })}
          {skaters.length === 0 && (
            <p className="text-sm text-muted">
              No skaters yet — add your roster on the <span className="font-semibold text-foreground">Roster</span>{" "}
              page.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Skaters per shift</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: MAX_SHIFT - MIN_SHIFT + 1 }, (_, i) => i + MIN_SHIFT).map((n) => {
            const disabled = n > presentCount;
            return (
              <button
                key={n}
                disabled={disabled}
                onClick={() => setShiftSize(n)}
                className={`flex-1 rounded-xl border py-2.5 text-center font-display text-xl font-semibold disabled:opacity-25 ${
                  shiftSize === n ? "border-accent bg-accent/15 text-accent" : "border-border bg-background"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={startGame}
        disabled={!canStart}
        className="rounded-xl bg-accent py-4 text-lg font-bold text-accent-ink shadow-lg active:scale-[0.98] disabled:opacity-40"
      >
        Start Game →
      </button>
      {presentCount > 0 && presentCount < MIN_SHIFT && (
        <p className="text-center text-xs text-muted">Need at least {MIN_SHIFT} skaters present.</p>
      )}
    </div>
  );
}
