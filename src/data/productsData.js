const baseProducts = [
  { id: 1, name: 'Pipe (Single)', size: '1 inch (10ft)', company: 'Adam G', type: 'Single Wall', category: 'Plumbing & Sanitary', purchasePrice: 200, salePrice: 250, unit: '10ft', tags: ['pipe', 'single', '1 inch', 'plumbing', 'adam g'] },
  { id: 2, name: 'Pipe (Double)', size: '1 inch (10ft)', company: 'Adam G', type: 'Double Wall', category: 'Plumbing & Sanitary', purchasePrice: 280, salePrice: 330, unit: '10ft', tags: ['pipe', 'double', '1 inch', 'plumbing', 'adam g'] },
  { id: 3, name: 'Pipe (Single)', size: '2 inch (10ft)', company: 'Adam G', type: 'Single Wall', category: 'Plumbing & Sanitary', purchasePrice: 410, salePrice: 430, unit: '10ft', tags: ['pipe', 'single', '2 inch', 'plumbing', 'adam g'] },
  { id: 4, name: 'Pipe (Double)', size: '2 inch (10ft)', company: 'Adam G', type: 'Double Wall', category: 'Plumbing & Sanitary', purchasePrice: 620, salePrice: 650, unit: '10ft', tags: ['pipe', 'double', '2 inch', 'plumbing', 'adam g'] },
  { id: 5, name: 'Pipe (Single)', size: '3 inch (13ft)', company: 'Adam G', type: 'Single Wall', category: 'Plumbing & Sanitary', purchasePrice: 880, salePrice: 980, unit: '10ft', tags: ['pipe', 'single', '3 inch', 'plumbing', 'adam g'] },
  { id: 6, name: 'Pipe (Double)', size: '3 inch (13ft)', company: 'Adam G', type: 'Double Wall', category: 'Plumbing & Sanitary', purchasePrice: 1250, salePrice: 1300, unit: '10ft', tags: ['pipe', 'double', '3 inch', 'plumbing', 'adam g'] },
  { id: 7, name: 'Pipe (Single)', size: '4 inch (10ft)', company: 'Adam G', type: 'Single Wall', category: 'Plumbing & Sanitary', purchasePrice: 770, salePrice: 830, unit: '10ft', tags: ['pipe', 'single', '4 inch', 'plumbing', 'adam g'] },
  { id: 8, name: 'Pipe (Double)', size: '4 inch (10ft)', company: 'Adam G', type: 'Double Wall', category: 'Plumbing & Sanitary', purchasePrice: 1080, salePrice: 1150, unit: '10ft', tags: ['pipe', 'double', '4 inch', 'plumbing', 'adam g'] },
  { id: 9, name: 'Water Tank', size: '250 Litre', company: 'Master', type: 'Plastic Tank', category: 'Plumbing & Sanitary', purchasePrice: 3000, salePrice: 3300, unit: 'Litre', tags: ['water tank', '250 litre', 'master', 'plumbing'] },
  { id: 10, name: 'Water Tank', size: '600 Litre', company: 'Master', type: 'Plastic Tank', category: 'Plumbing & Sanitary', purchasePrice: 4200, salePrice: 4800, unit: 'Litre', tags: ['water tank', '600 litre', 'master', 'plumbing'] },
  { id: 11, name: 'Water Tank', size: '350 Litre', company: 'Master', type: 'Plastic Tank', category: 'Plumbing & Sanitary', purchasePrice: 3500, salePrice: 4200, unit: 'Litre', tags: ['water tank', '350 litre', 'master', 'plumbing'] },
  { id: 12, name: 'Sink Bowl', size: '14x17', company: 'Master', type: 'Kitchen Sink', category: 'Plumbing & Sanitary', purchasePrice: 1300, salePrice: 1600, unit: 'Piece', tags: ['sink bowl', '14x17', 'master', 'sanitary'] },
  { id: 13, name: 'Sink Bowl', size: '15x19', company: 'Master', type: 'Kitchen Sink', category: 'Plumbing & Sanitary', purchasePrice: 1400, salePrice: 1700, unit: 'Piece', tags: ['sink bowl', '15x19', 'master', 'sanitary'] },
  { id: 14, name: 'Basin', size: 'Large (White)', company: 'Master', type: 'Wash Basin', category: 'Plumbing & Sanitary', purchasePrice: 3300, salePrice: 3700, unit: 'Piece', tags: ['basin', 'large', 'white', 'master', 'sanitary'] },
  { id: 15, name: 'Basin', size: 'Med (Blue/Grey)', company: 'Master', type: 'Wash Basin', category: 'Plumbing & Sanitary', purchasePrice: 2300, salePrice: 2700, unit: 'Piece', tags: ['basin', 'medium', 'blue', 'grey', 'master', 'sanitary'] },

  { id: 16, name: 'Bath Seat', size: '', company: 'Master', type: 'Blue / White / Pink', category: 'Bath Accessories & Taps', purchasePrice: 1300, salePrice: 1500, unit: 'Piece', tags: ['bath seat', 'master', 'bathroom', 'accessories'] },
  { id: 17, name: 'Bath Seat', size: '', company: 'Capital', type: 'White', category: 'Bath Accessories & Taps', purchasePrice: 1700, salePrice: 2000, unit: 'Piece', tags: ['bath seat', 'capital', 'white', 'bathroom'] },
  { id: 18, name: 'Simple Tap', size: '', company: 'Hi-Fine', type: 'Spindle / Bush', category: 'Bath Accessories & Taps', purchasePrice: 220, salePrice: 260, unit: 'Piece', tags: ['tap', 'simple tap', 'hi-fine', 'spindle', 'bush'] },
  { id: 19, name: 'Simple Tap', size: '', company: 'Master', type: 'Plastic', category: 'Bath Accessories & Taps', purchasePrice: 70, salePrice: 100, unit: 'Piece', tags: ['tap', 'simple tap', 'master', 'plastic'] },
  { id: 20, name: 'T-Cock', size: '', company: 'Fine', type: 'Plastic/Metal', category: 'Bath Accessories & Taps', purchasePrice: 250, salePrice: 280, unit: 'Piece', tags: ['t-cock', 'fine', 'plastic', 'metal', 'bath taps'] },
  { id: 21, name: 'Basin Tap', size: '', company: 'Fine', type: 'Plastic/Metal', category: 'Bath Accessories & Taps', purchasePrice: 320, salePrice: 380, unit: 'Piece', tags: ['basin tap', 'fine', 'bath taps', 'plastic', 'metal'] },
  { id: 22, name: 'Muslim Shower', size: '', company: 'Master', type: 'Plastic/Metal', category: 'Bath Accessories & Taps', purchasePrice: 470, salePrice: 550, unit: 'Piece', tags: ['muslim shower', 'master', 'bath shower'] },
  { id: 23, name: 'Shower Head', size: '', company: 'Master', type: 'Plastic/Metal', category: 'Bath Accessories & Taps', purchasePrice: 200, salePrice: 280, unit: 'Piece', tags: ['shower head', 'master', 'bath shower'] },

  { id: 24, name: 'Paint Brush', size: '1 inch', company: 'Local', type: 'Brush', category: 'Paints & Accessories', purchasePrice: 20, salePrice: 30, unit: 'Piece', tags: ['paint brush', '1 inch', 'local', 'paint'] },
  { id: 25, name: 'Paint Brush', size: '2 inch', company: 'Local', type: 'Brush', category: 'Paints & Accessories', purchasePrice: 35, salePrice: 50, unit: 'Piece', tags: ['paint brush', '2 inch', 'local', 'paint'] },
  { id: 26, name: 'Paint Brush', size: '3 inch', company: 'Local', type: 'Brush', category: 'Paints & Accessories', purchasePrice: 110, salePrice: 150, unit: 'Piece', tags: ['paint brush', '3 inch', 'local', 'paint'] },
  { id: 27, name: 'Paint Brush', size: '5 inch', company: 'Local', type: 'Brush', category: 'Paints & Accessories', purchasePrice: 210, salePrice: 250, unit: 'Piece', tags: ['paint brush', '5 inch', 'local', 'paint'] },
  { id: 28, name: 'Paint Spray', size: 'Silver', company: 'Local', type: 'Spray Paint', category: 'Paints & Accessories', purchasePrice: 280, salePrice: 350, unit: 'Piece', tags: ['paint spray', 'silver', 'local', 'paint'] },
  { id: 29, name: 'Paint Spray', size: 'Black/Yellow/Red', company: 'Local', type: 'Spray Paint', category: 'Paints & Accessories', purchasePrice: 280, salePrice: 350, unit: 'Piece', tags: ['paint spray', 'black', 'yellow', 'red', 'local'] },

  { id: 30, name: 'Wiring Pipe', size: '10ft', company: 'Local', type: 'White', category: 'Electrical Hardware', purchasePrice: 68, salePrice: 75, unit: '10ft', tags: ['wiring pipe', '10ft', 'electrical', 'white'] },
  { id: 31, name: 'Fan Box', size: '5ft', company: 'Local', type: 'White', category: 'Electrical Hardware', purchasePrice: 130, salePrice: 190, unit: 'Piece', tags: ['fan box', 'electrical', 'white'] },
  { id: 32, name: 'Bulb', size: '13 Watt', company: 'Pak', type: 'Pak', category: 'Electrical Hardware', purchasePrice: 110, salePrice: 150, unit: 'Piece', tags: ['bulb', '13 watt', 'electrical', 'pak'] },
  { id: 33, name: 'Circuit Breaker', size: '15/20 Amp', company: 'Local', type: 'Grey', category: 'Electrical Hardware', purchasePrice: 290, salePrice: 320, unit: 'Piece', tags: ['circuit breaker', '15 amp', '20 amp', 'electrical'] },
  { id: 34, name: 'Main Breaker', size: '100/150 Amp', company: 'Local', type: 'Red', category: 'Electrical Hardware', purchasePrice: 970, salePrice: 1100, unit: 'Piece', tags: ['main breaker', '100 amp', '150 amp', 'electrical'] },
  { id: 35, name: 'Bulb Holder', size: 'Medium', company: 'Local', type: 'White', category: 'Electrical Hardware', purchasePrice: 35, salePrice: 50, unit: 'Piece', tags: ['bulb holder', 'medium', 'electrical', 'white'] },
  { id: 36, name: 'Change Over', size: '10 Amp', company: 'Local', type: 'Button', category: 'Electrical Hardware', purchasePrice: 950, salePrice: 1100, unit: 'Piece', tags: ['change over', '10 amp', 'electrical', 'button'] },
  { id: 37, name: 'DP', size: 'Small', company: 'Local', type: 'Brown', category: 'Electrical Hardware', purchasePrice: 700, salePrice: 850, unit: 'Piece', tags: ['dp', 'small', 'electrical', 'brown'] }
];

const imageUrlsById = {
  1: ['/images/products/pipe-single-1-inch-10ft.jpg'],
  2: ['/images/products/pipe-double-1-inch-10ft.jpg'],
  3: ['/images/products/pipe-single-2-inch-10ft.jpg'],
  4: ['/images/products/pipe-double-2-inch-10ft.jpg'],
  5: ['/images/products/pipe-single-3-inch-13ft.png'],
  6: ['/images/products/pipe-double-3-inch-13ft.jpg'],
  7: ['/images/products/pipe-single-4-inch-10ft.jpg'],
  8: ['/images/products/pipe-double-4-inch-10ft.jpg'],
  9: ['/images/products/water-tank-250-350-litre.jpg'],
  10: ['/images/products/water-tank-600-litre.jpg'],
  11: ['/images/products/water-tank-250-350-litre.jpg'],
  12: ['/images/products/sink-bowl-14x17.jpg'],
  13: ['/images/products/sink-bowl-15x19.jpg'],
  14: ['/images/products/basin-large-white.jpg'],
  15: ['/images/products/basin-med-blue-grey.jpg'],
  16: ['/images/products/bath-seat-master.jpg'],
  17: ['/images/products/bath-seat-capital.jpg'],
  18: ['/images/products/simple-tap.jpg'],
  19: ['/images/products/simple-tap-master.jpg'],
  20: ['/images/products/t-cock-fine.jpg'],
  21: ['/images/products/basin-tap.jpg'],
  22: ['/images/products/muslim-shower.jpg'],
  23: ['/images/products/shower-head-master.jpg'],
  24: ['/images/products/paint-brush-1-inch.jpg'],
  25: ['/images/products/paint-brush-2-inch.jpg'],
  26: ['/images/products/paint-brush-3-inch.jpg'],
  27: ['/images/products/paint-brush-5-inch.jpg'],
  28: ['/images/products/paint-spray-silver.jpg'],
  29: ['/images/products/paint-spray-black-yellow-red.jpg'],
  30: ['/images/products/wiring-pipe-10ft.jpg'],
  31: ['/images/products/fan-box-5ft.jpg'],
  32: ['/images/products/bulb-13-watt.jpg'],
  33: ['/images/products/circuit-breaker-15-20-amp.jpg'],
  34: ['/images/products/main-breaker-100-150-amp.jpg'],
  35: ['/images/products/bulb-holder-medium.jpg'],
  36: ['/images/products/change-over-10-amp.jpg'],
  37: ['/images/products/dp-small.jpg']
};

const stockQtyValues = [
  24, 18, 30, 16, 22, 14, 27, 19, 12, 15, 13, 26, 21, 11, 17,
  20, 12, 35, 40, 28, 24, 18, 25,
  45, 38, 32, 27, 23, 21,
  48, 31, 29, 22, 16, 33, 14, 19
];

const buildDescription = (product) => {
  const details = [product.size, product.type].filter(Boolean).join(' • ');
  return `${product.name} by ${product.company}${details ? ` (${details})` : ''} for reliable daily hardware use.`;
};

export const productsData = baseProducts.map((product, index) => {
  const stockQty = stockQtyValues[index] || 10;

  return {
    ...product,
    inStock: true,
    stockQty,
    stock: stockQty,
    currentStock: stockQty,
    minStock: 5,
    rating: null,
    reviewCount: 0,
    description: buildDescription(product),
    isFeatured: index < 8,
    isNewArrival: index >= baseProducts.length - 10,
    isNew: index >= baseProducts.length - 10,
    bestSeller: index < 12,
    discount: 0,
    images: imageUrlsById[product.id] || [],
    brand: product.company,
    price: product.salePrice
  };
});

export default productsData;
