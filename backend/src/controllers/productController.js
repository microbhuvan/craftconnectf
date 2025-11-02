const { SpeechClient } = require('@google-cloud/speech');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const mongoose = require('mongoose');
const BusinessSession = require('../models/BusinessSession');
const Product = require('../models/Product');

// Initialize Google Cloud clients
const speechClient = new SpeechClient();
const visionClient = new ImageAnnotatorClient();
const aiplatformClient = new PredictionServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

const MODEL_NAME = process.env.VERTEX_MODEL || 'gemini-2.5-flash';
const MODEL_ENDPOINT = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL_NAME}`;

// Step 3: Comprehensive Product Analysis (Voice + Images)
exports.analyzeComprehensive = async (req, res) => {
  try {
    console.log('🎨 Starting comprehensive product analysis...');

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await BusinessSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let productTranscript = '';
    let imageAnalyses = [];

    // Process audio if provided
    if (req.files && req.files.audio && req.files.audio[0]) {
      console.log('🎤 Processing product audio description...');
      
      const audioBytes = req.files.audio[0].buffer.toString('base64');
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
      productTranscript = response.results
        ?.map(result => result.alternatives[0]?.transcript)
        .join(' ') || '';

      console.log('📝 Product transcript:', productTranscript);
    }

    // Process images if provided
    if (req.files && req.files.images) {
      console.log(`📸 Processing ${req.files.images.length} product images...`);
      
      for (let i = 0; i < req.files.images.length; i++) {
        const imageFile = req.files.images[i];
        
        try {
          // Analyze image with Vision API
          const visionRequest = {
            image: { content: imageFile.buffer.toString('base64') },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'TEXT_DETECTION' },
              { type: 'IMAGE_PROPERTIES' },
              { type: 'SAFE_SEARCH_DETECTION' }
            ],
          };

          const [visionResponse] = await visionClient.annotateImage(visionRequest);
          
          const analysis = {
            imageIndex: i + 1,
            labels: visionResponse.labelAnnotations?.map(label => ({
              description: label.description,
              score: label.score
            })) || [],
            objects: visionResponse.localizedObjectAnnotations?.map(obj => ({
              name: obj.name,
              score: obj.score
            })) || [],
            text: visionResponse.textAnnotations?.[0]?.description || '',
            colors: visionResponse.imagePropertiesAnnotation?.dominantColors?.colors?.slice(0, 5).map(color => ({
              red: color.color?.red || 0,
              green: color.color?.green || 0,
              blue: color.color?.blue || 0,
              score: color.score
            })) || []
          };

          imageAnalyses.push(analysis);
          console.log(`✅ Image ${i + 1} analyzed successfully`);
        } catch (error) {
          console.error(`❌ Error analyzing image ${i + 1}:`, error);
          imageAnalyses.push({
            imageIndex: i + 1,
            error: 'Failed to analyze image',
            details: error.message
          });
        }
      }
    }

    // Combine business context with product information for comprehensive analysis
    const comprehensiveAnalysisPrompt = `
Analyze this craft product with both business context and detailed product information:

BUSINESS CONTEXT:
${JSON.stringify(session.businessSummary, null, 2)}

PRODUCT VOICE DESCRIPTION:
"${productTranscript}"

IMAGE ANALYSIS RESULTS:
${JSON.stringify(imageAnalyses, null, 2)}

Provide a comprehensive JSON response with:
{
  "productSummary": {
    "name": "product name",
    "category": "product category",
    "materials": ["material1", "material2"],
    "techniques": ["technique1", "technique2"],
    "uniqueFeatures": ["feature1", "feature2"],
    "qualityLevel": "beginner/intermediate/professional",
    "timeToMake": "estimated time",
    "difficulty": "easy/medium/hard"
  },
  "visualAnalysis": {
    "overallAppearance": "description",
    "colorScheme": ["color1", "color2"],
    "craftsmanship": "assessment of quality",
    "marketAppeal": "how appealing to customers",
    "photographyQuality": "assessment of photos",
    "improvementSuggestions": ["suggestion1", "suggestion2"]
  },
  "marketingInsights": {
    "targetAudience": "who would buy this",
    "pricingRange": "suggested price range",
    "sellingPoints": ["point1", "point2"],
    "competitiveAdvantage": "what makes it special",
    "seasonality": "best time to sell"
  },
  "digitalMarketingStrategy": {
    "instagramHashtags": ["#tag1", "#tag2", "#tag3"],
    "keywordFocus": ["keyword1", "keyword2"],
    "contentAngles": ["angle1", "angle2"],
    "platformSuitability": {
      "instagram": "why good/bad for Instagram",
      "facebook": "why good/bad for Facebook",
      "whatsapp": "why good/bad for WhatsApp marketing",
      "website": "why good/bad for website"
    }
  },
  "recommendations": {
    "immediate": ["action1", "action2"],
    "shortTerm": ["action1", "action2"],
    "longTerm": ["action1", "action2"]
  }
}

Be specific and actionable. Use the business context to make personalized recommendations.`;

    console.log('🤖 Sending to Vertex AI for comprehensive analysis...');

    const vertexRequest = {
      endpoint: MODEL_ENDPOINT,
      instances: [{ content: comprehensiveAnalysisPrompt }],
      parameters: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        topP: 0.8,
        topK: 40,
      },
    };

    const [aiResponse] = await aiplatformClient.predict(vertexRequest);
    const aiContent = aiResponse.predictions[0]?.content || '';
    
    // Extract JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    let productAnalysis;
    
    if (jsonMatch) {
      try {
        productAnalysis = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Error parsing product analysis JSON:', error);
        productAnalysis = { error: 'Failed to parse AI response', rawResponse: aiContent };
      }
    } else {
      productAnalysis = { error: 'No JSON found in response', rawResponse: aiContent };
    }

    // Update session with product analysis
    session.productTranscript = productTranscript;
    session.imageAnalyses = imageAnalyses;
    session.productAnalysis = productAnalysis;
    session.step = 'product_analysis_complete';
    session.updatedAt = new Date();
    await session.save();

    console.log('✅ Comprehensive product analysis complete');

    res.json({
      success: true,
      sessionId,
      productTranscript,
      imageAnalyses,
      productAnalysis,
      nextStep: 'generate_recommendations'
    });

  } catch (error) {
    console.error('❌ Error in comprehensive product analysis:', error);
    res.status(500).json({
      error: 'Failed to analyze product comprehensively',
      details: error.message
    });
  }
};

// Existing functions (keeping for backward compatibility)
exports.processProduct = async (req, res) => {
  try {
    console.log('🔄 Processing product with existing method...');
    // Keep existing implementation for backward compatibility
    // This can be the fallback method
    
    res.json({
      success: true,
      message: 'Please use the new comprehensive analysis endpoint',
      recommendedEndpoint: '/api/products/analyze-comprehensive'
    });
  } catch (error) {
    console.error('❌ Error in process product:', error);
    res.status(500).json({
      error: 'Failed to process product',
      details: error.message
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find in BusinessSession first (new flow)
    let product = await BusinessSession.findById(id);
    
    if (!product) {
      // Fallback to Product model (old flow)
      product = await Product.findById(id);
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('❌ Error getting product:', error);
    res.status(500).json({
      error: 'Failed to get product',
      details: error.message
    });
  }
};

exports.approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, feedback } = req.body;
    
    // Try to find in BusinessSession first (new flow)
    let product = await BusinessSession.findById(id);
    
    if (product) {
      product.productApproved = approved;
      product.productFeedback = feedback;
      product.step = approved ? 'ready_for_recommendations' : 'product_needs_revision';
      product.updatedAt = new Date();
      await product.save();
    } else {
      // Fallback to Product model (old flow)
      product = await Product.findByIdAndUpdate(
        id,
        { 
          approved, 
          feedback, 
          updatedAt: new Date() 
        },
        { new: true }
      );
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      product,
      nextStep: approved ? 'generate_recommendations' : 'revise_product'
    });
  } catch (error) {
    console.error('❌ Error approving product:', error);
    res.status(500).json({
      error: 'Failed to approve product',
      details: error.message
    });
  }
};
