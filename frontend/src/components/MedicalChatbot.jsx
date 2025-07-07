import React, { useState } from 'react';
import Markdown from 'react-markdown';
import axios from 'axios';
import './chatbot.css';

const MedicalChatbot = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Hello! How can I help?',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true); 

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Please login to use the chatbot');
      }

      const response = await axios.post(
        'http://localhost:5000/api/chatbot/query',
        { message: userMessage },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.response) {
        throw new Error('Empty response from server');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: response.data.response,
          sources: Array.isArray(response.data.sources) ? response.data.sources : []
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);

      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (err.response?.status === 403) {
        errorMessage = 'Please login to use the chatbot';
      } else if (err.message.includes('login')) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: errorMessage,
          sources: []
        }
      ]);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>Tridosha Medical Assistant</h3>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <Markdown>{msg.content}</Markdown>
            {Array.isArray(msg.sources) && msg.sources.length > 0 && (
              <div className="message-sources">
                <span>Verified from: </span>
                {msg.sources.join(', ')}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
      </div>

      <div className="chatbot-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about symptoms, treatments..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default MedicalChatbot;
