"""
Tests for extension extraction (zip-bomb limits, zip-slip).
"""

import os
import zipfile
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from extension_shield.utils.extension import extract_extension_crx, _check_zip_bomb_limits


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield d


def test_zip_bomb_too_many_files(temp_dir):
    """Extract rejects zip when file count exceeds limit."""
    zip_path = os.path.join(temp_dir, "many.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("a.txt", b"a")
        zf.writestr("b.txt", b"b")
    settings = MagicMock()
    settings.zip_extract_max_files = 1
    settings.zip_extract_max_uncompressed_bytes = 10**9
    settings.extension_storage_path = temp_dir
    with patch("extension_shield.utils.extension.get_settings", return_value=settings):
        with pytest.raises(ValueError) as exc_info:
            extract_extension_crx(zip_path)
        assert "file count" in str(exc_info.value).lower()
        assert "zip-bomb" in str(exc_info.value).lower()


def test_zip_bomb_too_large_total_size(temp_dir):
    """Extract rejects zip when total uncompressed size exceeds limit."""
    zip_path = os.path.join(temp_dir, "large.zip")
    # One file of 1000 bytes; limit 500
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("big.txt", b"x" * 1000)
    settings = MagicMock()
    settings.zip_extract_max_files = 100
    settings.zip_extract_max_uncompressed_bytes = 500
    settings.extension_storage_path = temp_dir
    with patch("extension_shield.utils.extension.get_settings", return_value=settings):
        with pytest.raises(ValueError) as exc_info:
            extract_extension_crx(zip_path)
        assert "uncompressed size" in str(exc_info.value).lower() or "size" in str(exc_info.value).lower()
        assert "zip-bomb" in str(exc_info.value).lower()
