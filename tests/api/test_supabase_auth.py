"""
Unit tests for Supabase JWT verification (issuer validation).

These tests mock the JWKS fetching and verify that:
- Tokens with correct issuer pass validation
- Tokens with wrong issuer fail validation (return None)
"""

import time
from unittest.mock import MagicMock, patch

import pytest
from jose import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


# Generate a test RSA key pair for signing/verifying JWTs
def _generate_test_keypair():
    """Generate an RSA key pair for testing."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    public_key = private_key.public_key()
    return private_key, public_key


def _private_key_to_pem(private_key) -> str:
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


def _public_key_to_jwk(public_key, kid: str = "test-kid") -> dict:
    """Convert public key to JWK format."""
    from jose.backends.cryptography_backend import CryptographyRSAKey
    
    # Get the public numbers
    numbers = public_key.public_numbers()
    
    import base64
    
    def _int_to_base64url(n: int, length: int) -> str:
        data = n.to_bytes(length, byteorder="big")
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")
    
    return {
        "kty": "RSA",
        "kid": kid,
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_base64url(numbers.n, 256),
        "e": _int_to_base64url(numbers.e, 3),
    }


def _create_test_token(
    private_key,
    sub: str = "test-user-id",
    aud: str = "authenticated",
    iss: str = "https://test-project.supabase.co/auth/v1",
    exp_offset: int = 3600,
    kid: str = "test-kid",
) -> str:
    """Create a signed JWT for testing."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "aud": aud,
        "iss": iss,
        "exp": now + exp_offset,
        "iat": now,
    }
    headers = {"kid": kid, "alg": "RS256"}
    private_pem = _private_key_to_pem(private_key)
    return jwt.encode(payload, private_pem, algorithm="RS256", headers=headers)


@pytest.fixture
def test_keypair():
    """Fixture providing a test RSA key pair."""
    return _generate_test_keypair()


@pytest.fixture
def mock_settings():
    """Fixture providing mock settings."""
    settings = MagicMock()
    settings.supabase_url = "https://test-project.supabase.co"
    settings.supabase_jwks_url = "https://test-project.supabase.co/auth/v1/.well-known/jwks.json"
    settings.supabase_jwt_aud = "authenticated"
    return settings


class TestVerifySupabaseAccessToken:
    """Tests for verify_supabase_access_token()."""

    def test_valid_token_with_correct_issuer_passes(self, test_keypair, mock_settings):
        """Token with correct issuer should pass validation."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with correct issuer
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://test-project.supabase.co/auth/v1",
        )
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                assert result is not None
                assert result["sub"] == "user-123"
                assert result["iss"] == "https://test-project.supabase.co/auth/v1"

    def test_token_with_wrong_issuer_fails(self, test_keypair, mock_settings):
        """Token with wrong issuer should fail validation (return None)."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with WRONG issuer (different Supabase project)
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://other-project.supabase.co/auth/v1",  # Wrong issuer!
        )
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                # Should return None due to issuer mismatch
                assert result is None

    def test_token_with_malformed_issuer_fails(self, test_keypair, mock_settings):
        """Token with malformed issuer should fail validation."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with malformed issuer (missing /auth/v1)
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://test-project.supabase.co",  # Missing /auth/v1
        )
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                assert result is None

    def test_expired_token_fails(self, test_keypair, mock_settings):
        """Expired token should fail validation."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create expired token
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://test-project.supabase.co/auth/v1",
            exp_offset=-3600,  # Expired 1 hour ago
        )
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                assert result is None

    def test_wrong_audience_fails(self, test_keypair, mock_settings):
        """Token with wrong audience should fail validation."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with wrong audience
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://test-project.supabase.co/auth/v1",
            aud="wrong-audience",
        )
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                assert result is None

    def test_audience_as_list_passes(self, test_keypair, mock_settings):
        """Token with audience as list should pass if expected aud is in the list."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with audience as list containing the expected audience
        now = int(time.time())
        payload = {
            "sub": "user-123",
            "aud": ["authenticated", "other-audience"],  # List with expected aud
            "iss": "https://test-project.supabase.co/auth/v1",
            "exp": now + 3600,
            "iat": now,
        }
        headers = {"kid": "test-kid", "alg": "RS256"}
        private_pem = _private_key_to_pem(private_key)
        token = jwt.encode(payload, private_pem, algorithm="RS256", headers=headers)
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import verify_supabase_access_token
                
                result = verify_supabase_access_token(token)
                
                assert result is not None
                assert result["sub"] == "user-123"


class TestGetCurrentUserId:
    """Tests for get_current_user_id()."""

    def test_valid_token_with_correct_issuer_returns_user_id(self, test_keypair, mock_settings):
        """get_current_user_id should return user_id for valid token with correct issuer."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with correct issuer
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://test-project.supabase.co/auth/v1",
        )
        
        # Mock FastAPI Request
        from fastapi import Request
        mock_request = MagicMock(spec=Request)
        mock_request.headers = {"Authorization": f"Bearer {token}"}
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import get_current_user_id
                
                user_id = get_current_user_id(mock_request)
                
                assert user_id == "user-123"

    def test_token_with_wrong_issuer_returns_none(self, test_keypair, mock_settings):
        """get_current_user_id should return None for token with wrong issuer (user_id None)."""
        private_key, public_key = test_keypair
        jwk_data = _public_key_to_jwk(public_key, kid="test-kid")
        
        # Create token with WRONG issuer (different Supabase project)
        token = _create_test_token(
            private_key,
            sub="user-123",
            iss="https://other-project.supabase.co/auth/v1",  # Wrong issuer!
        )
        
        # Mock FastAPI Request
        from fastapi import Request
        mock_request = MagicMock(spec=Request)
        mock_request.headers = {"Authorization": f"Bearer {token}"}
        
        with patch("extension_shield.api.supabase_auth.get_settings", return_value=mock_settings):
            with patch("extension_shield.api.supabase_auth._get_jwks_by_kid", return_value={"test-kid": jwk_data}):
                from extension_shield.api.supabase_auth import get_current_user_id
                
                user_id = get_current_user_id(mock_request)
                
                # Should return None due to issuer mismatch
                assert user_id is None


class TestGetExpectedIssuer:
    """Tests for _get_expected_issuer()."""

    def test_derives_issuer_from_supabase_url(self):
        """Should derive issuer from Supabase URL."""
        from extension_shield.api.supabase_auth import _get_expected_issuer
        
        assert _get_expected_issuer("https://abc123.supabase.co") == "https://abc123.supabase.co/auth/v1"

    def test_handles_trailing_slash(self):
        """Should handle trailing slash in Supabase URL."""
        from extension_shield.api.supabase_auth import _get_expected_issuer
        
        assert _get_expected_issuer("https://abc123.supabase.co/") == "https://abc123.supabase.co/auth/v1"

