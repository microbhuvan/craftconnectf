import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeBusinessAudio } from "../services/api";

const HomePage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [textInput, setTextInput] = useState("");
  const recordingTimeRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Effect to handle recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  const startRecording = async () => {
    try {
      setError("");
      setRecordingTime(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported("audio/webm; codecs=opus")
        ? "audio/webm; codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
          
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (recordingTimeRef.current < 10) {
          setError("Recording too short. Please speak for at least 10 seconds.");
          setIsRecording(false);
          setRecordingTime(0);
          return;
        }
        
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });
        
        try {
          const { data } = await analyzeBusinessAudio(audioBlob);
          if (data.success) {
            navigate("/insights", { state: { ...data } });
          } else {
            setError(data.error || "Failed to analyze audio.");
            setIsProcessing(false);
          }
        } catch (err) {
          console.error("API Error:", err);
          setError("Server error. Please try again.");
          setIsProcessing(false);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording Error:", err);
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      // Handle text input submission - could navigate to insights with text analysis
      console.log("Text input:", textInput);
      // For now, we'll just clear it
      setTextInput("");
    }
  };

  return (
    <>
      <div className="relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden bg-[#FFFCF9]">
        <div className="layout-container flex h-full grow flex-col">
          {/* Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#f4f2f0] px-4 sm:px-10 py-3">
            <div className="flex items-center gap-4 text-[#181411]">
              <div className="size-6 text-[#ec6d13]">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
                </svg>
              </div>
              <h1 className="text-[#181411] text-xl font-bold leading-tight tracking-[-0.015em]">CraftConnect</h1>
            </div>
            <div className="flex items-center gap-6">
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#fef3e9] text-[#181411] transition-colors hover:bg-orange-100">
                <svg fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px" xmlns="http://www.w3.org/2000/svg">
                  <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path>
                </svg>
              </button>
              <div className="h-10 w-10 rounded-full bg-gray-300"></div>
            </div>
          </header>

          {/* Main Content */}
          <main 
            className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center"
            style={{
              backgroundImage: "url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3e%3cpath fill=%27none%27 stroke=%27%23fef3e9%27 stroke-width=%271%27 d=%27M10 90 C 20 100, 40 100, 50 90 S 70 80, 80 90%27/%3e%3c/svg%3e')"
            }}
          >
            <div className="w-full max-w-lg">
              {/* Hero Title */}
              <h2 className="text-4xl font-bold tracking-tight text-[#181411] sm:text-5xl">
                How can I help you today?
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#897261]">
                Tap the microphone to speak about your business.
              </p>

              {/* Recording Status */}
              {isRecording && (
                <div className="mt-6 mb-4">
                  <p className="text-sm font-medium text-[#ec6d13]">
                    Recording: {formatTime(recordingTime)}
                  </p>
                  {recordingTime < 10 && (
                    <p className="text-xs text-[#897261] mt-1">
                      Please continue for at least {10 - recordingTime} more seconds
                    </p>
                  )}
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="mt-6 mb-4 flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ec6d13]"></div>
                  <p className="text-sm text-[#897261] mt-2">
                    Processing your recording... This may take a moment.
                  </p>
                </div>
              )}

              {/* Microphone Button and Listening Animation */}
              <div className="mt-10 flex flex-col items-center justify-center gap-2">
                <button 
                  onClick={handleMicrophoneClick}
                  disabled={isProcessing}
                  className="group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-[#ec6d13] text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-110 hover:bg-[#d8620f] focus:outline-none focus:ring-4 focus:ring-[#ec6d13]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isProcessing && (
                    <span className="absolute h-full w-full animate-ping rounded-full bg-[#ec6d13] opacity-20"></span>
                  )}
                  <svg fill="currentColor" height="40" viewBox="0 0 256 256" width="40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V232a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"></path>
                  </svg>
                </button>

                {/* Listening Animation Bars */}
                {isRecording && (
                  <div className="listening-bar mt-4">
                    <span className="listening-dot"></span>
                    <span className="listening-dot"></span>
                    <span className="listening-dot"></span>
                  </div>
                )}

                {/* Text Input Alternative */}
                {!isRecording && !isProcessing && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="relative w-full max-w-xs group">
                      <form onSubmit={handleTextSubmit}>
                        <button 
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#fef3e9] p-2 text-[#897261] transition-colors hover:bg-orange-200 hover:text-[#181411] peer-focus:hidden"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 18.5721C12 18.5721 16 14.5721 21 14.5721" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                            <path d="M12 18.5721C12 18.5721 8 14.5721 3 14.5721" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                            <path d="M12 5.42792C12 5.42792 16 9.42792 21 9.42792" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                            <path d="M12 5.42792C12 5.42792 8 9.42792 3 9.42792" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                          </svg>
                        </button>
                        <input 
                          className="w-full rounded-full border border-transparent bg-transparent py-2 pl-4 pr-12 text-[#181411] opacity-0 transition-all duration-300 focus:border-[#f4f2f0] focus:bg-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#ec6d13]/50 peer" 
                          placeholder="Or type your request..." 
                          type="text"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                        />
                        <button 
                          type="button"
                          className="absolute -right-12 top-1/2 -translate-y-1/2 rounded-full border border-[#f4f2f0] bg-white px-3 py-1.5 text-sm font-semibold text-[#897261] shadow-sm transition-opacity hover:bg-gray-50 peer-focus:opacity-0"
                        >
                          Type
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Footer Text */}
                <p className="mt-6 text-sm text-[#897261]">
                  CraftConnect Assistant is powered by AI. 
                  <a 
                    className="font-semibold text-[#ec6d13] underline hover:text-[#d8620f] ml-1" 
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* CSS Styles */}
      <style>{`
        .listening-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 2rem;
          gap: 0.25rem;
        }
        .listening-dot {
          width: 4px;
          height: 4px;
          background-color: #ec6d13;
          border-radius: 9999px;
          animation: listen 1.5s infinite ease-in-out;
        }
        .listening-dot:nth-child(1) {
          animation-delay: -0.4s;
        }
        .listening-dot:nth-child(2) {
          animation-delay: -0.2s;
        }
        .listening-dot:nth-child(3) {
          animation-delay: 0s;
        }
        @keyframes listen {
          0%, 100% {
            transform: scaleY(1);
            opacity: 0.3;
          }
          50% {
            transform: scaleY(3);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default HomePage;