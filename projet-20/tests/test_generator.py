from src.generator import circle_method, schedule_with_names

def test_circle_basic():
    teams = [f"T{i}" for i in range(6)]
    sched = circle_method(list(range(len(teams))))
    assert len(sched) == 5
    assert all(len(r) == 3 for r in sched)
