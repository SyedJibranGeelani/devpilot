"""
Tests for /health and /analyze routes.
"""


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_missing_path(client):
    response = client.post("/analyze", json={"project_path": "/nonexistent/path/xyz"})
    assert response.status_code == 400


def test_analyze_valid_path(client, tmp_path):
    # Create a minimal project structure
    (tmp_path / "main.py").write_text("def hello(): pass\n")
    (tmp_path / "README.md").write_text("# Test project\n")

    response = client.post("/analyze", json={"project_path": str(tmp_path)})
    assert response.status_code == 200
    data = response.json()
    assert data["codebase"]["total_files"] >= 1
    assert data["deploy"]["readiness_score"] is not None
