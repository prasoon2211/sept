"""
Base connector interface for database connections.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseConnector(ABC):
    """Abstract base class for database connectors."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    async def connect(self):
        """Establish connection to the database."""
        pass

    @abstractmethod
    async def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results."""
        pass

    @abstractmethod
    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema information for autocomplete."""
        pass

    @abstractmethod
    async def close(self):
        """Close the connection."""
        pass
