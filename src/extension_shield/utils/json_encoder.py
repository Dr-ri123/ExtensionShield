"""
Safe JSON encoder utilities.

Handles circular references and non-serializable objects gracefully.
"""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


class SafeJSONEncoder(json.JSONEncoder):
    """JSON encoder that handles non-serializable objects gracefully."""
    
    def __init__(self, *args, seen=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen = seen or set()
    
    def default(self, obj):
        # Handle common non-serializable types
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        if hasattr(obj, '__dict__'):
            # Avoid circular references
            obj_id = id(obj)
            if obj_id in self._seen:
                return f"<circular ref: {type(obj).__name__}>"
            self._seen.add(obj_id)
            try:
                return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
            finally:
                self._seen.discard(obj_id)
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        if hasattr(obj, 'value'):  # Enum
            return obj.value
        # Fallback: convert to string
        try:
            return str(obj)
        except Exception:
            return f"<unserializable: {type(obj).__name__}>"


def safe_json_dumps(obj: Any, **kwargs) -> str:
    """Safely serialize object to JSON, handling circular references and non-serializable objects."""
    try:
        return json.dumps(obj, cls=SafeJSONEncoder, **kwargs)
    except (ValueError, TypeError, RecursionError) as e:
        logger.warning(f"[safe_json_dumps] Failed to serialize object: {e}")
        # Try without indent for simpler serialization
        try:
            return json.dumps(obj, cls=SafeJSONEncoder, default=str)
        except Exception as e2:
            logger.error(f"[safe_json_dumps] Complete serialization failure: {e2}")
            return json.dumps({"error": "Serialization failed", "type": str(type(obj))})


def safe_json_dump(obj: Any, fp, **kwargs) -> bool:
    """Safely dump object to file, handling circular references."""
    try:
        json_str = safe_json_dumps(obj, **kwargs)
        fp.write(json_str)
        return True
    except Exception as e:
        logger.error(f"[safe_json_dump] Failed to write JSON to file: {e}")
        return False


def sanitize_for_json(obj: Any) -> Any:
    """
    Sanitize object to ensure it's JSON-serializable without circular references.
    Uses JSON round-trip to break any circular refs.
    """
    try:
        # Use safe_json_dumps which handles circular references
        json_str = safe_json_dumps(obj)
        # Parse back to get clean dict
        return json.loads(json_str)
    except Exception as e:
        logger.warning(f"[sanitize_for_json] Failed to sanitize object: {e}")
        if isinstance(obj, dict):
            # Try to sanitize individual keys
            return {k: sanitize_for_json(v) for k, v in obj.items() if not callable(v)}
        elif isinstance(obj, (list, tuple)):
            return [sanitize_for_json(item) for item in obj]
        elif hasattr(obj, 'model_dump'):
            try:
                return obj.model_dump(mode="json")
            except Exception:
                return str(obj)
        elif isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        else:
            return str(obj)

