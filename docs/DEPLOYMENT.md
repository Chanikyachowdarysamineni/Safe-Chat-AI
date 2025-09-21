# Deployment Guide

This guide covers deploying SafeChat AI in production environments.

## Deployment Options

### 1. Docker Compose (Recommended)

The fastest way to deploy SafeChat AI is using Docker Compose.

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

#### Production Deployment

```bash
# Clone the repository
git clone https://github.com/your-username/safechat-ai.git
cd safechat-ai

# Create production environment file
cp .env.example .env.production

# Edit production configuration
nano .env.production

# Deploy with production compose file
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

#### Production Environment Variables

Create `.env.production`:

```env
# Environment
NODE_ENV=production
REACT_APP_ENVIRONMENT=production

# Security
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
MONGODB_URI=mongodb://mongodb:27017/safechat_prod

# Service URLs
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_SOCKET_URL=https://api.yourdomain.com
ML_SERVICE_URL=http://ml-service:8000

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/fullchain.pem
SSL_KEY_PATH=/etc/ssl/private/privkey.pem

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

### 2. Kubernetes Deployment

For high-availability production deployments.

#### Prerequisites
- Kubernetes 1.20+
- kubectl configured
- Helm 3.0+ (optional)

#### Kubernetes Manifests

Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: safechat-ai
```

Create `k8s/mongodb.yaml`:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: safechat-ai
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongodb-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: safechat-ai
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
```

Create `k8s/backend.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: safechat-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: safechat-ai/backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          value: "mongodb://mongodb:27017/safechat"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: ML_SERVICE_URL
          value: "http://ml-service:8000"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: safechat-ai
spec:
  selector:
    app: backend
  ports:
  - port: 5000
    targetPort: 5000
```

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic mongodb-secret \
  --from-literal=password=your-mongodb-password \
  -n safechat-ai

kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  -n safechat-ai

# Deploy services
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ml-service.yaml
kubectl apply -f k8s/frontend.yaml

# Check deployment status
kubectl get pods -n safechat-ai
```

---

### 3. Cloud Platform Deployment

#### AWS ECS Deployment

Create `ecs-task-definition.json`:
```json
{
  "family": "safechat-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/safechat-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:ssm:region:account:parameter/safechat/mongodb-uri"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/safechat-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Google Cloud Run Deployment

```bash
# Build and push to Container Registry
docker build -t gcr.io/PROJECT_ID/safechat-backend:latest ./backend
docker push gcr.io/PROJECT_ID/safechat-backend:latest

# Deploy to Cloud Run
gcloud run deploy safechat-backend \
  --image gcr.io/PROJECT_ID/safechat-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/safechat
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

Create `nginx/nginx.conf`:
```nginx
upstream backend {
    server backend:5000;
}

upstream ml-service {
    server ml-service:8000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        root /usr/share/nginx/html;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # ML Service
    location /ml/ {
        proxy_pass http://ml-service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Database Configuration

### MongoDB Production Setup

#### Replica Set Configuration

```bash
# Initialize replica set
mongo --eval "rs.initiate({
  _id: 'rs0',
  members: [
    {_id: 0, host: 'mongo1:27017'},
    {_id: 1, host: 'mongo2:27017'},
    {_id: 2, host: 'mongo3:27017'}
  ]
})"

# Create admin user
mongo admin --eval "db.createUser({
  user: 'admin',
  pwd: 'secure_password',
  roles: ['root']
})"

# Create application user
mongo safechat --eval "db.createUser({
  user: 'safechat_user',
  pwd: 'app_password',
  roles: ['readWrite']
})"
```

#### Database Indexing

```javascript
// Create indexes for optimal performance
db.messages.createIndex({ "timestamp": -1 })
db.messages.createIndex({ "userId": 1, "timestamp": -1 })
db.messages.createIndex({ "channelId": 1, "timestamp": -1 })
db.messages.createIndex({ "analysis.abuse.isAbusive": 1, "timestamp": -1 })
db.messages.createIndex({ "analysis.emotion.primary.type": 1 })

db.flags.createIndex({ "messageId": 1 })
db.flags.createIndex({ "status": 1, "createdAt": -1 })
db.flags.createIndex({ "type": 1, "createdAt": -1 })

db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })

// Text search indexes
db.messages.createIndex({ "content": "text" })
```

### MongoDB Atlas Setup

1. Create MongoDB Atlas cluster
2. Configure network access
3. Create database user
4. Get connection string
5. Update environment variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/safechat?retryWrites=true&w=majority
```

---

## Monitoring and Logging

### Prometheus and Grafana Setup

Create `monitoring/docker-compose.yml`:
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  prometheus_data:
  grafana_data:
```

### Application Metrics

Add to backend `package.json`:
```json
{
  "dependencies": {
    "prom-client": "^14.2.0"
  }
}
```

Add metrics endpoint:
```javascript
const client = require('prom-client');

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const messageAnalysisCounter = new client.Counter({
  name: 'message_analysis_total',
  help: 'Total number of messages analyzed',
  labelNames: ['abuse_detected', 'emotion_type']
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### Centralized Logging with ELK Stack

Create `logging/docker-compose.yml`:
```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

---

## Security Configuration

### Environment Security

```bash
# Create non-root user for containers
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Set proper file permissions
COPY --chown=nextjs:nodejs . .
```

### Firewall Configuration

```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers

Add to Nginx configuration:
```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

---

## Performance Optimization

### Caching with Redis

```yaml
# Add to docker-compose.prod.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

### CDN Configuration

Configure CloudFlare or AWS CloudFront:
- Enable gzip compression
- Set appropriate cache headers
- Configure image optimization
- Enable HTTP/2

### Database Optimization

```javascript
// Connection pool configuration
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
});
```

---

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="safechat"

# Create backup
mongodump --host mongodb:27017 --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/safechat_backup_$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "safechat_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: safechat_backup_$DATE.tar.gz"
```

### Automated Backup with Cron

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### Restore Process

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
DB_NAME="safechat"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Extract backup
tar -xzf $BACKUP_FILE

# Restore database
mongorestore --host mongodb:27017 --db $DB_NAME --drop ./dump/$DB_NAME

echo "Restore completed from $BACKUP_FILE"
```

---

## Health Checks and Monitoring

### Application Health Checks

```javascript
// health.js
const mongoose = require('mongoose');
const axios = require('axios');

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check database
  try {
    await mongoose.connection.db.admin().ping();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'unhealthy';
  }

  // Check ML service
  try {
    await axios.get(`${process.env.ML_SERVICE_URL}/health`, { timeout: 5000 });
    health.services.mlService = 'available';
  } catch (error) {
    health.services.mlService = 'unavailable';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Docker Health Checks

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

### Kubernetes Liveness and Readiness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Scaling Considerations

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: safechat-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Load Balancer Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-lb
  namespace: safechat-ai
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5000
    protocol: TCP
```

This deployment guide covers the essential aspects of deploying SafeChat AI in production. Adjust configurations based on your specific infrastructure requirements and security policies.