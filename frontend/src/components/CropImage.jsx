import { cropColors } from '../data/mockData';

// Curated realistic Unsplash crop photos (free, no-auth needed via source.unsplash.com)
const CROP_PHOTOS = {
  'Tomato':      'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&q=80',
  'Potato':      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80',
  'Onion':       'https://images.unsplash.com/photo-1508747703725-719777637510?w=600&q=80',
  'Rice':        'https://images.unsplash.com/photo-1568347355280-d33fdf77d42a?w=600&q=80',
  'Wheat':       'https://images.unsplash.com/photo-1574323347407-f5e1ad6962f0?w=600&q=80',
  'Corn':        'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80',
  'Maize':       'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80',
  'Chilli':      'https://images.unsplash.com/photo-1585666060048-aebf39e94bb7?w=600&q=80',
  'Pepper':      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&q=80',
  'Mango':       'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80',
  'Banana':      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80',
  'Sugarcane':   'https://images.unsplash.com/photo-1597411049777-3f2ef2524527?w=600&q=80',
  'Cotton':      'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600&q=80',
  'Soybean':     'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
  'Groundnut':   'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&q=80',
  'Ragi':        'https://images.unsplash.com/photo-1574323347407-f5e1ad6962f0?w=600&q=80',
  'Jowar':       'https://images.unsplash.com/photo-1574323347407-f5e1ad6962f0?w=600&q=80',
  'Bajra':       'https://images.unsplash.com/photo-1574323347407-f5e1ad6962f0?w=600&q=80',
  'Turmeric':    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
  'Ginger':      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
  'Garlic':      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
  'Carrot':      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80',
  'Cabbage':     'https://images.unsplash.com/photo-1551754655-af87be5e9f77?w=600&q=80',
  'Cauliflower': 'https://images.unsplash.com/photo-1566202447-5a3f5a91c33d?w=600&q=80',
  'Brinjal':     'https://images.unsplash.com/photo-1634128221889-82ed6efebfc3?w=600&q=80',
  'Okra':        'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=600&q=80',
  'Peas':        'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80',
  'Beans':       'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=600&q=80',
  'Lemon':       'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=600&q=80',
  'Coconut':     'https://images.unsplash.com/photo-1550315859-ebf4b8f5adcb?w=600&q=80',
  'Papaya':      'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=600&q=80',
  'Grapes':      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&q=80',
  'Pomegranate': 'https://images.unsplash.com/photo-1580344738847-94b77a28e64a?w=600&q=80',
};

export default function CropImage({ cropName, photo, size = 'md', className = '' }) {
  const sizeClasses = {
    sm:  'w-full h-full',
    md:  'w-full h-56',
    lg:  'w-full h-80 rounded-2xl',
  };

  // Prefer farmer-uploaded photo, then match by crop name, then generic
  const normalizedName = cropName
    ? Object.keys(CROP_PHOTOS).find(k => cropName.toLowerCase().includes(k.toLowerCase())) 
    : null;
  const resolvedPhoto = photo || (normalizedName ? CROP_PHOTOS[normalizedName] : null)
    || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80'; // generic farm

  return (
    <div className={`${sizeClasses[size]} overflow-hidden ${className} relative group bg-gray-100`}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <img
        src={resolvedPhoto}
        alt={cropName || 'Crop'}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80';
        }}
      />
    </div>
  );
}
