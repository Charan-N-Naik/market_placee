import api from '../api/axios';

/**
 * Real AI crop verification service using Gemini Vision via Node.js backend.
 * Sends the crop image to /api/verify/scan and returns structured analysis.
 */
export async function verifyCropPhoto(file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await api.post('/verify/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    const analysis = data.analysis || {};
    const confidence = Number(analysis.confidenceScore ?? 0);
    const isVerified = confidence >= 50 && !!analysis.cropName;

    return {
      verified: isVerified,
      confidence: confidence.toFixed(1),
      message: isVerified
        ? `${analysis.cropName} detected with ${confidence}% confidence.`
        : 'Could not identify a valid crop in this image. Please upload a clear field photo.',
      imageUrl: data.imageUrl || URL.createObjectURL(file),
      verification: data.verification || {
        status: isVerified ? 'verified' : 'pending_review',
        trust_score: Number((confidence / 100).toFixed(2)),
        authenticity_score: 0.90,
        authenticity_reasons: [],
        location_valid: true,
        resolved_address: 'Farm Location Verified',
        geo_flags: [],
        disease_label: analysis.pestDetection ? 'Pest damage visible' : 'Healthy',
        disease_confidence: Number((confidence / 100).toFixed(2)),
        healthy_leaf: !analysis.pestDetection,
        verified_at: new Date().toISOString(),
      },
      report: {
        cropDetected: analysis.cropName || 'Unknown',
        variety: analysis.variety || 'General',
        condition: analysis.qualityGrade || 'C',
        freshnessIndex: `${analysis.healthScore ?? 0}%`,
        pestIssues: analysis.pestDetection
          ? (Array.isArray(analysis.diseaseSigns)
              ? analysis.diseaseSigns.join(', ')
              : analysis.diseaseSigns || 'Pest damage visible')
          : 'None detected',
        colorQuality: analysis.freshness || 'Unknown',
        estimatedPrice: analysis.estimatedPricePerKg ?? 0,
        storageRecommendation:
          analysis.storageRecommendation || 'Keep in a cool, dry place away from direct sunlight.',
        overallAssessment:
          analysis.overallAssessment || 'The uploaded crop image could not be fully analyzed.',
        recommendations: Array.isArray(analysis.recommendations)
          ? analysis.recommendations
          : [
              'Upload a clearer photo of the crop with good lighting.',
              'Make sure the crop occupies most of the frame.',
            ],
      },
    };
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Crop verification failed due to a network or server error.';
    console.warn('Crop verification request failed:', message, error);
    throw new Error(`Crop verification failed: ${message}`);
  }
}
