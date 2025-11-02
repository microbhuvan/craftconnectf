const { SpeechClient } = require('@google-cloud/speech');
const { TextServiceClient } = require('@google-cloud/aiplatform').v1beta1;
const mongoose = require('mongoose');
const BusinessSession = require('../models/BusinessSession');

// Google Cloud clients
const speechClient = new SpeechClient();
const textClient = new TextServiceClient({
  apiEndpoint: `${process.env.GOOGLE_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
});

const MODEL_NAME = process.env.VERTEX_MODEL || 'gemini-2.5-flash';
const MODEL_PATH = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GOOGLE_LOCATION || 'us-central1'}/publishers/google/models/${MODEL_NAME}`;

// Utility: extract JSON block from free-form text
function extractFirstJson(str = '') {
  const m = str.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// Step 1: Analyze Business Overview from Voice Recording
exports.analyzeBusinessOverview = async (req, res) => {
  try {
    console.log('📢 Starting business overview analysis...');

    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    // Speech-to-Text
    const audioBytes = req.file.buffer.toString('base64');
    const [stt] = await speechClient.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_long',
      },
    });
    const transcript = stt.results?.map(r => r.alternatives[0]?.transcript).join(' ') || '';
    console.log('🎤 Transcript:', transcript);
    if (!transcript) return res.status(400).json({ error: 'Could not transcribe audio' });

    // Vertex AI (text-only prompt via generateText)
    const prompt = `Analyze this craft business description and provide a structured JSON summary with fields: businessType, businessName, experience, location, mainChallenges[], currentStatus, goals[], hasOnlinePresence, targetMarket, keyStrengths[]; be concise and use 'Not specified' when missing.\n\n"${transcript}"`;

    const [resp] = await textClient.generateText({
      model: MODEL_PATH,
      prompt: { text: prompt },
      temperature: 0.3,
      maxOutputTokens: 2048,
      topP: 0.8,
      topK: 40,
    });

    const aiText = (resp?.candidates || [])
      .map(c => c.output || c.content || '')
      .join('\n');

    const businessSummary = extractFirstJson(aiText) || { rawResponse: aiText };

    // Persist session
    const sessionId = new mongoose.Types.ObjectId();
    await new BusinessSession({
      _id: sessionId,
      transcript,
      businessSummary,
      step: 'business_overview_complete',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).save();

    console.log('✅ Business overview analysis complete');
    res.json({ success: true, sessionId: sessionId.toString(), transcript, businessSummary, nextStep: 'validate_summary' });
  } catch (error) {
    console.error('❌ Error in business overview analysis:', error);
    res.status(500).json({ error: 'Failed to analyze business overview', details: error.message });
  }
};

// Step 2: Validate and Update Business Summary
exports.validateBusinessSummary = async (req, res) => {
  try {
    console.log('🔍 Validating business summary...');
    const { sessionId, corrections, isApproved } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const session = await BusinessSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (isApproved) {
      session.step = 'ready_for_product_analysis';
      session.businessSummaryApproved = true;
    } else if (corrections) {
      session.businessSummary = { ...session.businessSummary, ...corrections };
      session.step = 'ready_for_product_analysis';
      session.businessSummaryApproved = true;
    }

    session.updatedAt = new Date();
    await session.save();

    console.log('✅ Business summary validated');
    res.json({ success: true, sessionId, updatedSummary: session.businessSummary, nextStep: 'product_analysis' });
  } catch (error) {
    console.error('❌ Error validating business summary:', error);
    res.status(500).json({ error: 'Failed to validate business summary', details: error.message });
  }
};

// Step 4: Generate Final Recommendations
exports.generateRecommendations = async (req, res) => {
  try {
    console.log('🎯 Generating final recommendations...');
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const session = await BusinessSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const prompt = `Based on the following business and product analysis, provide a JSON object with: primaryRecommendations[{platform,priority,reason,implementation,expectedOutcome}], contentStrategy{focusAreas[],contentTypes[],postingFrequency}, marketingMessages{whatsapp,instagram,general}, nextSteps[].\n\nBUSINESS SUMMARY:\n${JSON.stringify(session.businessSummary, null, 2)}\n\nPRODUCT ANALYSIS:\n${JSON.stringify(session.productAnalysis, null, 2)}`;

    const [resp] = await textClient.generateText({
      model: MODEL_PATH,
      prompt: { text: prompt },
      temperature: 0.4,
      maxOutputTokens: 3072,
      topP: 0.8,
      topK: 40,
    });

    const aiText = (resp?.candidates || []).map(c => c.output || c.content || '').join('\n');
    const recommendations = extractFirstJson(aiText) || { rawResponse: aiText };

    session.finalRecommendations = recommendations;
    session.step = 'complete';
    session.updatedAt = new Date();
    await session.save();

    console.log('✅ Final recommendations generated');
    res.json({ success: true, sessionId, recommendations, businessSummary: session.businessSummary, productAnalysis: session.productAnalysis });
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
};
