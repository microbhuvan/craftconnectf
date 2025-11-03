// Import dependencies
const { SpeechClient } = require("@google-cloud/speech");
const { VertexAI } = require("@google-cloud/vertexai");
const axios = require("axios");

// Initialize clients with error handling
let speechClient = null;
let vertexAI = null;
let generativeAI = null;

// Initialize Speech client safely
try {
  speechClient = new SpeechClient();
  console.log("✅ Speech client initialized successfully");
} catch (e) {
  console.error("❌ Failed to initialize Speech client:", e.message);
}

// Initialize Vertex AI safely
try {
  vertexAI = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || "us-central1",
  });
  
  // Use Gemini 2.5 Flash
  generativeAI = vertexAI.preview.getGenerativeModel({
    model: process.env.VERTEX_MODEL || "gemini-2.5-flash",
  });
  console.log("✅ Vertex AI initialized successfully with model:", process.env.VERTEX_MODEL || "gemini-2.5-flash");
} catch (e) {
  console.error("❌ Failed to initialize Vertex AI:", e.message);
}

// --- CONTROLLER FUNCTIONS ---

/**
 * Transcribes audio using Google Speech-to-Text API with multiple format support.
 */
async function transcribeAudio(audioBuffer) {
  console.time("transcribeAudio_function");
  if (!speechClient) {
    throw new Error("Speech client not initialized");
  }

  console.log("Starting audio transcription...");
  console.log("Audio buffer size:", audioBuffer.length, "bytes");

  // Try multiple encodings for better compatibility
  const encodings = ["WEBM_OPUS", "MP3", "OGG_OPUS", "WAV"];
  let lastError = null;

  for (const encoding of encodings) {
    try {
      console.log(`Trying encoding: ${encoding}`);
      console.time(`speechClient_recognize_${encoding}`);
      
      const audio = {
        content: audioBuffer.toString("base64"),
      };
      
      const config = {
        encoding: encoding,
        sampleRateHertz: 48000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        model: "latest_long",
        speechContexts: [{
          phrases: [
            "business", "craft", "artisan", "online", "marketplace",
            "customers", "products", "pricing", "growth", "help"
          ],
          boost: 10.0
        }]
      };
      
      const request = { audio, config };
      const [response] = await speechClient.recognize(request);
      console.timeEnd(`speechClient_recognize_${encoding}`);
      
      if (response.results && response.results.length > 0) {
        const transcription = response.results
          .map((result) => result.alternatives[0].transcript)
          .join("\n");
          
        if (transcription && transcription.trim().length > 0) {
          console.log(`Success with encoding: ${encoding}`);
          console.timeEnd("transcribeAudio_function");
          return { success: true, text: transcription };
        }
      }
    } catch (err) {
      console.timeEnd(`speechClient_recognize_${encoding}`);
      console.log(`Failed with encoding ${encoding}:`, err.message || err);
      lastError = err;
      continue;
    }
  }

  console.error("All encoding attempts failed");
  console.timeEnd("transcribeAudio_function");
  return {
    success: false,
    error: `Speech recognition failed. Last error: ${lastError?.message || "Unknown"}`
  };
}

/**
 * Sanitizes raw text from AI response to extract JSON
 */
function sanitizeRawText(raw) {
  if (!raw) return "{}";

  let s = String(raw);

  // If there's a fenced block, pick its content
  const fenceMatch = s.match(/```(?:json|js|text|txt)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    s = fenceMatch[1].trim();
  }

  // Remove common leading phrases
  s = s.replace(
    /^[\s\n\r\t]*(?:here is the json|here's the json|here is the json requested|output:|answer:|here is the output)[:s-]*/i,
    ""
  );

  // Remove leading backticks if any remain and trailing backticks
  s = s.replace(/^[`]+/, "").replace(/[`]+$/, "");

  // Remove everything before the first { or [
  const firstBrace = s.indexOf("{");
  if (firstBrace > 0) s = s.slice(firstBrace);

  return s.trim();
}

/**
 * Repairs malformed JSON
 */
function repairJson(jsonStr) {
  try {
    // First try direct parsing
    return JSON.parse(jsonStr);
  } catch (e) {
    // Basic cleanup
    let attempt = jsonStr
      .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
      .replace(/:s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes

    try {
      return JSON.parse(attempt);
    } catch (e2) {
      // More aggressive repair - balance braces
      const openC = (attempt.match(/{/g) || []).length;
      const closeC = (attempt.match(/}/g) || []).length;
      if (openC > closeC) attempt += "}".repeat(openC - closeC);
      
      try {
        return JSON.parse(attempt);
      } catch (e3) {
        // Return a partial result with error info
        console.error("JSON repair failed:", e3.message);
        return { 
          partial: true, 
          error: e3.message,
          rawText: jsonStr
        };
      }
    }
  }
}

/**
 * Analyzes business transcript using Vertex AI (Gemini).
 */
async function analyzeTranscriptWithVertexAI(transcript) {
  if (!generativeAI) {
    console.log("Vertex AI not initialized, returning fallback analysis");
    return {
      success: false,
      error: "Vertex AI not initialized",
      fallbackAnalysis: {
        businessType: "Craft Business",
        detectedFocus: "Handmade Products",
        topProblems: ["Unable to process due to AI initialization failure"],
        recommendedSolutions: {
          primary: {
            id: "website",
            reason: "A basic online presence is essential for any craft business"
          },
          secondary: {
            id: "instagram",
            reason: "Visual platform ideal for showcasing handmade products"
          }
        },
        confidence: 80
      }
    };
  }

  // Create a safer version of the transcript for the prompt
  const safeTranscript = transcript.replace(/"/g, "'").substring(0, 1500);

  const prompt = `
        Analyze the following business description from an artisan. Your task is to extract key information and return it as a valid JSON object.

        **Business Description:**
        "${safeTranscript}"

        **JSON Output Format:**
        {
          "businessType": "A short, descriptive category like 'Pottery & Ceramics', 'Handmade Jewelry', or 'Textile Arts'.",
          "detectedFocus": "A string of comma-separated keywords of products or services mentioned, like 'ceramic bowls, vases, custom orders'.",
          "topProblems": [
            "A key challenge or problem the user mentioned.",
            "Another challenge if mentioned."
          ],
          "recommendedSolutions": {
            "primary": {
              "id": "whatsapp | instagram | website",
              "reason": "A brief, compelling reason why this is the best first step for the user."
            },
            "secondary": {
              "id": "whatsapp | instagram | website",
              "reason": "A brief reason for the second-best option."
            }
          },
          "confidence": "An integer between 80 and 95 representing your confidence in this analysis."
        }

        **CRITICAL:** Only return the JSON object. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
    `;

  try {
    const req = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1024,
      }
    };
    
    console.log("Sending request to Vertex AI...");
    const result = await generativeAI.generateContent(req);
    console.log("Received response from Vertex AI");
    
    // Extract raw text robustly with multiple fallbacks
    let responseText = "";
    if (result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = result.response.candidates[0].content.parts[0].text;
      console.log("Extracted text from candidates[0].content.parts[0].text");
    } else if (result?.response?.text) {
      responseText = result.response.text;
      console.log("Extracted text from response.text");
    } else if (result?.response?.candidates?.[0]?.content?.text) {
      responseText = result.response.candidates[0].content.text;
      console.log("Extracted text from candidates[0].content.text");
    } else if (typeof result?.response === 'string') {
      responseText = result.response;
      console.log("Extracted text from response string");
    } else {
      console.error("Unexpected response format from Vertex AI");
      throw new Error("Invalid response format from Vertex AI");
    }

    console.log("Raw text from AI (first 100 chars):", responseText.substring(0, 100));

    // Sanitize and repair
    const sanitized = sanitizeRawText(responseText);
    console.log("Sanitized text (first 100 chars):", sanitized.substring(0, 100));
    
    let parsed = null;
    
    try {
      // First attempt: direct JSON parse
      parsed = JSON.parse(sanitized);
      console.log("Successfully parsed JSON directly");
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting repair...");
      console.error("JSON PARSE ERROR:", parseError.message);
      
      try {
        // Second attempt: Try to repair JSON
        const repairedJson = repairJson(sanitized);
        parsed = JSON.parse(repairedJson);
        console.log("Successfully parsed repaired JSON");
      } catch (repairError) {
        console.error("JSON repair failed:", repairError.message);
        throw new Error(`Failed to parse AI response as JSON: ${repairError.message}`);
      }
    }
    
    // If we got a partial result with error, add the raw text for debugging
    if (parsed.partial) {
      console.log("PARTIAL RESULT DETECTED:", parsed);
      return {
        success: false,
        partial: true,
        error: "Failed to parse AI response completely",
        rawResponse: responseText,
        partialData: parsed
      };
    }
    
    // Validate the JSON structure
    console.log("VALIDATING JSON STRUCTURE");
    parsed = ensureValidAnalysisFormat(parsed);
    console.log("VALIDATED JSON STRUCTURE:", JSON.stringify(parsed, null, 2));
    
    return {
      success: true,
      data: parsed,
      rawResponse: responseText
    };
  } catch (err) {
    console.error("Vertex AI analysis error:", err);
    console.error("ERROR STACK:", err.stack);
    
    // Return a fallback analysis even in case of error
    return { 
      success: false, 
      error: err.message || String(err),
      rawResponse: err.rawResponse || null,
      fallbackAnalysis: {
        businessType: "Craft Business",
        detectedFocus: "Handmade Products",
        topProblems: ["Unable to determine from transcript"],
        recommendedSolutions: {
          primary: {
            id: "website",
            reason: "A basic online presence is essential for any craft business"
          },
          secondary: {
            id: "instagram",
            reason: "Visual platform ideal for showcasing handmade products"
          }
        },
        confidence: 80
      }
    };
  }
}

// Helper function to ensure valid analysis format
function ensureValidAnalysisFormat(data) {
  // Ensure the analysis has all required fields with valid types
  const validatedData = {
    businessType: typeof data.businessType === 'string' ? data.businessType : "Craft Business",
    detectedFocus: typeof data.detectedFocus === 'string' ? data.detectedFocus : "Handmade Products",
    topProblems: Array.isArray(data.topProblems) ? data.topProblems : ["No specific problems detected"],
    recommendedSolutions: {
      primary: {
        id: data.recommendedSolutions?.primary?.id || "website",
        reason: data.recommendedSolutions?.primary?.reason || "A basic online presence is essential"
      },
      secondary: {
        id: data.recommendedSolutions?.secondary?.id || "instagram",
        reason: data.recommendedSolutions?.secondary?.reason || "Visual platform ideal for products"
      }
    },
    confidence: typeof data.confidence === 'number' ? data.confidence : 
               (typeof data.confidence === 'string' && !isNaN(parseInt(data.confidence)) ? 
               parseInt(data.confidence) : 85)
  };
  
  return validatedData;
}

// Helper function to get session data from internal API
async function getSession(sessionId) {
  const baseUrl =
    process.env.INTERNAL_BASE_URL ||
    `http://localhost:${process.env.PORT || 8080}`;
  const r = await axios.get(`${baseUrl}/api/session/${sessionId}`);
  return r.data.session || r.data; // support both shapes
}

// --- EXPORTED API HANDLERS ---

exports.analyzeBusinessAudio = async (req, res) => {
  console.log("analyzeBusinessAudio function entered");
  console.time("analyzeBusinessAudio_total");
  if (!req.file || !req.file.buffer) {
    console.error("❌ No audio file uploaded or buffer is empty.");
    console.timeEnd("analyzeBusinessAudio_total");
    return res.status(200).json({
      success: false,
      error: "No audio file uploaded",
      message: "Please upload an audio file for analysis.",
      analysis: {
        businessType: "Craft Business",
        detectedFocus: "Handmade Products",
        topProblems: ["No audio provided"],
        recommendedSolutions: {
          primary: { id: "website", reason: "A basic online presence is essential" },
          secondary: { id: "instagram", reason: "Visual platform ideal for products" }
        },
        confidence: 50
      }
    });
  }

  try {
    console.log("Starting business audio analysis...");
    console.log("Audio file size:", req.file.size, "bytes");
    console.log("Audio file mimetype:", req.file.mimetype);
    
    // Step 1: Transcribe the audio
    console.time("transcribeAudio_step");
    console.log("Attempting to transcribe audio...");
    const transcriptionResult = await transcribeAudio(req.file.buffer);
    console.timeEnd("transcribeAudio_step");
    
    if (!transcriptionResult.success) {
      console.error("❌ Audio transcription failed:", transcriptionResult.error);
      console.timeEnd("analyzeBusinessAudio_total");
      return res.status(200).json({
        success: false,
        error: transcriptionResult.error || "Failed to transcribe audio",
        message: "We couldn't transcribe your audio. Please try speaking more clearly or check your microphone.",
        analysis: {
          businessType: "Craft Business",
          detectedFocus: "Handmade Products",
          topProblems: ["Transcription failed"],
          recommendedSolutions: {
            primary: { id: "website", reason: "A basic online presence is essential" },
            secondary: { id: "instagram", reason: "Visual platform ideal for products" }
          },
          confidence: 60
        }
      });
    }
    
    const transcript = transcriptionResult.text;
    console.log("Transcription successful. Transcript (first 100 chars):", transcript.substring(0, 100) + "...");
    
    // Step 2: Analyze the transcript with Vertex AI
    console.time("analyzeTranscriptWithVertexAI_step");
    console.log("Attempting to analyze transcript with Vertex AI...");
    const analysisResult = await analyzeTranscriptWithVertexAI(transcript);
    console.timeEnd("analyzeTranscriptWithVertexAI_step");
    
    // Handle case where analysis failed but we have a fallback analysis
    if (!analysisResult.success && analysisResult.fallbackAnalysis) {
      console.warn("⚠️ Vertex AI analysis failed, using fallback analysis.", analysisResult.error);
      console.timeEnd("analyzeBusinessAudio_total");
      return res.status(200).json({
        success: true,
        partial: true,
        transcript: transcript,
        error: analysisResult.error || "Using fallback analysis",
        analysis: analysisResult.fallbackAnalysis
      });
    }
    
    // Handle case where analysis failed without fallback
    if (!analysisResult.success) {
      console.error("❌ Vertex AI analysis failed without fallback:", analysisResult.error);
      console.timeEnd("analyzeBusinessAudio_total");
      return res.status(200).json({
        success: true,
        partial: true,
        transcript: transcript,
        error: analysisResult.error || "Failed to analyze transcript",
        analysis: {
          businessType: "Craft Business",
          detectedFocus: "Handmade Products",
          topProblems: ["Vertex AI analysis failed"],
          recommendedSolutions: {
            primary: { id: "website", reason: "A basic online presence is essential" },
            secondary: { id: "instagram", reason: "Visual platform ideal for products" }
          },
          confidence: 70
        }
      });
    }

    console.log("Vertex AI analysis successful.");
    console.log("Analysis result before sending:", JSON.stringify(analysisResult.data, null, 2));
    console.timeEnd("analyzeBusinessAudio_total");
    return res.status(200).json({
      success: true,
      transcript: transcript,
      analysis: analysisResult.data,
    });
  } catch (error) {
    console.error("❌ Error during business audio analysis:", error);
    console.timeEnd("analyzeBusinessAudio_total");
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred during audio analysis.",
      details: error.message,
    });
  }
};

exports.generateWhatsAppMessage = async (req, res) => {
  if (!generativeAI) {
    return res.status(200).json({ 
      success: true,
      partial: true,
      message: "👋 Hello there! Thank you for your interest in our craft business. We'd love to hear more about what you're looking for!",
      error: "Vertex AI not initialized" 
    });
  }

  // This function can be expanded later to use Vision AI if an image is uploaded
  const { businessType, detectedFocus, transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({
      success: false,
      error: "Transcript is required"
    });
  }

  const prompt = `
        You are an expert marketing copywriter for small craft businesses. 
        Your task is to generate a professional, friendly, and engaging WhatsApp Business message.

        **Business Context:**
        - Type: ${businessType || "Craft Business"}
        - Products/Focus: ${detectedFocus || "Handmade products"}
        - User's own words: "${transcript}"

        **Instructions:**
        - Start with a friendly greeting.
        - Use emojis to make the message visually appealing.
        - Briefly introduce the business and its specialty.
        - Use bullet points to highlight key features or products.
        - End with a clear call-to-action, encouraging the customer to reply.
        - Keep the message concise and easy to read.

        Generate the message now.
    `;

  try {
    const req = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      }
    };
    
    const result = await generativeAI.generateContent(req);
    
    // Extract message text robustly
    let message = "";
    if (result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      message = result.response.candidates[0].content.parts[0].text;
    } else if (result?.response?.text) {
      message = result.response.text;
    } else {
      throw new Error("Invalid response format from Vertex AI");
    }

    return res.status(200).json({ 
      success: true, 
      message,
      businessType: businessType || "Craft Business"
    });
  } catch (error) {
    console.error("❌ Error generating WhatsApp message:", error);
    
    // Provide a fallback message in case of failure
    const fallbackMessage = `👋 Hello there!\n\nThank you for your interest in our ${businessType || "craft business"}. We specialize in ${detectedFocus || "handmade products"} made with care and attention to detail.\n\nWe'd love to hear more about what you're looking for! Please reply to this message and we'll get back to you as soon as possible.\n\n✨ Thank you!`;
    
    return res.status(200).json({ 
      success: true, 
      partial: true,
      message: fallbackMessage,
      error: error.message || "Failed to generate message"
    });
  }
};

// NEW: Generate WhatsApp message from session data
exports.generateWhatsAppFromSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId is required"
      });
    }

    // Get session data
    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }

    // Extract relevant information from session
    const businessType = session.businessSummary?.businessName || session.businessSummary?.businessType || "Craft Business";
    const detectedFocus = session.businessSummary?.detectedFocus || "Handmade products";
    const productName = session.productAnalysis?.productSummary?.name || "our products";
    const features = session.productAnalysis?.productSummary?.uniqueFeatures || [];
    const pricingRange = session.productAnalysis?.marketingInsights?.pricingRange || "Competitive pricing";

    if (!generativeAI) {
      const fallbackMessage = `👋 Hello there!\n\nThank you for your interest in our ${businessType}! We specialize in ${detectedFocus}.\n\n✨ ${productName} - ${features.slice(0, 2).join(", ")}\n\n💰 ${pricingRange}\n\nPlease let us know what you're looking for and we'll be happy to help! 😊`;
      
      return res.status(200).json({ 
        success: true,
        partial: true,
        message: fallbackMessage,
        error: "Vertex AI not initialized" 
      });
    }

    const prompt = `
      You are an expert WhatsApp Business marketing copywriter. Generate a professional, engaging WhatsApp message for a craft business.

      **Business Information:**
      - Business Type: ${businessType}
      - Products/Focus: ${detectedFocus}
      - Product Name: ${productName}
      - Key Features: ${features.slice(0, 3).join(", ")}
      - Pricing: ${pricingRange}

      **Message Requirements:**
      1. Start with a warm, friendly greeting
      2. Use appropriate emojis (but don't overdo it)
      3. Briefly introduce the business and main product
      4. Highlight 2-3 key features or benefits
      5. Include pricing information naturally
      6. End with a clear call-to-action encouraging response
      7. Keep it conversational and under 200 words
      8. Make it sound personal, not automated

      Generate the WhatsApp message now:
    `;

    const result = await generativeAI.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    });

    // Extract message text
    let message = "";
    if (result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      message = result.response.candidates[0].content.parts[0].text;
    } else if (result?.response?.text) {
      message = result.response.text;
    } else {
      throw new Error("Invalid response format from Vertex AI");
    }

    return res.status(200).json({ 
      success: true, 
      message: message.trim(),
      sessionId,
      businessType
    });

  } catch (error) {
    console.error("❌ Error generating WhatsApp message from session:", error);
    
    // Provide a fallback message
    const fallbackMessage = "👋 Hello! Thank you for your interest in our handmade products. We'd love to help you find exactly what you're looking for! Please let us know how we can assist you. 😊";
    
    return res.status(200).json({ 
      success: true, 
      partial: true,
      message: fallbackMessage,
      error: error.message || "Failed to generate message"
    });
  }
};