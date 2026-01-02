# User Data API — Advanced Express.js Backend

An expert-level Express.js + TypeScript API demonstrating **advanced in-memory caching, rate limiting, concurrency control, and asynchronous processing**.  
Designed to handle **high-traffic scenarios efficiently** while maintaining clean architecture and strong type safety.

---

## Features Overview

- TypeScript-based Express server
- LRU in-memory cache with TTL (60s)
- Cache statistics (hits, misses, size, avg response time)
- Concurrent request deduplication
- Asynchronous request queue for DB simulation
- Advanced rate limiting with burst support
- Manual cache management endpoints
- User creation & caching
- Production-grade error handling

---

##  Tech Stack

- Node.js
- Express.js
- TypeScript
- In-memory LRU Cache
- Custom Async Queue
- Custom Rate Limiter

---

## Setup Instructions

```bash
npm install
npm run dev
```

Server runs at:
```
http://localhost:3000/
```

---

## API Endpoints

### POST /health
- Health check endpoint

### GET api/users/:id
- Returns cached data if available
- Otherwise simulates DB call (200ms)
- Concurrent requests are deduplicated

### POST api/users
- Creates and caches a new user

### PUT api/users/:id
- update an existing user details

### DELETE api/users/:id
- Delete an existing user

### DELETE api/cache
- Clears entire cache

### GET api/cache/status
- Returns cache metrics

### GET api/cache/queue
- Returns cache queue details

### DELETE api/cache/queue
- Clear cache queue details
---

## Caching Strategy

- LRU eviction
- TTL: 60 seconds
- Background cleanup of expired entries
- Cache hit/miss tracking

---

## Rate Limiting

- 10 requests per minute
- Burst: 5 requests per 10 seconds
- Returns HTTP 429 on limit exceed

---

## Asynchronous Processing

- Async queue for DB simulation
- Non-blocking request handling
- Stable under high traffic


