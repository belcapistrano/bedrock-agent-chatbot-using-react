// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useMock, setUseMock] = useState(true); // Default to mock responses
  const [lambdaUrl, setLambdaUrl] = useState(''); // URL for the Lambda function
  const messagesEndRef = useRef(null);
  const [sessionId, setSessionId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Create a new session ID when the component mounts
  useEffect(() => {
    setSessionId(generateSessionId());
    
    // Try to load lambda URL from localStorage
    const savedLambdaUrl = localStorage.getItem('lambdaUrl');
    if (savedLambdaUrl) {
      setLambdaUrl(savedLambdaUrl);
    }
    
    // Try to load mock setting from localStorage
    const savedUseMock = localStorage.getItem('useMock');
    if (savedUseMock !== null) {
      setUseMock(savedUseMock === 'true');
    }
  }, []);

  // Save lambda URL to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('lambdaUrl', lambdaUrl);
  }, [lambdaUrl]);
  
  // Save mock setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('useMock', useMock.toString());
    console.log("Mock setting changed to:", useMock);
  }, [useMock]);

  // Generate a random session ID
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle sending a message
  const handleSend = async () => {
    if (input.trim() === '') return;
    
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages([...messages, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    
    try {
      // Send to backend or use mock response
      const response = await sendToBedrock(currentInput);
      
      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error("Error calling assistant:", error);
      
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Map of predefined responses for common inputs
  const mockResponses = {
    "what is devops": "DevOps is a set of practices that combines software development (Dev) and IT operations (Ops). It aims to shorten the systems development life cycle and provide continuous delivery with high software quality. DevOps focuses on automation, collaboration, communication, and integration between developers and IT operations teams.",
    
    "tools for devops": "Common DevOps tools include:\n\n1. CI/CD: Jenkins, GitLab CI, GitHub Actions, CircleCI\n2. Configuration Management: Ansible, Chef, Puppet\n3. Containerization: Docker, Kubernetes, OpenShift\n4. Infrastructure as Code: Terraform, AWS CloudFormation\n5. Monitoring: Prometheus, Grafana, ELK Stack\n6. Version Control: Git, GitHub, GitLab, Bitbucket",
    
    "devops best practices": "DevOps best practices include:\n\n1. Continuous Integration/Continuous Delivery (CI/CD)\n2. Infrastructure as Code (IaC)\n3. Microservices architecture\n4. Monitoring and logging\n5. Automated testing\n6. Configuration management\n7. Security as code (DevSecOps)\n8. Collaboration and communication\n9. Incident management with post-mortems",
    
    "help": "I'm your DevOps assistant. You can ask me about:\n\n- DevOps principles and practices\n- CI/CD pipelines\n- Infrastructure as Code\n- Containerization\n- Cloud services\n- Monitoring and observability\n- DevSecOps\n\nJust type your question and I'll do my best to help!"
  };

  // Function to call Bedrock agent or return mock response
  const sendToBedrock = async (text) => {
    try {
      // Simulate network delay for both real and mock responses
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Log the current mode
      console.log("Current mode:", useMock ? "Mock" : "Lambda");
      
      // If using mock responses
      if (useMock) {
        console.log("Using mock response for:", text);
        
        // Check for predefined responses (case-insensitive)
        const lowerText = text.toLowerCase();
        for (const [key, value] of Object.entries(mockResponses)) {
          if (lowerText.includes(key.toLowerCase())) {
            return value;
          }
        }
        
        // Default response for anything else
        return `I'm your DevOps assistant. I understand you asked about "${text}". While we're setting up the connection to Amazon Bedrock, I can answer basic questions about DevOps. Try asking about "what is DevOps", "DevOps tools", or "DevOps best practices".`;
      }
      
      // For real Lambda calls
      if (!lambdaUrl) {
        return "Please enter a valid Lambda URL in the settings to use real responses.";
      }
      
      console.log("Calling Lambda function at:", lambdaUrl);
      
      // Call the Lambda function via API Gateway
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':import.meta.env.VITE_CHATBOT_API_KEY,
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId,
          // You can add agentId and agentAliasId here if needed
          agentId: import.meta.env.VITE_BEDROCK_AGENT_ID,
          agentAliasId: import.meta.env.VITE_BEDROCK_AGENT_ALIAS_ID,
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Lambda response:", data);
      
      // Return the message from the response
      return data.message || "The Lambda function didn't return a valid response.";
    } catch (error) {
      console.error("Error details:", error);
      return `Error calling Lambda function: ${error.message}. Please check your Lambda URL and connection.`;
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  return (
    <div className="app-container">
      <div className="chat-container">
        <div className="chat-header">
          <h1>DevOps AI Assistant</h1>
          <div className="settings-toggle" onClick={toggleSettings}>
            ⚙️ Settings
          </div>
        </div>
        
        {/* Settings Panel */}
        <div className={`settings-panel ${settingsOpen ? 'show' : ''}`}>
          <h3>Settings</h3>
          <div className="setting-row">
            <label>Use Mock Responses:</label>
            <div className="simple-toggle">
              <button 
                className={`toggle-btn ${useMock ? 'active' : ''}`} 
                onClick={() => setUseMock(true)}
              >
                On
              </button>
              <button 
                className={`toggle-btn ${!useMock ? 'active' : ''}`} 
                onClick={() => setUseMock(false)}
              >
                Off
              </button>
            </div>
          </div>
          <div className="setting-row">
            <label htmlFor="lambda-url">Lambda API URL:</label>
            <input
              id="lambda-url"
              type="text"
              value={lambdaUrl}
              onChange={(e) => setLambdaUrl(e.target.value)}
              placeholder="https://your-api-gateway-url"
              disabled={useMock}
              className={useMock ? 'disabled' : ''}
            />
          </div>
          <div className="setting-status">
            <div>Status: <strong>{useMock ? "Using mock responses" : (lambdaUrl ? "Using Lambda at " + lambdaUrl : "No Lambda URL set")}</strong></div>
          </div>
          <button onClick={toggleSettings} className="close-settings-btn">
            Close Settings
          </button>
        </div>
        
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Welcome to DevOps AI Assistant</h2>
              <p>Ask me anything about DevOps, CI/CD, infrastructure as code, or cloud services!</p>
              <p className="welcome-note">Currently using <strong>{useMock ? "mock responses" : "Lambda integration"}</strong>. You can change this in Settings ⚙️</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${message.isError ? 'error-message' : ''}`}
              >
                <div className="message-content">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="message assistant-message typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isTyping}
          />
          <button 
            onClick={handleSend} 
            disabled={isTyping || input.trim() === ''}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;