import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const WhatsAppPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Get initial message from navigation state or generate from session
  useEffect(() => {
    const initialMessage = location.state?.generatedMessage;
    if (initialMessage) {
      setMessage(initialMessage);
    } else {
      generateMessageFromSession();
    }
  }, []);

  const generateMessageFromSession = async () => {
    try {
      setLoading(true);
      setError("");
      
      const session = JSON.parse(sessionStorage.getItem('craftConnectSession') || '{}');
      if (!session?.sessionId) {
        throw new Error('No session found. Please complete the business analysis first.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/generate-from-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate message');
      }

      setMessage(result.message || 'Hello! Thank you for your interest in our products.');
      
      if (result.partial) {
        setError(result.error || 'Using fallback message');
      }

    } catch (error) {
      console.error('Error generating WhatsApp message:', error);
      setError(error.message);
      setMessage('👋 Hello there! Thank you for your interest in our craft business. We\'d love to hear more about what you\'re looking for!');
    } finally {
      setLoading(false);
    }
  };

  const regenerateMessage = async () => {
    await generateMessageFromSession();
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy message:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendViaWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getCharacterCount = () => {
    return message.length;
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F0] text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-center border-b border-slate-200/80 bg-[#FFF8F0]/80 backdrop-blur-lg">
        <nav className="flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="size-6 text-[#ec6d13]">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0)"><path d="M8.58 8.58C5.53 11.63 3.45 15.51 2.61 19.75C1.77 23.98 2.2 28.36 3.85 32.35C5.5 36.33 8.3 39.74 11.88 42.13C15.47 44.53 19.69 45.81 24 45.81C28.31 45.81 32.53 44.53 36.12 42.13C39.7 39.74 42.5 36.33 44.15 32.35C45.8 28.36 46.23 23.98 45.39 19.75C44.55 15.51 42.47 11.63 39.42 8.58L24 24L8.58 8.58Z" fill="currentColor"/></g>
                <defs><clipPath id="clip0"><rect width="48" height="48" fill="white"/></clipPath></defs>
              </svg>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Craft Connect</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="flex flex-auto flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              {loading ? "Generating Your Message..." : "Your WhatsApp Message is Ready!"}
            </h1>
            <p className="mt-2 text-slate-600">
              Share this personalized message with your customers on WhatsApp
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">⚠️ {error}</p>
            </div>
          )}

          <div className="mt-8 flex w-full flex-col">
            <div className="mb-4 flex w-full justify-end">
              <button 
                onClick={regenerateMessage}
                disabled={loading}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="truncate">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                    </svg>
                    <span className="truncate">Regenerate Message</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex min-h-[20rem] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div className="flex-auto overflow-y-auto">
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-full min-h-[10rem] w-full resize-none border-0 bg-transparent p-0 text-lg leading-relaxed text-slate-700 placeholder-slate-400 focus:ring-0"
                  placeholder="Your personalized WhatsApp message will appear here..."
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center px-2">
              <p className="text-sm text-slate-500">{getCharacterCount()} characters</p>
              {getCharacterCount() > 1000 && (
                <p className="text-sm text-amber-600">⚠️ Consider shortening for better readability</p>
              )}
            </div>

            <div className="mt-6 flex w-full flex-col gap-4">
              <button 
                onClick={sendViaWhatsApp}
                disabled={loading || !message.trim()}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] px-5 text-lg font-bold text-white shadow-md shadow-[#25D366]/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871-.118.571-.355 1.016-1.428 1.165-1.776.149-.347.149-.644.1-.792z"/>
                </svg>
                <span className="truncate">Send via WhatsApp</span>
              </button>

              <button 
                onClick={copyMessage}
                disabled={loading || !message.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#ec6d13] bg-transparent px-5 text-base font-bold text-[#ec6d13] hover:bg-[#ec6d13]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span className="truncate">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    <span className="truncate">Copy Message</span>
                  </>
                )}
              </button>
            </div>

            {/* Help text */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How to use this message:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click "Send via WhatsApp" to open WhatsApp with this message</li>
                <li>• Or copy the message and paste it in your WhatsApp Business app</li>
                <li>• You can edit the message above before sending</li>
                <li>• Use this template for multiple customers by personalizing names/details</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppPage;