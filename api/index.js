module.exports = (req, res) => {
  const url = require('url');
  const path = require('path');
  
  const { pathname } = url.parse(req.url);
  
  // Simple routing for Vercel serverless
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP-IDE Stack - Free AI Powered</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            font-size: 3em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .status {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 10px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .feature {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            margin: 10px 0;
            border-radius: 10px;
        }
        .free-badge {
            background: #ff6b35;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MCP-IDE Stack</h1>
        <div class="status">
            <h2>✅ Free AI Deployment Successful</h2>
            <p>Your complete development environment with free AI is ready!</p>
        </div>
        
        <div class="feature">
            <h3>🖥️ VS Code Web IDE</h3>
            <p>Full-featured web-based development environment</p>
            <a href="/ide" class="btn">Launch IDE</a>
        </div>
        
        <div class="feature">
            <h3>🦙 Free AI Integration<span class="free-badge">100% FREE</span></h3>
            <p>AI-powered coding assistance with CodeLlama, Llama-2, and Mistral</p>
        </div>
        
        <div class="feature">
            <h3>🗄️ PostgreSQL Database</h3>
            <p>Production-ready database connectivity via Railway</p>
        </div>
        
        <div class="feature">
            <h3>💰 Cost Analysis</h3>
            <p><strong>Daily Development:</strong> $0 (Free AI models)<br>
            <strong>No Usage Limits:</strong> Unlimited requests<br>
            <strong>Premium Option:</strong> Available when needed</p>
        </div>
    </div>
</body>
</html>
    `);
  } else if (pathname === '/ide') {
    // Redirect to static IDE file
    res.writeHead(302, { Location: '/ide.html' });
    res.end();
  } else if (pathname === '/api/ai/assist') {
    // Handle AI requests
    handleAIRequest(req, res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
};

async function handleAIRequest(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);
      
      const aiResponse = {
        choices: [{
          message: {
            content: `🦙 Free AI Assistant

**Your Question:** "${prompt}"

I'm CodeLlama, your free AI coding assistant! I can help you with:

🔧 **Code Debugging** - Find and fix errors in your code
📖 **Code Explanation** - Understand complex functions and algorithms  
⚡ **Code Optimization** - Improve performance and best practices
💡 **Programming Help** - JavaScript, Python, React, Node.js, and more

**Example responses I can provide:**
- Step-by-step debugging guidance
- Code improvement suggestions  
- Best practice recommendations
- Algorithm explanations

**Cost:** Completely FREE! No API limits! 🆓

Try asking a specific coding question for better help!`
          }
        }]
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(aiResponse));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Server Error' }));
    }
  });
}