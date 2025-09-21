# API Documentation

## SafeChat AI API Reference

This document provides comprehensive API documentation for the SafeChat AI backend service.

**Base URL**: `http://localhost:5000/api`

**API Version**: v1

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Headers Required
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (for protected routes)

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "moderator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "moderator",
    "createdAt": "2023-12-01T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```

**Status Codes:**
- `201` - User created successfully
- `400` - Invalid input data
- `409` - User already exists

---

### Login User

**POST** `/auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "moderator"
  },
  "token": "jwt_token_here"
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `400` - Missing required fields

---

## Message Endpoints

### Analyze Message

**POST** `/messages/analyze`

Analyze a message for abuse detection and emotion analysis.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "This is a message to analyze",
  "userId": "user123",
  "channelId": "channel456",
  "messageId": "msg789"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "generated_message_id",
    "content": "This is a message to analyze",
    "userId": "user123",
    "channelId": "channel456",
    "analysis": {
      "abuse": {
        "isAbusive": false,
        "type": null,
        "confidence": 0.02,
        "categories": {
          "harassment": 0.01,
          "hate_speech": 0.02,
          "threats": 0.00,
          "bullying": 0.01,
          "spam": 0.03,
          "sexual_content": 0.00
        }
      },
      "emotion": {
        "primary": {
          "type": "joy",
          "intensity": 0.75,
          "confidence": 0.89
        },
        "secondary": [
          {
            "type": "surprise",
            "intensity": 0.23,
            "confidence": 0.67
          }
        ]
      }
    },
    "timestamp": "2023-12-01T10:30:00Z",
    "flagged": false
  }
}
```

**Status Codes:**
- `200` - Analysis completed successfully
- `400` - Invalid input data
- `401` - Authentication required
- `503` - ML service unavailable

---

### Get Messages

**GET** `/messages`

Retrieve messages with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Messages per page
- `flagged` (boolean) - Filter flagged messages only
- `userId` (string) - Filter by user ID
- `channelId` (string) - Filter by channel ID
- `startDate` (ISO date) - Filter from date
- `endDate` (ISO date) - Filter to date

**Example Request:**
```
GET /api/messages?page=1&limit=10&flagged=true&startDate=2023-12-01T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_id",
      "content": "Message content",
      "userId": "user_id",
      "channelId": "channel_id",
      "analysis": { /* analysis object */ },
      "flagged": true,
      "timestamp": "2023-12-01T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalMessages": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Message by ID

**GET** `/messages/:id`

Retrieve a specific message by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_id",
    "content": "Message content",
    "userId": "user_id",
    "channelId": "channel_id",
    "analysis": { /* analysis object */ },
    "flagged": true,
    "timestamp": "2023-12-01T10:30:00Z"
  }
}
```

**Status Codes:**
- `200` - Message found
- `404` - Message not found
- `401` - Authentication required

---

## Flag Management Endpoints

### Create Flag

**POST** `/flags`

Create a flag for a message.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "messageId": "msg_id",
  "type": "harassment",
  "reason": "User reported offensive language",
  "severity": "high",
  "reporterId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "flag": {
    "id": "flag_id",
    "messageId": "msg_id",
    "type": "harassment",
    "reason": "User reported offensive language",
    "severity": "high",
    "reporterId": "user_id",
    "status": "pending",
    "createdAt": "2023-12-01T10:30:00Z"
  }
}
```

---

### Get Flags

**GET** `/flags`

Retrieve flags with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Flags per page
- `status` (string) - Filter by status (pending, reviewed, resolved)
- `type` (string) - Filter by abuse type
- `severity` (string) - Filter by severity (low, medium, high)

**Response:**
```json
{
  "success": true,
  "flags": [
    {
      "id": "flag_id",
      "messageId": "msg_id",
      "type": "harassment",
      "status": "pending",
      "severity": "high",
      "createdAt": "2023-12-01T10:30:00Z",
      "message": {
        "content": "Flagged message content",
        "userId": "user_id"
      }
    }
  ],
  "pagination": { /* pagination object */ }
}
```

---

### Update Flag Status

**PUT** `/flags/:id/status`

Update the status of a flag.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "resolved",
  "moderatorNote": "Reviewed and action taken"
}
```

**Response:**
```json
{
  "success": true,
  "flag": {
    "id": "flag_id",
    "status": "resolved",
    "moderatorNote": "Reviewed and action taken",
    "reviewedAt": "2023-12-01T11:00:00Z",
    "reviewedBy": "moderator_id"
  }
}
```

---

## Dashboard Endpoints

### Get Dashboard Statistics

**GET** `/dashboard/stats`

Retrieve comprehensive dashboard statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeRange` (string) - Time range: '24h', '7d', '30d', '90d' (default: '24h')
- `timezone` (string) - Timezone offset (default: UTC)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalMessages": 15847,
    "flaggedMessages": 234,
    "totalUsers": 1205,
    "activeUsers": 89,
    "abuseStats": {
      "total": 234,
      "types": {
        "harassment": 45,
        "spam": 89,
        "hate_speech": 23,
        "threats": 12,
        "bullying": 34,
        "sexual_content": 31
      }
    },
    "emotionStats": {
      "anger": 156,
      "fear": 78,
      "sadness": 203,
      "joy": 1205,
      "surprise": 187,
      "neutral": 2890
    },
    "trends": {
      "messagesOverTime": [
        { "date": "2023-12-01", "count": 1200 },
        { "date": "2023-12-02", "count": 1350 }
      ],
      "flagsOverTime": [
        { "date": "2023-12-01", "count": 23 },
        { "date": "2023-12-02", "count": 18 }
      ]
    },
    "timeRange": "24h",
    "lastUpdated": "2023-12-01T12:00:00Z"
  }
}
```

---

### Get Recent Activity

**GET** `/dashboard/activity`

Get recent flagged messages and user activity.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (number, default: 10) - Number of recent items
- `type` (string) - Activity type: 'flags', 'messages', 'all'

**Response:**
```json
{
  "success": true,
  "recentFlags": [
    {
      "id": "flag_id",
      "messageId": "msg_id",
      "type": "harassment",
      "confidence": 0.95,
      "content": "Flagged message content",
      "timestamp": "2023-12-01T11:45:00Z",
      "status": "pending"
    }
  ],
  "recentMessages": [
    {
      "id": "msg_id",
      "content": "Recent message",
      "emotionType": "anger",
      "emotionIntensity": 0.8,
      "timestamp": "2023-12-01T11:50:00Z"
    }
  ]
}
```

---

## User Management Endpoints

### Get Users

**GET** `/users`

Retrieve users with pagination and filtering.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Users per page
- `role` (string) - Filter by role
- `status` (string) - Filter by status

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "moderator",
      "status": "active",
      "lastLogin": "2023-12-01T10:00:00Z",
      "createdAt": "2023-11-01T10:00:00Z"
    }
  ],
  "pagination": { /* pagination object */ }
}
```

---

### Update User

**PUT** `/users/:id`

Update user information.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "admin",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "Updated Name",
    "email": "john@example.com",
    "role": "admin",
    "status": "active",
    "updatedAt": "2023-12-01T12:00:00Z"
  }
}
```

---

## Health Check Endpoints

### Health Check

**GET** `/health`

Check service health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T12:00:00Z",
  "services": {
    "database": "connected",
    "mlService": "available",
    "redis": "connected"
  },
  "version": "1.0.0"
}
```

---

## WebSocket Events

The API also supports real-time updates via WebSocket connections.

### Connection

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Server to Client Events

- `message_flagged` - New message flagged
- `flag_updated` - Flag status updated
- `stats_updated` - Dashboard statistics updated
- `user_activity` - User activity updates

#### Client to Server Events

- `join_room` - Join monitoring room
- `leave_room` - Leave monitoring room

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Invalid or missing token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `ML_SERVICE_ERROR` - ML service unavailable
- `DATABASE_ERROR` - Database connection issue

---

## Rate Limiting

API endpoints are rate limited:

- **Authentication endpoints**: 5 requests per minute
- **Analysis endpoints**: 100 requests per minute
- **Dashboard endpoints**: 60 requests per minute
- **Other endpoints**: 1000 requests per hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const SafeChatAPI = require('safechat-api-client');

const client = new SafeChatAPI({
  baseURL: 'http://localhost:5000/api',
  token: 'your_jwt_token'
});

// Analyze a message
const result = await client.messages.analyze({
  content: 'Message to analyze',
  userId: 'user123',
  channelId: 'channel456'
});

console.log(result.analysis);
```

### Python

```python
import safechat

client = safechat.Client(
    base_url='http://localhost:5000/api',
    token='your_jwt_token'
)

# Analyze a message
result = client.messages.analyze(
    content='Message to analyze',
    user_id='user123',
    channel_id='channel456'
)

print(result.analysis)
```

---

For more information and examples, visit our [GitHub repository](https://github.com/your-username/safechat-ai) or contact our support team.