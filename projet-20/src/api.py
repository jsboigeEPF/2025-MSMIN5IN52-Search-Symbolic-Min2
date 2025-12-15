"""API FastAPI pour le planificateur de tournois sportifs.
Lance avec: uvicorn src.api:app --reload
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import json

from .solver import run
from .visualize import export_json

app = FastAPI(
    title="Sports Tournament Scheduler API",
    description="API pour générer des calendriers de tournois sportifs avec optimisation des contraintes",
    version="1.0.0"
)

# Configuration CORS - permet tous les origins en développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (Docker, localhost, etc.)
    allow_credentials=False,  # Doit être False si allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles Pydantic
class SolveRequest(BaseModel):
    teams: List[str] = Field(..., description="Liste des noms des équipes", min_length=2)
    rounds: Literal['single', 'double'] = Field(default='single', description="Type de tournoi: simple ou double")
    max_time: int = Field(default=30, description="Temps maximum de résolution en secondes", ge=1, le=300)
    match_days_per_week: int = Field(default=1, description="Nombre de jours de match par semaine", ge=1, le=7)
    
    class Config:
        json_schema_extra = {
            "example": {
                "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"],
                "rounds": "single",
                "max_time": 30,
                "match_days_per_week": 1
            }
        }

class Match(BaseModel):
    home: str
    away: str

class Round(BaseModel):
    round_number: int
    matches: List[Match]
    week_number: Optional[int] = None  # Numéro de semaine (pour regroupement)
    day_of_week: Optional[int] = None  # Jour de la semaine (0=lundi, 6=dimanche)

class TeamStats(BaseModel):
    breaks: int
    home_matches: int
    away_matches: int
    max_consecutive_away: int
    max_consecutive_home: int

class Statistics(BaseModel):
    total_breaks: int
    breaks_per_team: dict[str, int]
    home_away_balance: dict[str, dict[str, int]]
    consecutive_away: dict[str, int]
    consecutive_home: dict[str, int]
    opponent_variety: dict[str, int]  # Nombre d'adversaires différents affrontés
    total_travel_distance: dict[str, int]  # Nombre de déplacements (matchs away)

class SolveResponse(BaseModel):
    success: bool
    objective: Optional[int] = Field(None, description="Nombre de breaks (à minimiser)")
    rounds: Optional[List[Round]] = None
    total_rounds: Optional[int] = None
    message: Optional[str] = None
    statistics: Optional[Statistics] = None

# Routes
@app.get("/")
async def root():
    """Point d'entrée de l'API"""
    return {
        "message": "Sports Tournament Scheduler API",
        "version": "1.0.0",
        "endpoints": {
            "/solve": "POST - Générer un calendrier de tournoi",
            "/health": "GET - Vérifier l'état de l'API",
            "/docs": "GET - Documentation interactive"
        }
    }

@app.get("/health")
async def health_check():
    """Vérification de l'état de l'API"""
    return {"status": "healthy", "service": "Sports Tournament Scheduler"}

@app.post("/solve", response_model=SolveResponse)
async def solve_tournament(request: SolveRequest):
    """
    Génère un calendrier de tournoi optimisé.
    
    - **teams**: Liste des équipes participantes (minimum 2)
    - **rounds**: 'single' pour aller simple, 'double' pour aller-retour
    - **max_time**: Temps maximum de calcul en secondes (1-300)
    
    Retourne le calendrier optimisé avec le nombre minimal de breaks.
    """
    try:
        # Validation
        if len(request.teams) < 2:
            raise HTTPException(
                status_code=400,
                detail="Au moins 2 équipes sont nécessaires"
            )
        
        if len(request.teams) != len(set(request.teams)):
            raise HTTPException(
                status_code=400,
                detail="Les noms d'équipes doivent être uniques"
            )
        
        # Résolution
        schedule, obj, stats = run(
            request.teams, 
            request.rounds, 
            request.max_time,
            request.match_days_per_week
        )
        
        if schedule is None:
            return SolveResponse(
                success=False,
                message="Aucune solution trouvée dans le temps imparti. Essayez d'augmenter max_time."
            )
        
        # Formatage de la réponse avec métadonnées de semaine
        rounds = []
        match_days = request.match_days_per_week
        
        for round_num, day in enumerate(schedule, start=1):
            matches = [Match(home=home, away=away) for (home, away) in day]
            
            # Calculer semaine et jour de la semaine
            # Distribuer les rounds sur les jours de match disponibles par semaine
            week_number = ((round_num - 1) // match_days) + 1
            day_index = (round_num - 1) % match_days
            
            # Mapper sur les jours de la semaine (0=lundi, 6=dimanche)
            # Si 1 jour/semaine : lundi (0)
            # Si 2 jours/semaine : lundi (0), jeudi (3)
            # Si 3 jours/semaine : lundi (0), mercredi (2), vendredi (4)
            # Si 7 jours/semaine : lundi-dimanche (0-6)
            if match_days == 1:
                day_of_week = 0  # Lundi
            elif match_days == 2:
                day_of_week = [0, 3][day_index]  # Lundi, Jeudi
            elif match_days == 3:
                day_of_week = [0, 2, 4][day_index]  # Lundi, Mercredi, Vendredi
            elif match_days == 4:
                day_of_week = [0, 2, 4, 6][day_index]  # Lundi, Mercredi, Vendredi, Dimanche
            else:
                # Pour 5-7 jours, distribuer uniformément
                day_of_week = day_index
            
            rounds.append(Round(
                round_number=round_num, 
                matches=matches,
                week_number=week_number,
                day_of_week=day_of_week
            ))
        
        # Formater les statistiques
        statistics = None
        if stats:
            statistics = Statistics(
                total_breaks=stats['total_breaks'],
                breaks_per_team=stats['breaks_per_team'],
                home_away_balance=stats['home_away_balance'],
                consecutive_away=stats['consecutive_away'],
                consecutive_home=stats['consecutive_home'],
                opponent_variety=stats.get('opponent_variety', {}),
                total_travel_distance=stats.get('total_travel_distance', {})
            )
        
        return SolveResponse(
            success=True,
            objective=obj,
            rounds=rounds,
            total_rounds=len(schedule),
            message=f"Calendrier généré avec succès. Nombre de breaks: {obj}",
            statistics=statistics
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du calendrier: {str(e)}"
        )

@app.post("/solve/export")
async def solve_and_export(request: SolveRequest):
    """
    Génère un calendrier et le retourne dans un format JSON prêt à l'export.
    """
    try:
        schedule, obj, stats = run(request.teams, request.rounds, request.max_time)
        
        if schedule is None:
            raise HTTPException(
                status_code=404,
                detail="Aucune solution trouvée"
            )
        
        # Format d'export
        export_data = {
            "teams": request.teams,
            "tournament_type": request.rounds,
            "objective": obj,
            "total_rounds": len(schedule),
            "schedule": [
                {
                    "round": round_num,
                    "matches": [
                        {"home": home, "away": away}
                        for (home, away) in day
                    ]
                }
                for round_num, day in enumerate(schedule, start=1)
            ]
        }
        
        return export_data
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'export: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
