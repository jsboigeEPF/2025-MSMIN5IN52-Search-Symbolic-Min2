from src.solver import run

def test_solver_runs():
    teams = [f"Team {c}" for c in ['A','B','C','D','E','F']]
    sched, obj = run(teams, 'single', max_time=5)
    assert sched is not None
    assert len(sched) == len(teams) - 1
