const { SpeechClient } = require('@google-cloud/speech');
const { VertexAI } = require('@google-cloud/aiplatform').v1beta;
const mongoose = require('mongoose');
const BusinessSession = require('../models/BusinessSession');

// Initialize Google Cloud clients
const speechClient = new SpeechClient();
const vertex = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION || 'us-central1',
});

const MODEL_NAME = process.env.VERTEX_MODEL || 'gemini-2.5-flash';

// Step 1: Analyze Business Overview from Voice Recording
exports.analyzeBusinessOverview = async (req, res) => {
  try {
    console.log('📢 Starting business overview analysis...');

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Convert audio to text using Google Speech-to-Text
    const audioBytes = req.file.buffer.toString('base64');
    const speechRequest = {
      audio: { content: audioBytes },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_long',
      },
    };

    const [response] = await speechClient.recognize(speechRequest);
    const transcript = response.results
      ?.map(result => result.alternatives[0]?.transcript)
      .join(' ') || '';

    console.log('🎤 Transcript:', transcript);

    if (!transcript) {
      return res.status(400).json({ error: 'Could not transcribe audio' });
    }

    // Analyze business overview using Vertex AI generative API
    const businessAnalysisPrompt = `
Analyze this craft business description and provide a structured summary:

"${transcript}"

Please provide a JSON response with:
{
  "businessType": "type of craft business",
  "businessName": "business name if mentioned",
  "experience": "years/level of experience",
  "location": "location if mentioned",
  "mainChallenges": ["challenge1", "challenge2", "challenge3"],
  "currentStatus": "brief description of current business status",
  "goals": ["goal1", "goal2", "goal3"],
  "hasOnlinePresence": true/false,
  "targetMarket": "description of target customers",
  "keyStrengths": ["strength1", "strength2", "strength3"]
}

Be conversational and understanding. If information is not clearly mentioned, use 'Not specified' or make reasonable assumptions based on context.`;

    const model = vertex.getGenerativeModel({ model: MODEL_NAME });
    const [genResp] = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: businessAnalysisPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048, topP: 0.8, topK: 40 },
    });

    const parts = genResp.candidates?.[0]?.content?.parts || [];
    const aiContent = parts.map(p => p.text || '').join('\n');

    // Extract JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    let businessSummary;
    
    if (jsonMatch) {
      try {
        businessSummary = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Error parsing AI JSON:', error);
        businessSummary = { error: 'Failed to parse AI response', rawResponse: aiContent };
      }
    } else {
      businessSummary = { error: 'No JSON found in response', rawResponse: aiContent };
    }

    // Create or update business session
    const sessionId = new mongoose.Types.ObjectId();
    const businessSession = new BusinessSession({
      _id: sessionId,
      transcript,
      businessSummary,
      step: 'business_overview_complete',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await businessSession.save();

    console.log('✅ Business overview analysis complete');

    res.json({
      success: true,
      sessionId: sessionId.toString(),
      transcript,
      businessSummary,
      nextStep: 'validate_summary'
    });

  } catch (error) {
    console.error('❌ Error in business overview analysis:', error);
    res.status(500).json({
      error: 'Failed to analyze business overview',
      details: error.message
    });
  }
};

// Step 2: Validate and Update Business Summary
exports.validateBusinessSummary = async (req, res) => {
  try {
    console.log('🔍 Validating business summary...');
    
    const { sessionId, corrections, isApproved } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await BusinessSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (isApproved) {
      // User approved the summary, move to next step
      session.step = 'ready_for_product_analysis';
      session.businessSummaryApproved = true;
    } else if (corrections) {
      // User provided corrections, update the summary
      session.businessSummary = { ...session.businessSummary, ...corrections };
      session.step = 'ready_for_product_analysis';
      session.businessSummaryApproved = true;
    }

    session.updatedAt = new Date();
    await session.save();

    console.log('✅ Business summary validated');

    res.json({
      success: true,
      sessionId,
      updatedSummary: session.businessSummary,
      nextStep: 'product_analysis'
    });

  } catch (error) {
    console.error('❌ Error validating business summary:', error);
    res.status(500).json({
      error: 'Failed to validate business summary',
      details: error.message
    });
  }
};

// Step 4: Generate Final Recommendations
exports.generateRecommendations = async (req, res) => {
  try {
    console.log('🎯 Generating final recommendations...');
    
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await BusinessSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const recommendationsPrompt = `
Based on this comprehensive business analysis, provide detailed digital marketing recommendations:

BUSINESS SUMMARY:
${JSON.stringify(session.businessSummary, null, 2)}

PRODUCT ANALYSIS:
${JSON.stringify(session.productAnalysis, null, 2)}

Provide a JSON response with:
{
  "primaryRecommendations": [
    {
      "platform": "WhatsApp/Instagram/Website",
      "priority": 1-3,
      "reason": "why this platform suits their business",
      "implementation": "step-by-step guide",
      "expectedOutcome": "what they can achieve"
    }
  ],
  "contentStrategy": {
    "focusAreas": ["area1", "area2"],
    "contentTypes": ["type1", "type2"],
    "postingFrequency": "recommended frequency"
  },
  "marketingMessages": {
    "whatsapp": "sample WhatsApp message",
    "instagram": "sample Instagram caption",
    "general": "elevator pitch"
  },
  "nextSteps": ["step1", "step2", "step3"]
}`;

    const model = vertex.getGenerativeModel({ model: MODEL_NAME });
    const [genResp] = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: recommendationsPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 3072, topP: 0.8, topK: 40 },
    });

    const parts = genResp.candidates?.[0]?.content?.parts || [];
    const aiContent = parts.map(p => p.text || '').join('\n');

    // Extract JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    let recommendations;
    
    if (jsonMatch) {
      try {
        recommendations = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Error parsing recommendations JSON:', error);
        recommendations = { error: 'Failed to parse AI response', rawResponse: aiContent };
      }
    } else {
      recommendations = { error: 'No JSON found in response', rawResponse: aiContent };
    }

    // Update session with final recommendations
    session.finalRecommendations = recommendations;
    session.step = 'complete';
    session.updatedAt = new Date();
    await session.save();

    console.log('✅ Final recommendations generated');

    res.json({
      success: true,
      sessionId,
      recommendations,
      businessSummary: session.businessSummary,
      productAnalysis: session.productAnalysis
    });

  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
};

// Session Management
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await BusinessSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('❌ Error getting session:', error);
    res.status(500).json({
      error: 'Failed to get session',
      details: error.message
    });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    const session = await BusinessSession.findByIdAndUpdate(
      sessionId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('❌ Error updating session:', error);
    res.status(500).json({
      error: 'Failed to update session',
      details: error.message
    });
  }
};
