import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const FacebookPostPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    // Load session data to show preview
    const session = JSON.parse(sessionStorage.getItem("craftConnectSession") || "{}");
    setSessionData(session);
  }, []);

  const postPhoto = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      
      const session = JSON.parse(sessionStorage.getItem("craftConnectSession") || "{}");
      if (!session?.sessionId) {
        throw new Error("Session is missing. Please complete the business analysis first.");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facebook/post-photo-from-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to post to Facebook");
      }
      
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const postText = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      
      const session = JSON.parse(sessionStorage.getItem("craftConnectSession") || "{}");
      if (!session?.sessionId) {
        throw new Error("Session is missing. Please complete the business analysis first.");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facebook/post-text-from-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to post to Facebook");
      }
      
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewContent = () => {
    if (!sessionData) return null;
    
    const businessName = sessionData.businessSummary?.businessName || "Your Business";
    const productName = sessionData.productAnalysis?.productSummary?.name || "Your Product";
    const features = sessionData.productAnalysis?.productSummary?.uniqueFeatures || [];
    const pricing = sessionData.productAnalysis?.marketingInsights?.pricingRange || "Contact for pricing";
    
    return {
      businessName,
      productName,
      features: features.slice(0, 3),
      pricing,
      hasImages: sessionData.imageUrls?.length > 0 || sessionData.productImages?.length > 0
    };
  };

  const preview = getPreviewContent();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
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

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#181411] mb-4">Post to Facebook</h1>
          <p className="text-lg text-[#897261]">
            Share your craft business and products with your Facebook audience
          </p>
        </div>

        {/* Preview Section */}
        {preview && (
          <div className="bg-white rounded-2xl shadow-xl border border-[#f4f2f0] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#181411] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook Post Preview
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="font-semibold text-gray-900">{preview.businessName}</div>
              <div className="mt-2 text-gray-700">
                <p className="font-medium">{preview.productName}</p>
                {preview.features.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    {preview.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 font-medium text-green-600">{preview.pricing}</p>
              </div>
              {preview.hasImages && (
                <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  Product images will be included
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#f4f2f0] p-8">
          <h2 className="text-2xl font-semibold text-[#181411] mb-4">Choose Posting Option</h2>
          <p className="text-[#897261] mb-6">
            Create a Facebook post using your analyzed product information and images. 
            Your business details and product features will be automatically formatted for social media.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={postPhoto}
              disabled={loading}
              className="flex flex-col items-center p-6 border-2 border-[#ec6d13] rounded-xl hover:bg-[#ec6d13]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 bg-[#ec6d13] text-white rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-[#181411] mb-2">Post with Photo</h3>
              <p className="text-sm text-[#897261] text-center">Share your product image with an engaging caption</p>
            </button>

            <button
              onClick={postText}
              disabled={loading}
              className="flex flex-col items-center p-6 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C0,3.89 20.11,3 19,3Z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-[#181411] mb-2">Text Only Post</h3>
              <p className="text-sm text-[#897261] text-center">Share your business story and product details as text</p>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ec6d13] border-t-transparent"></div>
              <span className="ml-3 text-[#181411]">Posting to Facebook...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="font-semibold text-red-800">Posting Failed</h4>
                  <p className="text-red-700 mt-1">{error}</p>
                  {error.includes('Facebook not configured') && (
                    <div className="mt-2 text-sm text-red-600">
                      <p>Facebook integration needs to be set up with:</p>
                      <ul className="list-disc list-inside mt-1 ml-4">
                        <li>Facebook Page ID</li>
                        <li>Page Access Token</li>
                        <li>Proper permissions (pages_manage_posts, pages_read_engagement)</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="font-semibold text-green-800">Successfully Posted to Facebook!</h4>
                  <p className="text-green-700 mt-1">Your post has been shared with your Facebook audience.</p>
                  {result.postId && (
                    <p className="text-sm text-green-600 mt-2">Post ID: {result.postId}</p>
                  )}
                  {result.photoId && (
                    <p className="text-sm text-green-600">Photo ID: {result.photoId}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              How it works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your business information and product details are automatically formatted for Facebook</li>
              <li>• "Post with Photo" includes your product image and description</li>
              <li>• "Text Only" creates a compelling text post about your business</li>
              <li>• Posts are published directly to your connected Facebook page</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FacebookPostPage;