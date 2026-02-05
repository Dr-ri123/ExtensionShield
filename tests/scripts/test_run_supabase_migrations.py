import hashlib
from pathlib import Path

from scripts.run_supabase_migrations import (
    compute_checksum,
    discover_migration_files,
    plan_migrations,
)


def test_discover_migration_files_filters_and_sorts(tmp_path: Path):
    # Valid migrations
    (tmp_path / "001_init.sql").write_text("-- 001")
    (tmp_path / "001b_rename.sql").write_text("-- 001b")
    (tmp_path / "002_add.sql").write_text("-- 002")
    (tmp_path / "010_more.sql").write_text("-- 010")

    # Invalid files (should be ignored)
    (tmp_path / "01_bad.sql").write_text("-- bad")
    (tmp_path / "abc.sql").write_text("-- bad")
    (tmp_path / "003_test.SQL").write_text("-- bad")
    (tmp_path / "001_init.txt").write_text("-- bad")

    files = discover_migration_files(tmp_path)
    names = [path.name for path in files]

    assert names == [
        "001_init.sql",
        "001b_rename.sql",
        "002_add.sql",
        "010_more.sql",
    ]


def test_compute_checksum_matches_sha256(tmp_path: Path):
    file_path = tmp_path / "001_init.sql"
    file_path.write_text("select 1;\n")

    expected = hashlib.sha256(file_path.read_bytes()).hexdigest()
    assert compute_checksum(file_path) == expected


def test_plan_migrations_skips_applied(tmp_path: Path):
    all_files = [tmp_path / "001_init.sql", tmp_path / "002_next.sql"]
    to_apply, skipped = plan_migrations(all_files, {"001_init.sql"})

    assert [path.name for path in to_apply] == ["002_next.sql"]
    assert [path.name for path in skipped] == ["001_init.sql"]

