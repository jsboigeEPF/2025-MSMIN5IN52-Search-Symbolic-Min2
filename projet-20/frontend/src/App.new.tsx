import { useState, useMemo, useEffect } from "react";
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

// Tabs for navigation
type Tab = "config" | "calendar" | "statistics" | "details";

function scheduleToEvents(
  schedule: Round[],
  _matchDaysPerWeek: number = 1,
  startDate?: string
) {
  const start = startDate
    ? new Date(startDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      })();

  return schedule.flatMap((round) => {
    const targetDate = new Date(start);

    if (round.week_number !== undefined && round.day_of_week !== undefined) {
      targetDate.setDate(
        start.getDate() + (round.week_number - 1) * 7 + round.day_of_week
      );
    } else {
      targetDate.setDate(start.getDate() + (round.round_number - 1) * 7);
    }

    return round.matches.map((m, idx) => ({
      title: `${m.home} vs ${m.away}`,
      start: targetDate.toISOString().split("T")[0],
      backgroundColor: "#3b82f6",
      borderColor: "#2563eb",
      extendedProps: { round: round.round_number, matchIndex: idx },
    }));
  });
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });
  const [activeTab, setActiveTab] = useState<Tab>("config");

  const [teams, setTeams] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");
  const [roundsMode, setRoundsMode] = useState<"single" | "double">("single");
  const [maxTime, setMaxTime] = useState(30);
  const [matchDaysPerWeek, setMatchDaysPerWeek] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [randomTeamCount, setRandomTeamCount] = useState(6);

  const [schedule, setSchedule] = useState<Round[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const events = useMemo(
    () =>
      schedule.length > 0
        ? scheduleToEvents(schedule, matchDaysPerWeek, startDate)
        : [],
    [schedule, matchDaysPerWeek, startDate]
  );

  const addTeam = () => {
    const trimmed = teamInput.trim();
    if (trimmed && !teams.includes(trimmed)) {
      setTeams([...teams, trimmed]);
      setTeamInput("");
    }
  };

  const removeTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index));
  };

  const generateRandomTeams = () => {
    const count = Math.max(1, Math.min(100, randomTeamCount));
    const newTeams = Array.from({ length: count }, (_, i) => `Équipe ${i + 1}`);
    setTeams(newTeams);
  };

  const clearTeams = () => setTeams([]);

  const solve = async () => {
    if (teams.length < 2) {
      setError("Au moins 2 équipes sont nécessaires.");
      return;
    }
    setLoading(true);
    setError("");
    setSchedule([]);
    setStatistics(null);

    try {
      const response = await fetch(`${BACKEND_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams,
          rounds: roundsMode,
          max_time: maxTime,
          match_days_per_week: matchDaysPerWeek,
        }),
      });

      const data: SolveResponse = await response.json();
      if (data.success && data.rounds && data.statistics) {
        setSchedule(data.rounds);
        setStatistics(data.statistics);
        setActiveTab("calendar");
      } else {
        setError(data.message || "Erreur inconnue");
      }
    } catch (err) {
      setError("Erreur de communication avec le serveur.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const teamStatsArray = useMemo(() => {
    if (!statistics) return [];
    return Object.keys(statistics.breaks_per_team).map((team) => ({
      team,
      breaks: statistics.breaks_per_team[team],
      home: statistics.home_away_balance[team]?.home ?? 0,
      away: statistics.home_away_balance[team]?.away ?? 0,
      consec_away: statistics.consecutive_away[team] ?? 0,
      consec_home: statistics.consecutive_home[team] ?? 0,
      opponent_variety: statistics.opponent_variety[team] ?? 0,
      travel_distance: statistics.total_travel_distance[team] ?? 0,
    }));
  }, [statistics]);

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "dark bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <header
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-b sticky top-0 z-50 shadow-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-lg ${
                  darkMode ? "bg-blue-600" : "bg-blue-500"
                } flex items-center justify-center`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold">Tournament Scheduler</h1>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition-colors`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-b`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              {
                id: "config",
                label: "Configuration",
                icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
              },
              {
                id: "calendar",
                label: "Calendrier",
                icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
              },
              {
                id: "statistics",
                label: "Statistiques",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              },
              {
                id: "details",
                label: "Détails",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : `border-transparent ${
                        darkMode
                          ? "text-gray-400 hover:text-gray-300"
                          : "text-gray-500 hover:text-gray-700"
                      } hover:border-gray-300`
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={tab.icon}
                  />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Tab */}
        {activeTab === "config" && (
          <div className="space-y-6">
            <div
              className={`${
                darkMode ? "bg-gray-800" : "bg-white"
              } rounded-lg shadow-sm p-6`}
            >
              <h2 className="text-lg font-semibold mb-4">Équipes</h2>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTeam()}
                    placeholder="Nom de l'équipe"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <button
                    onClick={addTeam}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={randomTeamCount}
                    onChange={(e) =>
                      setRandomTeamCount(parseInt(e.target.value) || 1)
                    }
                    className={`w-24 px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <button
                    onClick={generateRandomTeams}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-200 hover:bg-gray-300"
                    } transition-colors`}
                  >
                    Générer équipes aléatoires
                  </button>
                  <button
                    onClick={clearTeams}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-red-400"
                        : "bg-gray-200 hover:bg-gray-300 text-red-600"
                    } transition-colors`}
                  >
                    Effacer tout
                  </button>
                </div>

                {teams.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          darkMode
                            ? "bg-gray-700 text-gray-200"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {team}
                        <button
                          onClick={() => removeTeam(index)}
                          className={`ml-2 ${
                            darkMode
                              ? "text-gray-400 hover:text-gray-200"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`${
                darkMode ? "bg-gray-800" : "bg-white"
              } rounded-lg shadow-sm p-6`}
            >
              <h2 className="text-lg font-semibold mb-4">Paramètres</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Type de tournoi
                  </label>
                  <select
                    value={roundsMode}
                    onChange={(e) =>
                      setRoundsMode(e.target.value as "single" | "double")
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="single">Simple (aller)</option>
                    <option value="double">Double (aller-retour)</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Temps maximum (secondes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxTime}
                    onChange={(e) => setMaxTime(parseInt(e.target.value) || 30)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Jours de match par semaine: {matchDaysPerWeek}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="7"
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
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Date de début (optionnel)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={solve}
              disabled={loading || teams.length < 2}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                loading || teams.length < 2
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {loading ? "Génération en cours..." : "Générer le calendrier"}
            </button>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div
            className={`${
              darkMode ? "bg-gray-800" : "bg-white"
            } rounded-lg shadow-sm p-6`}
          >
            {schedule.length > 0 ? (
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
                eventColor="#3b82f6"
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>
                  Aucun calendrier généré. Configurez et générez d'abord un
                  calendrier.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <div className="space-y-6">
            {statistics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className={`${
                      darkMode ? "bg-gray-800" : "bg-white"
                    } rounded-lg shadow-sm p-6`}
                  >
                    <div className="flex items-center">
                      <div className="shrink-0">
                        <svg
                          className="w-12 h-12 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Total Breaks
                        </p>
                        <p className="text-2xl font-bold">
                          {statistics.total_breaks}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${
                      darkMode ? "bg-gray-800" : "bg-white"
                    } rounded-lg shadow-sm p-6`}
                  >
                    <div className="flex items-center">
                      <div className="shrink-0">
                        <svg
                          className="w-12 h-12 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Équipes
                        </p>
                        <p className="text-2xl font-bold">{teams.length}</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${
                      darkMode ? "bg-gray-800" : "bg-white"
                    } rounded-lg shadow-sm p-6`}
                  >
                    <div className="flex items-center">
                      <div className="shrink-0">
                        <svg
                          className="w-12 h-12 text-purple-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Tours
                        </p>
                        <p className="text-2xl font-bold">{schedule.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`${
                    darkMode ? "bg-gray-800" : "bg-white"
                  } rounded-lg shadow-sm overflow-hidden`}
                >
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">
                      Statistiques par équipe
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead
                        className={darkMode ? "bg-gray-700" : "bg-gray-50"}
                      >
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Équipe
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Breaks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Domicile
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Extérieur
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Max Ext. Consec.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Variété Adv.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Déplacements
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          darkMode ? "divide-gray-700" : "divide-gray-200"
                        }`}
                      >
                        {teamStatsArray.map((stat, idx) => (
                          <tr
                            key={idx}
                            className={
                              darkMode
                                ? "hover:bg-gray-700"
                                : "hover:bg-gray-50"
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {stat.team}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.breaks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.home}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.away}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.consec_away}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.opponent_variety}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {stat.travel_distance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div
                className={`${
                  darkMode ? "bg-gray-800" : "bg-white"
                } rounded-lg shadow-sm p-12 text-center text-gray-500`}
              >
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p>
                  Aucune statistique disponible. Générez d'abord un calendrier.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div
            className={`${
              darkMode ? "bg-gray-800" : "bg-white"
            } rounded-lg shadow-sm p-6`}
          >
            {schedule.length > 0 ? (
              <RoundList schedule={schedule} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p>Aucun détail disponible. Générez d'abord un calendrier.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
