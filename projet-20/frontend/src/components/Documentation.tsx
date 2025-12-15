import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import "./Documentation.css";

type DocFile = {
  name: string;
  title: string;
  path: string;
};

const DOC_FILES: DocFile[] = [
  { name: "README", title: "📖 Guide Principal", path: "/docs/README.md" },
  {
    name: "ARCHITECTURE_TECHNIQUE",
    title: "🏗️ Architecture Technique",
    path: "/docs/ARCHITECTURE_TECHNIQUE.md",
  },
  { name: "DOCKER", title: "🐳 Docker", path: "/docs/DOCKER.md" },
  {
    name: "GUIDE_UTILISATION",
    title: "📚 Guide d'Utilisation",
    path: "/docs/GUIDE_UTILISATION.md",
  },
  {
    name: "FONCTIONNALITES",
    title: "✨ Fonctionnalités",
    path: "/docs/FONCTIONNALITES.md",
  },
  {
    name: "EQUIPES_IMPAIRES",
    title: "🔢 Équipes Impaires",
    path: "/docs/EQUIPES_IMPAIRES.md",
  },
  {
    name: "API_README",
    title: "🔌 API Documentation",
    path: "/docs/API_README.md",
  },
  {
    name: "STATISTIQUES_EQUITE",
    title: "📊 Statistiques",
    path: "/docs/STATISTIQUES_EQUITE.md",
  },
  {
    name: "LOGIQUE_JOURS_MATCH",
    title: "📅 Logique Jours Match",
    path: "/docs/LOGIQUE_JOURS_MATCH.md",
  },
];

export default function Documentation({ darkMode }: { darkMode: boolean }) {
  const [selectedDoc, setSelectedDoc] = useState<DocFile>(DOC_FILES[0]);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDocument(selectedDoc);
  }, [selectedDoc]);

  const loadDocument = async (doc: DocFile) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(doc.path);
      if (!response.ok) throw new Error("Document non trouvé");
      const text = await response.text();
      setContent(text);
    } catch (err) {
      setError("Impossible de charger le document");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`w-64 ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-r overflow-y-auto`}
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Documentation</h2>
          <nav className="space-y-1">
            {DOC_FILES.map((doc) => (
              <button
                key={doc.name}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedDoc.name === doc.name
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : darkMode
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {doc.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && (
          <article
            className={`
              prose prose-lg max-w-none
              ${darkMode ? "prose-invert" : ""}
              prose-headings:font-bold
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
              prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-6 prose-h2:border-b prose-h2:pb-2
              prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-5
              prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-4
              prose-p:text-base prose-p:leading-7 prose-p:mb-4
              prose-strong:font-bold prose-strong:text-blue-600 dark:prose-strong:text-blue-400
              prose-em:italic
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:my-2
              prose-code:text-sm
              prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:!bg-transparent prose-pre:!p-0 prose-pre:!m-0
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500
              prose-blockquote:pl-4 prose-blockquote:italic
              prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
              prose-a:text-blue-600 dark:prose-a:text-blue-400
              prose-a:underline prose-a:hover:text-blue-800 dark:prose-a:hover:text-blue-300
              prose-table:w-full prose-table:my-4
              prose-th:bg-gray-100 dark:prose-th:bg-gray-800
              prose-th:p-3 prose-th:text-left prose-th:font-semibold
              prose-td:p-3 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
              prose-hr:my-8 prose-hr:border-gray-300 dark:prose-hr:border-gray-700
            `}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
