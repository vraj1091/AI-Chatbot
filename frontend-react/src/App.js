import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    setLoading(true);
    
    try {
      let response;
      let newMessage;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (input.trim()) {
          formData.append('message', input);
        }

        console.log('Sending image:', {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type
        });
        
        response = await fetch(`${BACKEND_URL}/chat/image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Unknown error'}`);
        }

        const data = await response.json();
        newMessage = {
          type: 'user',
          content: input || 'Uploaded an image',
          image: URL.createObjectURL(selectedFile),
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, newMessage, {
          type: 'bot',
          content: data.response,
          info: data.image_info,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        setSelectedFile(null);
        
      } else {
        console.log('Sending text message:', input);
        
        response = await fetch(`${BACKEND_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: input }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Unknown error'}`);
        }

        const data = await response.json();
        newMessage = {
          type: 'user',
          content: input,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, newMessage, {
          type: 'bot',
          content: data.response,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

      setInput('');
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = error.message;
      
      if (errorMessage.includes('cannot identify image')) {
        errorMessage = 'Image format not supported. Please try uploading a JPEG, PNG, or GIF image.';
      } else if (errorMessage.includes('Network')) {
        errorMessage = `Cannot connect to backend at ${BACKEND_URL}. Make sure the backend server is running.`;
      }
      
      setMessages(prev => [...prev, {
        type: 'bot',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
    
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, GIF, etc.)');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select an image smaller than 10MB.');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="App">
      {/* Animated background orbs */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        <div className="orb orb-5"></div>
        <div 
          className="orb orb-mouse" 
          style={{
            left: mousePos.x - 50,
            top: mousePos.y - 50
          }}
        ></div>
      </div>

      <header className="App-header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-icon"></div>
            <div className="logo-text">
              <h1>AI Assistant</h1>
              <div className="subtitle">Intelligent Chat & Vision Analysis</div>
            </div>
          </div>
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>Online</span>
          </div>
        </div>
      </header>
      
      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-icon">✨</div>
              <h3>Welcome to AI Assistant!</h3>
              <div className="feature-grid">
                <div className="feature-card">
                  <div className="feature-icon">💬</div>
                  <span>Text Chat</span>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🖼️</div>
                  <span>Image Analysis</span>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⚡</div>
                  <span>Fast Response</span>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type} message-animate`} 
                 style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="message-content">
                {message.image && (
                  <div className="image-container">
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="uploaded-image"
                    />
                  </div>
                )}
                <p>{message.content}</p>
                {message.info && (
                  <small className="image-info">{message.info}</small>
                )}
                <span className="timestamp">{message.timestamp}</span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message bot message-animate">
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                  <span>{selectedFile ? 'Analyzing image...' : 'Thinking...'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={sendMessage} className="input-form">
          {selectedFile && (
            <div className="selected-file">
              <div className="file-preview">
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="Selected" 
                  className="preview-image"
                />
                <div className="file-info">
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{(selectedFile.size / 1024).toFixed(1)}KB</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={removeSelectedFile}
                className="remove-file"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="input-container">
            <div className="input-row">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedFile ? "Ask about the image..." : "Type your message..."}
                disabled={loading}
                className="message-input"
              />
              
              <label htmlFor="file-input" className="file-input-label" title="Upload image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              
              <button 
                type="submit" 
                disabled={loading || (!input.trim() && !selectedFile)}
                className="send-button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
