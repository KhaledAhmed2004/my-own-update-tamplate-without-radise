# Bookmark Module (Global)

## Overview

The Bookmark module lets users save any entity (Task, Product, Message, etc.) for quick access later. It is decoupled from specific modules using a polymorphic `target` + `targetModel` design.

## Features

- ✅ Add Bookmark: Save any entity to personal bookmark list
- ✅ Remove Bookmark: Remove bookmarks via toggle
- ✅ List Bookmarks: View all bookmarked entities
- ✅ Duplicate Prevention: Unique per user-target-model
- ✅ User Association: Bookmarks are tied to specific users

## API Endpoints

### Protected Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookmarks` | Toggle bookmark for a target |
| `GET` | `/api/bookmarks/my-bookmarks` | Get user's bookmarked entities |

## Data Models

### Bookmark Interface (Generic)

```typescript
export interface IBookmark {
  user: Types.ObjectId;     // User who bookmarked
  target: Types.ObjectId;   // Entity ID (Task/Product/Message/...)
  targetModel: string;      // Model name for refPath population
  createdAt?: Date;         // Created time
  updatedAt?: Date;         // Updated time
}
```

## Request/Response Examples

### Toggle Bookmark (Add/Remove)

Request:
```http
POST /api/bookmarks
Authorization: Bearer <token>
Content-Type: application/json
{
  "targetId": "507f1f77bcf86cd799439012",
  "targetModel": "Task"
}
```

Response (Add):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bookmark added successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "user": "507f1f77bcf86cd799439013",
    "target": "507f1f77bcf86cd799439012",
    "targetModel": "Task",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

Response (Remove):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bookmark removed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "user": "507f1f77bcf86cd799439013",
    "target": "507f1f77bcf86cd799439012",
    "targetModel": "Task"
  }
}
```

### List User Bookmarks

Request:
```http
GET /api/bookmarks/my-bookmarks?page=1&limit=10&targetModel=Task
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Bookmarks retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "user": "507f1f77bcf86cd799439013",
      "target": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Fix my laptop",
        "description": "Laptop screen flickering issue",
        "status": "pending",
        "taskCategory": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Electronics"
        }
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Service Methods

### Core Operations

- `toggle(userId: string, targetId: string, targetModel: string)` - Add/remove bookmark
- `listMine(userId: string, query?)` - Get user's bookmarks with pagination

## Database Schema

```javascript
const bookmarkSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: true
  },
  targetModel: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate bookmarks per model
bookmarkSchema.index({ user: 1, target: 1, targetModel: 1 }, { unique: true });
```

## Business Rules

### Bookmark Creation

1. Authentication required
2. Polymorphic target via `targetModel`
3. Duplicate prevention: unique (user, target, targetModel)
4. Self-bookmark allowed

### Bookmark Removal

1. Ownership: users remove their own bookmarks
2. Existence check handled by toggle

## Integration Points

### With Task Module
- Populates Task details automatically via `refPath`
- Optional filters: `targetModel=Task`, `category`, `searchTerm`

### With User Module
- Validates user authentication
- Associates bookmarks with user accounts

## Performance Considerations

1. Indexing:
   - Compound unique index on (user, target, targetModel)
   - Index on (user, createdAt) for efficient queries
2. Population:
   - Efficient dynamic population of target via `refPath`
3. Pagination:
   - All list operations support pagination

## Usage Examples

### Toggling a Bookmark

```typescript
import { BookmarkService } from './bookmark.service';

const { message, bookmark } = await BookmarkService.toggleBookmarkIntoDB(
  userId,
  taskId,
  'Task'
);
console.log(message, bookmark?._id);
```

### Listing User Bookmarks

```typescript
const query = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  targetModel: 'Task'
};

const { data, pagination } = await BookmarkService.getUserBookmarksFromDB(userId, query);
console.log(`User has ${data.length} bookmarked items`, pagination);
```
