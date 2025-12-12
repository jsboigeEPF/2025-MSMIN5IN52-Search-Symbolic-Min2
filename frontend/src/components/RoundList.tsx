type Match = { home: string; away: string };
type Round = { round_number: number; matches: Match[] };

export default function RoundList({
  schedule,
  onFlip,
}: {
  schedule: Round[] | null;
  onFlip: (rIndex: number, mIndex: number) => void;
}) {
  if (!schedule)
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📋</div>
        <p>Aucun calendrier pour l'instant</p>
        <p className="text-sm mt-1">
          Générez un calendrier pour voir les journées
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {schedule.map((round, ri) => (
        <div
          key={round.round_number}
          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 font-semibold flex items-center">
            <span className="mr-2">🏁</span>
            Journée {round.round_number}
          </div>
          <ul className="divide-y divide-gray-100">
            {round.matches.map((match, mi) => (
              <li
                key={mi}
                className="px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center space-x-3">
                  <span className="font-semibold text-gray-800">
                    {match.home}
                  </span>
                  <span className="text-gray-400 text-sm">vs</span>
                  <span className="font-semibold text-gray-800">
                    {match.away}
                  </span>
                </span>
                <button
                  className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded-md transition-colors font-medium"
                  onClick={() => onFlip(ri, mi)}
                  title="Inverser domicile/extérieur"
                >
                  ⇄ Inverser
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
