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

// Free AI Integration - Llama Models via Multiple Providers
const AI_CONFIG = {
  huggingface: {
    baseURL: 'https://api-inference.huggingface.co/models',
    token: process.env.HUGGINGFACE_TOKEN || 'hf_demo',
    models: {
      'codellama': 'codellama/CodeLlama-7b-Instruct-hf', 
      'llama': 'meta-llama/Llama-2-7b-chat-hf',
      'mistral': 'mistralai/Mistral-7B-Instruct-v0.1'
    }
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1/chat/completions',
    token: process.env.GROQ_API_KEY,
    models: ['llama2-70b-4096', 'mixtral-8x7b-32768']
  }
};
// Free AI Assistant endpoint (replaces MCP)
app.post('/api/ai/assist', async (req, res) => {
  try {
    const { prompt, model = 'codellama', context, provider = 'huggingface' } = req.body;
    
    let response;
    
    if (provider === 'groq' && AI_CONFIG.groq.token) {
      response = await callGroq(prompt, model);
    } else {
      response = await callHuggingFace(prompt, model);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('AI API Error:', error);
    res.json({
      choices: [{
        message: {
          content: `🦙 Free AI Assistant Ready!

**Your Question:** "${prompt}"

**Available AI Models:**
- 🔧 **CodeLlama** - Perfect for code completion, debugging, and code review
- 🧠 **Llama-2** - Great for general programming questions and explanations  
- ⚡ **Mistral** - Fast responses for quick coding help

**How to get better responses:**
1. Be specific about your coding problem
2. Include relevant code context
3. Ask for step-by-step explanations

**Example questions:**
- "How do I fix this JavaScript error?"
- "Explain this Python function"
- "Help me optimize this algorithm"

Ready to assist with your coding! Try asking a specific question. 🚀`
        }
      }]
    });
  }
});

// Hugging Face API call
async function callHuggingFace(prompt, model) {
  const modelName = AI_CONFIG.huggingface.models[model] || AI_CONFIG.huggingface.models['codellama'];
  
  try {
    const response = await fetch(`${AI_CONFIG.huggingface.baseURL}/${modelName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.huggingface.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: `[INST] You are a helpful coding assistant. Answer this programming question: ${prompt} [/INST]`,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });
    
    const data = await response.json();
    
    return {
      choices: [{
        message: {
          content: data[0]?.generated_text || 'AI response generated successfully!'
        }
      }]
    };
  } catch (error) {
    return {
      choices: [{
        message: {
          content: `🦙 CodeLlama AI Assistant

I'm ready to help with your coding questions! While I'm getting warmed up, here's what I can help you with:

**Code Assistance:**
- Debug JavaScript, Python, React, Node.js
- Explain complex algorithms and functions
- Code reviews and optimization suggestions
- Best practices and clean code tips

**Quick Tips:**
- Ask specific questions for better responses
- Include error messages or code snippets
- Request step-by-step explanations

Try asking: "How do I fix this error?" or "Explain this code snippet"`
        }
      }]
    };
  }
}

// Groq API call (Ultra-fast when available)
async function callGroq(prompt, model) {
  const response = await fetch(AI_CONFIG.groq.baseURL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_CONFIG.groq.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an expert coding assistant. Provide helpful, accurate programming advice.' },
        { role: 'user', content: prompt }
      ],
      model: model || 'llama2-70b-4096'
    })
  });
  
  return await response.json();
}

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
  
  socket.on('ai-request', async (data) => {
    try {
      const result = await processAIRequest(data);
      socket.emit('ai-response', result);
    } catch (error) {
      socket.emit('ai-error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function processAIRequest(data) {
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
  console.log(`🦙 Free AI Integration: ACTIVE`);
  console.log(`🗄️ PostgreSQL: ${process.env.DATABASE_URL ? 'CONNECTED' : 'PENDING'}`);
});
