import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MessagesPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (partnerId) {
      loadMessages();
    } else {
      loadConversations();
    }
  }, [partnerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API}/messages`, {
        headers: getAuthHeaders()
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages/${partnerId}`, {
        headers: getAuthHeaders()
      });
      setMessages(response.data);
      
      // Get partner info from first message
      if (response.data.length > 0) {
        const msg = response.data[0];
        const partnerIdFromMsg = msg.sender_id === user.user_id ? msg.receiver_id : msg.sender_id;
        // Fetch partner details if needed
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        receiver_id: partnerId,
        content: newMessage
      }, {
        headers: getAuthHeaders()
      });

      setMessages([...messages, {
        message_id: Date.now().toString(),
        sender_id: user.user_id,
        receiver_id: partnerId,
        content: newMessage,
        created_at: new Date().toISOString()
      }]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Conversation List View
  if (!partnerId) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </header>

        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-200 rounded-xl skeleton" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Aucun message</h2>
              <p className="text-slate-500">
                Vos conversations avec les propriétaires apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => (
                <button
                  key={conv.partner.user_id}
                  onClick={() => navigate(`/messages/${conv.partner.user_id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conv.partner.picture} />
                    <AvatarFallback>{conv.partner.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{conv.partner.name}</span>
                      {conv.last_message && (
                        <span className="text-xs text-slate-400">
                          {format(new Date(conv.last_message.created_at), 'dd MMM', { locale: fr })}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-slate-500 truncate">
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-6 h-6 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Chat Header */}
      <header className="flex items-center gap-3 p-4 border-b border-slate-200">
        <button 
          onClick={() => navigate('/messages')}
          className="p-2 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={partner?.picture} />
          <AvatarFallback>{partner?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{partner?.name || 'Conversation'}</h2>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.user_id;
            return (
              <div
                key={msg.message_id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-900 rounded-bl-none'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                    {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-1 rounded-full"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full bg-teal-600 hover:bg-teal-700 w-12 h-10"
          disabled={!newMessage.trim() || sending}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
