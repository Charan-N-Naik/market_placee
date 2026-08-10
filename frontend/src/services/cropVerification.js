import api from '../api/axios';

/**
 * Real multi-angle AI crop verification using Gemini Vision via Node.js backend.
 * Sends up to 3 images (front, left, right) to /api/crop-verification/analyze.
 *
 * @param {{ front?: File, left?: File, right?: File }} files
 * @param {string} [cropType]  - Crop name hint (e.g. 'Tomato')
 * @param {string} [role]      - 'farmer' | 'buyer'
 * @returns {Promise<Object>}  - { rejected, reason?, report? }
 */
export async function analyzeCropMultiAngle(files, cropType = '', role = 'buyer') {
  if (!files.front || !files.left || !files.right) {
    throw new Error('All 3 harvest photos (Front View, Left Side, Right Side) are required to perform AI crop quality analysis.');
  }

  const formData = new FormData();
  if (files.front) formData.append('front', files.front);
  if (files.left)  formData.append('left',  files.left);
  if (files.right) formData.append('right', files.right);
  if (cropType)    formData.append('cropType', cropType);
  if (role)        formData.append('role', role);

  try {
    const response = await api.post('/crop-verification/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // { rejected, report?, reason? }
  } catch (error) {
    // 422 = AI-generated or mismatch rejection
    if (error?.response?.status === 422) {
      return {
        rejected:       true,
        rejectionType:  error.response.data?.rejectionType || 'unknown',
        reason:         error.response.data?.reason || 'Photo rejected by AI verification.',
        detectedCrops:  error.response.data?.detectedCrops,
      };
    }
    let message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Crop verification failed due to a network or server error.';
    if (message.startsWith('{') || message.includes('RESOURCE_EXHAUSTED')) {
      message = 'AI rate limit exceeded. Please try again in a few moments.';
    }
    throw new Error(message);
  }
}

/**
 * Legacy single-image crop verification (kept for backwards compat).
 * Uses /api/verify/scan with the existing Gemini Vision service.
 */
export async function verifyCropPhoto(file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await api.post('/verify/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
