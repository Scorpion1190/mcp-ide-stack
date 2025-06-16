const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

// MCP AI Integration
const MCP_CONFIG = {
  apiKey: process.env.MCP_API_KEY,
  baseURL: 'https://api.mcp.ai/v1',
  models: ['claude-3-sonnet', 'gpt-4', 'gemini-pro']
};

// MCP AI Assistant endpoint
app.post('/api/mcp/assist', async (req, res) => {
  try {
    const { prompt, model = 'claude-3-sonnet', context } = req.body;
    
    const response = await fetch(`${MCP_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MCP_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert coding assistant integrated into VS Code.' },
          { role: 'user', content: prompt }
        ],
        context: context
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('MCP API Error:', error);
    res.status(500).json({ error: 'MCP service unavailable' });
  }
});

// VS Code Web IDE routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ide.html'));
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('code-change', (data) => {
    socket.broadcast.emit('code-update', data);
  });
  
  socket.on('mcp-request', async (data) => {
    try {
      // Process MCP AI request
      const result = await processMCPRequest(data);
      socket.emit('mcp-response', result);
    } catch (error) {
      socket.emit('mcp-error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function processMCPRequest(data) {
  // MCP AI processing logic
  return {
    suggestion: 'AI-powered code suggestion',
    completion: data.code + '// AI completion',
    analysis: 'Code analysis complete'
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 MCP-IDE Server running on port ${PORT}`);
  console.log(`📝 IDE accessible at: http://localhost:${PORT}/ide`);
  console.log(`🤖 MCP AI Integration: ${MCP_CONFIG.apiKey ? 'ACTIVE' : 'PENDING API KEY'}`);
});
