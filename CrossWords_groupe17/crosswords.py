import random

EMPTY = "."  # Caractère représentant une case vide dans la grille

class Crossword:
    """
    Classe représentant un générateur de mots croisés.

    Attributes:
        size (int): Taille de la grille (grille carrée).
        grid (list[list[str]]): Matrice représentant la grille.
        words (list[tuple]): Liste des mots placés et leurs positions (mot, x, y, direction).
    """

    def __init__(self, size):
        """
        Initialise une nouvelle grille vide pour le mot croisé.

        Args:
            size (int): Taille de la grille (par défaut 17x17).
        """
        self.size = size
        self.grid = [[EMPTY]*size for _ in range(size)]
        self.words = []

    # ---------------- DISPLAY ----------------
    def print_grid(self):
        """Affiche la grille dans la console avec les lettres et les cases vides."""
        for row in self.grid:
            print(" ".join(row))

    # ---------------- CHECKS ----------------
    def inside(self, x, y):
        """
        Vérifie si les coordonnées sont à l'intérieur de la grille.

        Args:
            x (int): Coordonnée horizontale.
            y (int): Coordonnée verticale.

        Returns:
            bool: True si les coordonnées sont valides, False sinon.
        """
        return 0 <= x < self.size and 0 <= y < self.size

    def letter(self, x, y):
        """
        Retourne la lettre à une position donnée.

        Args:
            x (int): Coordonnée horizontale.
            y (int): Coordonnée verticale.

        Returns:
            str | None: Lettre si elle existe, None si en dehors de la grille.
        """
        return self.grid[y][x] if self.inside(x, y) else None

    def can_place(self, word, x, y, dir):
        """
        Vérifie si un mot peut être placé à une position donnée dans une direction.

        Args:
            word (str): Mot à placer.
            x (int): Coordonnée x de départ.
            y (int): Coordonnée y de départ.
            dir (str): Direction "H" pour horizontal, "V" pour vertical.

        Returns:
            bool: True si le mot peut être placé, False sinon.
        """
        dx, dy = (1, 0) if dir == "H" else (0, 1)
        for i, c in enumerate(word):
            nx, ny = x + i*dx, y + i*dy

            # Vérifier si on dépasse de la grille
            if not self.inside(nx, ny):
                return False

            # Vérifier collision avec d'autres lettres
            if self.grid[ny][nx] not in (EMPTY, c):
                return False

            # Empêcher les lettres collées (règle des mots croisés)
            if self.grid[ny][nx] == EMPTY:
                for sx, sy in [(-dy, -dx), (dy, dx)]:
                    cx, cy = nx + sx, ny + sy
                    if self.inside(cx, cy) and self.grid[cy][cx] != EMPTY:
                        return False

        # Vérifier que le début et la fin du mot ne touchent pas d'autres lettres
        bx, by = x - dx, y - dy
        ex, ey = x + len(word)*dx, y + len(word)*dy
        if self.inside(bx, by) and self.grid[by][bx] != EMPTY:
            return False
        if self.inside(ex, ey) and self.grid[ey][ex] != EMPTY:
            return False

        return True

    # ---------------- PLACE ----------------
    def place(self, word, x, y, dir):
        """
        Place un mot dans la grille à une position donnée et enregistre sa position.

        Args:
            word (str): Mot à placer.
            x (int): Coordonnée x de départ.
            y (int): Coordonnée y de départ.
            dir (str): Direction "H" pour horizontal, "V" pour vertical.
        """
        dx, dy = (1, 0) if dir == "H" else (0, 1)
        for i, c in enumerate(word):
            self.grid[y + i*dy][x + i*dx] = c
        self.words.append((word, x, y, dir))

    # ---------------- GENERATION ----------------
    def try_cross(self, word):
        """
        Essaie de placer un mot en le croisant avec les mots déjà présents.

        Args:
            word (str): Mot à placer.

        Returns:
            bool: True si le mot a été placé, False sinon.
        """
        random.shuffle(self.words)
        for pw, px, py, pd in self.words:
            for i, c1 in enumerate(word):
                for j, c2 in enumerate(pw):
                    if c1 == c2:
                        if pd == "H":
                            x, y, d = px + j, py - i, "V"
                        else:
                            x, y, d = px - i, py + j, "H"
                        if self.can_place(word, x, y, d):
                            self.place(word, x, y, d)
                            return True
        return False

    def try_adjacent(self, word):
        """
        Essaie de placer un mot à un emplacement aléatoire si aucun croisement n'est possible.

        Args:
            word (str): Mot à placer.

        Returns:
            bool: True si le mot a été placé, False sinon.
        """
        for _ in range(10000):
            x = random.randint(0, self.size-1)
            y = random.randint(0, self.size-1)
            d = random.choice(["H", "V"])
            if self.can_place(word, x, y, d):
                self.place(word, x, y, d)
                return True
        return False

    def generate(self, words):
        """
        Génère la grille de mots croisés à partir d'une liste de mots.

        Args:
            words (list[str]): Liste des mots à placer.
        """
        words = sorted(words, key=len, reverse=True)

        # Placer le premier mot au centre
        first = words[0]
        x = (self.size - len(first)) // 2
        y = self.size // 2
        self.place(first, x, y, "H")

        # Placer les autres mots
        for word in words[1:]:
            if not self.try_cross(word):
                self.try_adjacent(word)

    # ---------------- SCORE (OPTIONNEL) ----------------
    def score(self):
        """
        Calcule un score indicatif de la grille.

        Score = nombre de mots * 10 + nombre de croisements * 15 - nombre de lettres placées

        Returns:
            int: Score de la grille.
        """
        letters = sum(cell != EMPTY for row in self.grid for cell in row)
        crossings = 0

        for y in range(self.size):
            for x in range(self.size):
                if self.grid[y][x] != EMPTY:
                    h = (x > 0 and self.grid[y][x-1] != EMPTY) or \
                        (x < self.size-1 and self.grid[y][x+1] != EMPTY)
                    v = (y > 0 and self.grid[y-1][x] != EMPTY) or \
                        (y < self.size-1 and self.grid[y+1][x] != EMPTY)
                    if h and v:
                        crossings += 1

        return len(self.words)*10 + crossings*15 - letters


# ---------------- EXEMPLE D'UTILISATION ----------------
words = [
    "PYTHON", "CODE", "IA", "ALGORITHME", "DONNEES", "LOGIQUE", "MOT", "CROISE",
    "BOUCLE", "FONCTION", "VARIABLE", "OBJET", "CLASSE", "INSTANCE", "TABLEAU",
    "CHAINE", "CONDITION", "OPERATION", "DEBUG", "COMPILATEUR", "SCRIPT", "RECURSION",
    "LISTE", "DICTIONNAIRE", "ENSEMBLE", "MODULE", "IMPORT", "EXCEPTION", "PROCEDURE"
]

cw = Crossword(size=17)
cw.generate(words)
cw.print_grid()

print("\nScore :", cw.score())
