import express from 'express';
import GovernmentScheme from '../models/GovernmentScheme.js';

const router = express.Router();

/**
 * @route   GET /api/schemes
 * @desc    Fetch verified Central & State Government Schemes with filters & search
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      state = '',
      governmentType = '',
      category = '',
      farmerCategory = '',
      search = '',
      status = ''
    } = req.query;

    const filter = {};

    if (governmentType && governmentType.toLowerCase() !== 'all') {
      filter.governmentType = new RegExp(`^${governmentType}$`, 'i');
    }

    if (state && state.toLowerCase() !== 'all india' && state.toLowerCase() !== 'all') {
      filter.$or = [
        { state: new RegExp(state, 'i') },
        { state: 'All India' }
      ];
    }

    if (category && category.toLowerCase() !== 'all') {
      filter.category = new RegExp(category, 'i');
    }

    if (farmerCategory && farmerCategory.toLowerCase() !== 'all') {
      filter.$or = [
        { farmerCategory: farmerCategory },
        { farmerCategory: 'all' }
      ];
    }

    if (status && status.toLowerCase() !== 'all') {
      filter.status = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { schemeName: searchRegex },
          { shortDescription: searchRegex },
          { benefits: searchRegex },
          { department: searchRegex },
          { keywords: searchRegex }
        ]
      });
    }

    const schemes = await GovernmentScheme.find(filter).sort({ governmentType: 1, syncedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes
    });
  } catch (error) {
    console.error('Error fetching government schemes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve government schemes from server.'
    });
  }
});

/**
 * @route   GET /api/schemes/:id
 * @desc    Get detailed single scheme by ID or code
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let scheme = null;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      scheme = await GovernmentScheme.findById(id).lean();
    }
    
    if (!scheme) {
      scheme = await GovernmentScheme.findOne({ code: id.toUpperCase() }).lean();
    }

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Government scheme not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error fetching scheme details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving scheme details.'
    });
  }
});

export default router;
