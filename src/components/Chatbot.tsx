import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

// Simple markdown renderer for bot messages
const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 ml-4">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-sm">{renderInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-sm">{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<br key={`br-${lineIdx}`} />);
      return;
    }

    // Headers
    if (trimmed.startsWith('###')) {
      flushList();
      const content = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h3 key={`h3-${lineIdx}`} className="font-bold text-base mt-3 mb-2">
          {renderInlineMarkdown(content)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('##')) {
      flushList();
      const content = trimmed.replace(/^##\s+/, '');
      elements.push(
        <h2 key={`h2-${lineIdx}`} className="font-bold text-lg mt-4 mb-2">
          {renderInlineMarkdown(content)}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('#')) {
      flushList();
      const content = trimmed.replace(/^#\s+/, '');
      elements.push(
        <h1 key={`h1-${lineIdx}`} className="font-bold text-xl mt-4 mb-2">
          {renderInlineMarkdown(content)}
        </h1>
      );
      return;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(numberedMatch[1]);
      return;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const content = trimmed.replace(/^[-*]\s+/, '');
      currentList.push(content);
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="mb-2">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();
  return <>{elements}</>;
};

// Render inline markdown (bold)
const renderInlineMarkdown = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Match bold (**text** or __text__)
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let match;
  const matches: Array<{ start: number; end: number; text: string }> = [];

  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1] || match[2],
    });
  }

  if (matches.length === 0) {
    return text;
  }

  matches.forEach((boldMatch) => {
    // Add text before bold
    if (boldMatch.start > currentIndex) {
      parts.push(text.substring(currentIndex, boldMatch.start));
    }
    // Add bold text
    parts.push(
      <strong key={`bold-${key++}`} className="font-semibold">
        {boldMatch.text}
      </strong>
    );
    currentIndex = boldMatch.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const API_URL = import.meta.env.VITE_CHAT_API_URL || '/api/chat';

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm vitaltech bot, your Kubernetes learning assistant. Ask me anything about Kubernetes, containers, pods, services, or any concept you're learning!",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const provider: 'groq' | 'openrouter' = 'groq'; // Default provider
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter((m) => m.id !== '1') // Exclude initial bot message
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          provider: provider,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message || 'Sorry, I could not generate a response.',
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-pdso-600 hover:bg-pdso-500 text-white rounded-full shadow-lg shadow-pdso-900/50 flex items-center justify-center transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Open chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-96 h-[70vh] sm:h-[600px] bg-slate-950 border border-pdso-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: 'Satoshi, sans-serif' }}
          >
            {/* Header */}
            <div className="bg-slate-900/70 border-b border-pdso-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-pdso-300" size={20} />
                <h3 className="text-white font-semibold" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  vitaltech bot
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-pdso-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/80">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-pdso-800 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-pdso-200" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-pdso-600 text-white'
                        : 'bg-slate-900 border border-pdso-800 text-pdso-100'
                    }`}
                    style={{ fontFamily: 'Satoshi, sans-serif' }}
                  >
                    {message.sender === 'bot' ? (
                      <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                        {renderMarkdown(message.text)}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-pdso-600 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-pdso-800 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-pdso-200" />
                  </div>
                  <div className="bg-slate-900 border border-pdso-800 text-pdso-100 rounded-lg px-4 py-2">
                    <Loader2 className="animate-spin text-pdso-300" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-pdso-800 p-4 bg-slate-900/60">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about Kubernetes..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-900 border border-pdso-700 text-white placeholder-pdso-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pdso-500 focus:border-transparent disabled:opacity-50"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-pdso-600 hover:bg-pdso-500 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs text-pdso-400 mt-2 text-center" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Container Orchestration
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
