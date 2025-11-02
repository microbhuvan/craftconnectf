import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ShopifyLaunchPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sessionData, setSessionData] = useState(null);
  const [productDetails, setProductDetails] = useState({ quantity: 10, artisanId: '' });

  useEffect(() => {
    // Load session data to show preview
    const session = JSON.parse(sessionStorage.getItem("craftConnectSession") || "{}");
    setSessionData(session);
  }, []);

  const publishToShopify = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      
      const session = JSON.parse(sessionStorage.getItem("craftConnectSession") || "{}");
      if (!session?.sessionId) {
        throw new Error("Session is missing. Please complete the business analysis first.");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shopify/publish-from-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: session.sessionId,
          quantity: productDetails.quantity,
          artisanId: productDetails.artisanId || undefined
        })
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to publish to Shopify");
      }
      
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductPreview = () => {
    if (!sessionData) return null;
    
    const productName = sessionData.productAnalysis?.productSummary?.name || "Your Craft Product";
    const description = sessionData.productAnalysis?.productSummary?.description || "Handcrafted with care and attention to detail.";
    const materials = sessionData.productAnalysis?.productSummary?.materials || [];
    const features = sessionData.productAnalysis?.productSummary?.uniqueFeatures || [];
    const pricingRange = sessionData.productAnalysis?.marketingInsights?.pricingRange || "Contact for pricing";
    const timeToMake = sessionData.productAnalysis?.productSummary?.timeToMake || "Custom timeline";
    const hasImages = sessionData.imageUrls?.length > 0 || sessionData.productImages?.length > 0;
    
    return {
      productName,
      description,
      materials: Array.isArray(materials) ? materials : [],
      features: Array.isArray(features) ? features : [],
      pricingRange,
      timeToMake,
      hasImages
    };
  };

  const preview = getProductPreview();

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
          <h1 className="text-4xl font-bold text-[#181411] mb-4">Launch on Shopify</h1>
          <p className="text-lg text-[#897261]">
            Create a professional product listing on your Shopify store
          </p>
        </div>

        {/* Product Preview */}
        {preview && (
          <div className="bg-white rounded-2xl shadow-xl border border-[#f4f2f0] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#181411] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.5 4.5c0-.83.67-1.5 1.5-1.5h6c.83 0 1.5.67 1.5 1.5v2.25H7.5V4.5zm0 3.75h9v9c0 .83-.67 1.5-1.5 1.5h-6c-.83 0-1.5-.67-1.5-1.5v-9z"/>
              </svg>
              Shopify Product Preview
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-6 border">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{preview.productName}</h3>
              <p className="text-gray-700 mb-4">{preview.description}</p>
              
              {preview.materials.length > 0 && (
                <div className="mb-3">
                  <span className="font-semibold text-gray-800">Materials: </span>
                  <span className="text-gray-600">{preview.materials.join(", ")}</span>
                </div>
              )}
              
              {preview.features.length > 0 && (
                <div className="mb-3">
                  <span className="font-semibold text-gray-800">Features:</span>
                  <ul className="list-disc list-inside mt-1 text-gray-600">
                    {preview.features.slice(0, 4).map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mb-3">
                <span className="font-semibold text-gray-800">Production Time: </span>
                <span className="text-gray-600">{preview.timeToMake}</span>
              </div>
              
              <div className="text-2xl font-bold text-green-600">{preview.pricingRange}</div>
              
              {preview.hasImages && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  Product images will be included
                </div>
              )}
            </div>
          </div>
        )}

        {/* Publishing Options */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#f4f2f0] p-8">
          <h2 className="text-2xl font-semibold text-[#181411] mb-4">Publishing Options</h2>
          <p className="text-[#897261] mb-6">
            Configure your product settings before publishing to Shopify.
          </p>

          {/* Configuration Form */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={productDetails.quantity}
                onChange={(e) => setProductDetails({...productDetails, quantity: parseInt(e.target.value) || 10})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ec6d13] focus:border-transparent"
                placeholder="10"
              />
              <p className="text-sm text-gray-500 mt-1">How many items do you have available?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artisan ID (Optional)
              </label>
              <input
                type="text"
                value={productDetails.artisanId}
                onChange={(e) => setProductDetails({...productDetails, artisanId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ec6d13] focus:border-transparent"
                placeholder="your-artisan-id"
              />
              <p className="text-sm text-gray-500 mt-1">For tracking and organization</p>
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={publishToShopify}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-[#96bf48] rounded-xl hover:bg-[#87a93f] focus:outline-none focus:ring-4 focus:ring-[#96bf48]/50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                <span>Publishing to Shopify...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.5 4.5c0-.83.67-1.5 1.5-1.5h6c.83 0 1.5.67 1.5 1.5v2.25H7.5V4.5zm0 3.75h9v9c0 .83-.67 1.5-1.5 1.5h-6c-.83 0-1.5-.67-1.5-1.5v-9z"/>
                </svg>
                <span>Publish Product to Shopify</span>
              </>
            )}
          </button>

          {/* Results */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div>
                  <h4 className="font-semibold text-red-800">Publishing Failed</h4>
                  <p className="text-red-700 mt-1">{error}</p>
                  {error.includes('Shopify') && (
                    <div className="mt-2 text-sm text-red-600">
                      <p>Shopify integration requires:</p>
                      <ul className="list-disc list-inside mt-1 ml-4">
                        <li>Store domain (e.g., your-store.myshopify.com)</li>
                        <li>Admin API access token</li>
                        <li>Proper API permissions for product management</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result?.url && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800">Successfully Published to Shopify!</h4>
                  <p className="text-green-700 mt-1">Your product is now live on your Shopify store.</p>
                  
                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-800 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Product on Store
                    </a>
                    
                    {result.product?.handle && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result.url);
                          alert('Product URL copied to clipboard!');
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-800 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Copy Product URL
                      </button>
                    )}
                  </div>

                  {result.autoInventory && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Inventory set to {productDetails.quantity} units
                    </p>
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
              What happens next?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your product will be created with all the analyzed details</li>
              <li>• Product images and descriptions are automatically formatted</li>
              <li>• Inventory is set based on your specified quantity</li>
              <li>• The product will be active and ready for customers to purchase</li>
              <li>• You can modify the product later in your Shopify admin panel</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShopifyLaunchPage;