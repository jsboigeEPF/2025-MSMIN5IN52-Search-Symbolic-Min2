import { useState, useMemo, type JSX } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import RoundList from "./components/RoundList";

// Types conformes au backend API
type Match = { home: string; away: string };
type Round = {
  round_number: number;
  matches: Match[];
  week_number?: number;
  day_of_week?: number;
};
type TeamStats = {
  breaks: number;
  home_matches: number;
  away_matches: number;
  max_consecutive_away: number;
  max_consecutive_home: number;
};
type Statistics = {
  total_breaks: number;
  breaks_per_team: { [key: string]: number };
  home_away_balance: { [key: string]: { home: number; away: number } };
  consecutive_away: { [key: string]: number };
  consecutive_home: { [key: string]: number };
  opponent_variety: { [key: string]: number };
  total_travel_distance: { [key: string]: number };
};
type SolveResponse = {
  success: boolean;
  objective?: number;
  rounds?: Round[];
  total_rounds?: number;
  message?: string;
  statistics?: Statistics;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

function scheduleToEvents(
  schedule: Round[],
  matchDaysPerWeek: number = 1,
  startDate?: string
) {
  const start = startDate
    ? new Date(startDate)
    : (() => {
        const d = new Date();
        const day = d.getDay();
        const daysToNextMon = (8 - day) % 7 || 7;
        d.setDate(d.getDate() + daysToNextMon);
        d.setHours(10, 0, 0, 0);
        return d;
      })();
  const events: any[] = [];

  for (let r = 0; r < schedule.length; r++) {
    const round = schedule[r];

    // Utiliser les métadonnées du backend si disponibles
    let targetDate: Date;
    if (round.week_number !== undefined && round.day_of_week !== undefined) {
      // Utiliser week_number et day_of_week du backend
      targetDate = new Date(start);
      targetDate.setDate(
        start.getDate() + (round.week_number - 1) * 7 + round.day_of_week
      );
    } else {
      // Fallback : calculer manuellement (ancien comportement)
      const daysPerRound = Math.floor(7 / matchDaysPerWeek);
      targetDate = new Date(start);
      targetDate.setDate(start.getDate() + r * daysPerRound);
    }

    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      const date = new Date(targetDate);
      date.setHours(10 + (m % 8), 0, 0, 0);
      events.push({
        id: `${r}-${m}`,
        title: `${match.home} vs ${match.away}`,
        start: date.toISOString(),
        extendedProps: {
          round: round.round_number,
          week: round.week_number,
          home: match.home,
          away: match.away,
        },
      });
    }
  }
  return events;
}

export default function App(): JSX.Element {
  const [teams, setTeams] = useState<string[]>([
    "PSG",
    "OM",
    "Lyon",
    "Monaco",
    "Lille",
    "Rennes",
  ]);
  const [teamInput, setTeamInput] = useState<string>("");
  const [schedule, setSchedule] = useState<Round[] | null>(null);
  const [objective, setObjective] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [roundsMode, setRoundsMode] = useState<"single" | "double">("single");
  const [maxTime, setMaxTime] = useState<number>(30);
  const [numRandomTeams, setNumRandomTeams] = useState<number>(6);
  const [matchDaysPerWeek, setMatchDaysPerWeek] = useState<number>(1);

  const events = useMemo(
    () => (schedule ? scheduleToEvents(schedule, matchDaysPerWeek) : []),
    [schedule, matchDaysPerWeek]
  );

  async function callSolve() {
    if (teams.length < 2) {
      alert("Il faut au moins 2 équipes.");
      return;
    }
    // Supporter maintenant les équipes impaires avec bye automatique
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams,
          rounds: roundsMode,
          max_time: maxTime,
          match_days_per_week: matchDaysPerWeek,
        }),
      });
      const payload: SolveResponse = await res.json();
      if (!res.ok) {
        alert("Erreur backend: " + (payload.message ?? res.statusText));
        return;
      }
      if (payload.success && payload.rounds) {
        setSchedule(payload.rounds);
        setObjective(payload.objective ?? null);
        setTotalRounds(payload.total_rounds ?? null);
        setMessage(payload.message ?? "Calendrier généré avec succès !");
        setStatistics(payload.statistics ?? null);
      } else {
        setMessage(payload.message ?? "Aucune solution trouvée.");
        setSchedule(null);
        setStatistics(null);
      }
    } catch (err) {
      alert("Impossible de contacter le backend: " + String(err));
      setMessage("Erreur de connexion au backend.");
    } finally {
      setLoading(false);
    }
  }

  function addTeam() {
    const trimmed = teamInput.trim();
    if (!trimmed) return;
    if (teams.includes(trimmed)) {
      alert("Cette équipe existe déjà.");
      return;
    }
    setTeams([...teams, trimmed]);
    setTeamInput("");
  }

  function removeTeam(index: number) {
    setTeams(teams.filter((_, i) => i !== index));
  }

  function flipMatch(rIndex: number, mIndex: number) {
    if (!schedule) return;
    const copy = schedule.map((r) => ({
      round_number: r.round_number,
      matches: r.matches.map((m) => ({ ...m })),
    }));
    const m = copy[rIndex].matches[mIndex];
    const tmp = m.home;
    m.home = m.away;
    m.away = tmp;
    setSchedule(copy);
  }

  function exportJSON() {
    if (!schedule) return alert("Pas de calendrier à exporter");
    const blob = new Blob(
      [
        JSON.stringify(
          { schedule, teams, objective, totalRounds, message },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule_export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadSample() {
    setTeams(["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"]);
    setSchedule(null);
    setObjective(null);
    setTotalRounds(null);
    setMessage("");
    setStatistics(null);
  }

  function loadSampleOdd() {
    setTeams(["PSG", "OM", "Lyon", "Monaco", "Lille"]);
    setSchedule(null);
    setObjective(null);
    setTotalRounds(null);
    setMessage("");
    setStatistics(null);
  }

  function generateRandomTeams() {
    const count = numRandomTeams;
    if (count < 2 || count > 15001) {
      alert("Le nombre d'équipes doit être entre 2 et 100");
      return;
    }
    const newTeams: string[] = [];
    for (let i = 1; i <= count; i++) {
      newTeams.push(`Équipe ${i}`);
    }
    setTeams(newTeams);
    setSchedule(null);
    setObjective(null);
    setTotalRounds(null);
    setMessage("");
    setStatistics(null);
  }

  function reset() {
    setSchedule(null);
    setObjective(null);
    setTotalRounds(null);
    setMessage("");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🏆 Sports Tournament Scheduler
              </h1>
              <p className="text-gray-600 mt-2">
                Optimisation par programmation de contraintes (CP-SAT)
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Frontend: React + Vite
              </div>
              <div className="text-sm text-gray-500">
                Backend: FastAPI + OR-Tools
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panneau de configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Gestion des équipes */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">⚽</span> Équipes ({teams.length})
              </h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTeam()}
                  placeholder="Nom de l'équipe"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addTeam}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {teams.map((team, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-700">{team}</span>
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={loadSample}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  6 équipes (paire)
                </button>
                <button
                  onClick={loadSampleOdd}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  5 équipes (impaire)
                </button>
              </div>

              {/* Générateur d'équipes aléatoires */}
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎲 Générer des équipes aléatoires
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={numRandomTeams}
                    onChange={(e) =>
                      setNumRandomTeams(parseInt(e.target.value) || 6)
                    }
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="range"
                    min="2"
                    max="400"
                    value={numRandomTeams}
                    onChange={(e) =>
                      setNumRandomTeams(parseInt(e.target.value))
                    }
                    className="flex-1"
                  />
                  <button
                    onClick={generateRandomTeams}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
                  >
                    Générer
                  </button>
                </div>
              </div>
            </div>

            {/* Paramètres de résolution */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">⚙️</span> Paramètres
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de tournoi
                  </label>
                  <select
                    value={roundsMode}
                    onChange={(e) =>
                      setRoundsMode(e.target.value as "single" | "double")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="single">Simple (aller)</option>
                    <option value="double">Double (aller-retour)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temps max (secondes): {maxTime}s
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={maxTime}
                    onChange={(e) => setMaxTime(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5s</span>
                    <span>120s</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Jours de match par semaine: {matchDaysPerWeek}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    step="1"
                    value={matchDaysPerWeek}
                    onChange={(e) =>
                      setMatchDaysPerWeek(parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 jour</span>
                    <span>7 jours</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Permet d'espacer les matchs dans le calendrier
                  </p>
                </div>

                <button
                  onClick={callSolve}
                  disabled={loading || teams.length < 2}
                  className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Résolution en cours...
                    </span>
                  ) : (
                    "🚀 Générer le calendrier"
                  )}
                </button>

                {schedule && (
                  <button
                    onClick={reset}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Métriques */}
            {schedule && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📊</span> Résultats
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium">
                      Breaks (à minimiser)
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {objective ?? "N/A"}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">
                      Nombre de journées
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {totalRounds ?? schedule.length}
                    </div>
                  </div>
                  {message && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-sm text-purple-700">{message}</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={exportJSON}
                  className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  📥 Exporter JSON
                </button>
              </div>
            )}
          </div>

          {/* Panneau principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendrier FullCalendar */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📅</span> Vue Calendrier
              </h2>
              {schedule ? (
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={events}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek",
                  }}
                  height="auto"
                  eventColor="#4F46E5"
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">📅</div>
                  <p>Générez un calendrier pour voir la vue en mode planning</p>
                </div>
              )}
            </div>

            {/* Liste des journées */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📋</span> Journées de championnat
              </h2>
              <RoundList schedule={schedule} onFlip={flipMatch} />
            </div>

            {/* Statistiques détaillées */}
            {statistics && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📊</span> Statistiques de
                  l'optimisation
                </h2>

                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-gray-800">
                    {statistics.total_breaks}
                  </div>
                  <div className="text-sm text-gray-600">
                    Nombre total de breaks (changements domicile/extérieur)
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Équipe
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Breaks
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Domicile
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Extérieur
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Déplacements
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Adversaires
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Max Ext. consécutifs
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          Max Dom. consécutifs
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => {
                        const breaks = statistics.breaks_per_team[team] || 0;
                        const balance = statistics.home_away_balance[team] || {
                          home: 0,
                          away: 0,
                        };
                        const consAway = statistics.consecutive_away[team] || 0;
                        const consHome = statistics.consecutive_home[team] || 0;
                        const travelDistance =
                          statistics.total_travel_distance?.[team] || 0;
                        const opponentVariety =
                          statistics.opponent_variety?.[team] || 0;

                        return (
                          <tr
                            key={team}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {team}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded ${
                                  breaks === 0
                                    ? "bg-green-100 text-green-700"
                                    : breaks <= 2
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {breaks}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-blue-600 font-medium">
                              {balance.home}
                            </td>
                            <td className="px-4 py-3 text-center text-purple-600 font-medium">
                              {balance.away}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-orange-100 text-orange-700">
                                🚗 {travelDistance}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                                🎯 {opponentVariety}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded ${
                                  consAway <= 2
                                    ? "bg-green-100 text-green-700"
                                    : consAway === 3
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {consAway}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded ${
                                  consHome <= 2
                                    ? "bg-green-100 text-green-700"
                                    : consHome === 3
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {consHome}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                  <p>
                    <strong>Légende :</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      <strong>Breaks :</strong> Changements de statut
                      domicile/extérieur entre journées consécutives
                    </li>
                    <li>
                      <strong>Domicile/Extérieur :</strong> Nombre de matchs à
                      domicile ou à l'extérieur
                    </li>
                    <li>
                      <strong>Déplacements 🚗 :</strong> Nombre total de matchs
                      à l'extérieur (contrainte d'équité)
                    </li>
                    <li>
                      <strong>Adversaires 🎯 :</strong> Nombre d'adversaires
                      différents affrontés (variété)
                    </li>
                    <li>
                      <strong>Max consécutifs :</strong> Nombre maximum de
                      matchs consécutifs du même type
                    </li>
                  </ul>
                </div>

                {/* Détail des journées par équipe */}
                {schedule && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      📅 Détail des journées par équipe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map((team) => {
                        // Calculer les journées à domicile, extérieur et repos
                        const homeDays: number[] = [];
                        const awayDays: number[] = [];
                        const byeDays: number[] = [];

                        schedule.forEach((round) => {
                          let hasMatch = false;
                          let isHome = false;

                          round.matches.forEach((match) => {
                            if (match.home === team) {
                              hasMatch = true;
                              isHome = true;
                            } else if (match.away === team) {
                              hasMatch = true;
                              isHome = false;
                            }
                          });

                          if (!hasMatch) {
                            byeDays.push(round.round_number);
                          } else if (isHome) {
                            homeDays.push(round.round_number);
                          } else {
                            awayDays.push(round.round_number);
                          }
                        });

                        return (
                          <div
                            key={team}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="font-semibold text-gray-800 mb-3">
                              {team}
                            </div>

                            <div className="space-y-2 text-xs">
                              <div>
                                <div className="font-medium text-blue-700 mb-1">
                                  🏠 Domicile ({homeDays.length})
                                </div>
                                <div className="text-gray-600">
                                  {homeDays.length > 0
                                    ? `J${homeDays.join(", J")}`
                                    : "Aucun"}
                                </div>
                              </div>

                              <div>
                                <div className="font-medium text-purple-700 mb-1">
                                  ✈️ Extérieur ({awayDays.length})
                                </div>
                                <div className="text-gray-600">
                                  {awayDays.length > 0
                                    ? `J${awayDays.join(", J")}`
                                    : "Aucun"}
                                </div>
                              </div>

                              {byeDays.length > 0 && (
                                <div>
                                  <div className="font-medium text-green-700 mb-1">
                                    😴 Repos ({byeDays.length})
                                  </div>
                                  <div className="text-gray-600">
                                    J{byeDays.join(", J")}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
