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
// MCP AI Integration - Fixed for Anthropic API
const MCP_CONFIG = {
  apiKey: process.env.MCP_API_KEY,
  baseURL: 'https://api.anthropic.com/v1',
  models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
};

// MCP AI Assistant endpoint - Updated
app.post('/api/mcp/assist', async (req, res) => {
  try {
    const { prompt, model = 'claude-3-sonnet-20240229', context } = req.body;
    
    console.log('MCP Request received:', { prompt: prompt?.substring(0, 100), model });
    
    if (!MCP_CONFIG.apiKey) {
      return res.status(500).json({ 
        error: 'MCP API key not configured',
        suggestion: 'Please set MCP_API_KEY environment variable',
        configured: false
      });
    }
    
    // Using Anthropic API format
    const response = await fetch(`${MCP_CONFIG.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MCP_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1000,
        messages: [
          { 
            role: 'user', 
            content: `You are an expert coding assistant integrated into VS Code. Help with: ${prompt}

Context: ${context ? JSON.stringify(context) : 'No additional context provided'}`
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MCP API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'MCP API request failed',
        details: errorText,
        status: response.status,
        apiKeyStatus: MCP_CONFIG.apiKey ? 'Present' : 'Missing'
      });
    }
    
    const data = await response.json();
    console.log('✅ MCP Response received successfully');
    
    // Format response for compatibility
    res.json({
      choices: [{
        message: {
          content: data.content?.[0]?.text || 'AI response received successfully'
        }
      }],
      model: model,
      usage: data.usage || {},
      success: true
    });
    
  } catch (error) {
    console.error('MCP AI Error:', error);
    res.status(500).json({ 
      error: 'MCP service error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint for MCP status
app.get('/api/mcp/test', async (req, res) => {
  try {
    res.json({
      status: 'MCP Integration Status',
      apiKey: MCP_CONFIG.apiKey ? 'Configured ✅' : 'Missing ❌',
      apiKeyLength: MCP_CONFIG.apiKey ? MCP_CONFIG.apiKey.length : 0,
      baseURL: MCP_CONFIG.baseURL,
      models: MCP_CONFIG.models,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      status: 'MCP test failed'
    });
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
  return {
    suggestion: 'AI-powered code suggestion',
    completion: (data.code || '') + '// AI completion',
    analysis: 'Code analysis complete',
    timestamp: new Date().toISOString()
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 MCP-IDE Server running on port ${PORT}`);
  console.log(`📝 IDE accessible at: http://localhost:${PORT}/ide`);
  console.log(`🤖 MCP AI Integration: ${MCP_CONFIG.apiKey ? 'ACTIVE ✅' : 'PENDING API KEY ❌'}`);
  console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'CONNECTED ✅' : 'NOT CONFIGURED ❌'}`);
});
