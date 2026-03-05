"""
Mock database for development when MongoDB is not available
"""
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

class MockDatabase:
    """Mock database implementation for development"""
    
    def __init__(self):
        self.data = {
            'users': [
                {
                    '_id': 'mock_user_1',
                    'email': 'test@example.com',
                    'username': 'testuser',
                    'name': 'Test User',
                    'password_hash': '$2b$12$no/ERgib2rr/ouY82ZZux.X8HVtqfMzuTN6.ocHJRDTMakDNY5dQa',  # 'password123'
                    'role': 'student',
                    'is_admin': False,
                    'created_at': '2024-01-01T00:00:00Z'
                },
                {
                    '_id': 'mock_user_2',
                    'email': 'teacher@example.com',
                    'username': 'teacher',
                    'name': 'Test Teacher',
                    'password_hash': '$2b$12$no/ERgib2rr/ouY82ZZux.X8HVtqfMzuTN6.ocHJRDTMakDNY5dQa',  # 'password123'
                    'role': 'teacher',
                    'is_admin': False,
                    'created_at': '2024-01-01T00:00:00Z'
                }
            ],
            'questions': [],
            'results': [],
            'assessments': [],
            'coding_problems': [],
            'batches': [
                {
                    '_id': 'batch_1',
                    'name': 'Computer Science Batch A',
                    'student_ids': ['mock_user_1'],
                    'created_at': '2024-01-01T00:00:00Z'
                }
            ],
            'badges': [],
            'teacher_assessments': [
                {
                    '_id': 'teacher_assessment_1',
                    'title': 'Python Programming Basics',
                    'topic': 'Python',
                    'difficulty': 'easy',
                    'question_count': 5,
                    'questions': [
                        {
                            'question': 'What is the correct way to declare a variable in Python?',
                            'options': ['var x = 5', 'x = 5', 'int x = 5', 'declare x = 5'],
                            'correct_answer': 1,
                            'explanation': 'In Python, variables are declared by simply assigning a value.'
                        }
                    ],
                    'batches': ['batch_1'],
                    'teacher_id': 'mock_user_2',
                    'type': 'mcq',
                    'created_at': '2024-01-01T00:00:00Z',
                    'is_active': True,
                    'status': 'published'
                }
            ],
            'teacher_assessment_results': [],
            'notifications': []
        }
        print("[MOCK_DB] Mock database initialized with sample users")
    
    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Mock find_one operation"""
        collection_name = getattr(self, '_collection_name', 'users')
        collection = self.data.get(collection_name, [])
        
        for item in collection:
            if self._matches_query(item, query):
                return item
        return None
    
    async def to_list(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Mock to_list operation"""
        collection_name = getattr(self, '_collection_name', 'users')
        collection = self.data.get(collection_name, [])
        if limit:
            return collection[:limit]
        return collection
    
    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Mock find operation"""
        collection_name = getattr(self, '_collection_name', 'users')
        collection = self.data.get(collection_name, [])
        
        results = []
        for item in collection:
            if self._matches_query(item, query):
                results.append(item)
        return results
    
    async def insert_one(self, document: Dict[str, Any]) -> Any:
        """Mock insert_one operation"""
        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id

        collection_name = getattr(self, '_collection_name', 'users')
        if collection_name not in self.data:
            self.data[collection_name] = []
        
        # Add mock ID
        document['_id'] = f"mock_id_{len(self.data[collection_name]) + 1}"
        self.data[collection_name].append(document)
        
        return InsertOneResult(document['_id'])
    
    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Any:
        """Mock update_one operation"""
        class UpdateResult:
            def __init__(self, modified_count):
                self.modified_count = modified_count

        collection_name = getattr(self, '_collection_name', 'users')
        collection = self.data.get(collection_name, [])
        
        for i, item in enumerate(collection):
            if self._matches_query(item, query):
                # Apply update
                if '$set' in update:
                    item.update(update['$set'])
                self.data[collection_name][i] = item
                return UpdateResult(1)
        return UpdateResult(0)
    
    async def count_documents(self, query: Dict[str, Any]) -> int:
        """Mock count_documents operation"""
        collection_name = getattr(self, '_collection_name', 'users')
        collection = self.data.get(collection_name, [])
        
        count = 0
        for item in collection:
            if self._matches_query(item, query):
                count += 1
        return count
    
    async def create_index(self, index_spec: List) -> None:
        """Mock create_index operation"""
        pass  # No-op for mock
    
    def _matches_query(self, item: Dict[str, Any], query: Dict[str, Any]) -> bool:
        """Check if item matches query"""
        for key, value in query.items():
            if key not in item:
                return False
            if item[key] != value:
                return False
        return True
    
    def __getattr__(self, name):
        """Dynamically create collection accessors"""
        if name in self.data:
            self._collection_name = name
            return self
        raise AttributeError(f"Collection '{name}' not found")

# Global mock database instance - this will persist data
mock_db = MockDatabase()

async def get_mock_db():
    """Get mock database instance"""
    return mock_db
