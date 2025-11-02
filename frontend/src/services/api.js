import axios from "axios";

// Prefer Vite env; default to local backend for development
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: API_URL.replace(/\/$/, "") + "/api",
  timeout: 30000, // 30 second timeout
});

export const analyzeBusinessAudio = (audioBlob, options = {}) => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  return apiClient.post("/analyze-business", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    ...options,
  });
};

export const generateWhatsAppMessage = (data) => {
  return apiClient.post("/generate-whatsapp-message", data);
};
