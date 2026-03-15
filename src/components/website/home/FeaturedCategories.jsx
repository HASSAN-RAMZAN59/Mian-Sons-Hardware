import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import productsData from '../../../data/productsData';

const categoryStyles = {
  'Plumbing & Sanitary': { icon: '🚰', bg: 'bg-cyan-50', iconColor: 'text-cyan-600', accent: 'hover:border-cyan-400' },
  'Bath Accessories & Taps': { icon: '🚿', bg: 'bg-blue-50', iconColor: 'text-blue-600', accent: 'hover:border-blue-400' },
  'Paints & Accessories': { icon: '🎨', bg: 'bg-pink-50', iconColor: 'text-pink-600', accent: 'hover:border-pink-400' },
  'Electrical Hardware': { icon: '⚡', bg: 'bg-yellow-50', iconColor: 'text-yellow-600', accent: 'hover:border-yellow-400' }
};

const categories = ['Plumbing & Sanitary', 'Bath Accessories & Taps', 'Paints & Accessories', 'Electrical Hardware'].map((name) => ({
  name,
  count: productsData.filter((product) => product.category === name).length,
  ...categoryStyles[name]
}));

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut'
    }
  }
};

const FeaturedCategories = () => {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Shop by Category</h2>
        </div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {categories.map((category) => (
            <motion.div key={category.name} variants={cardVariants} whileHover={{ scale: 1.04, y: -4 }}>
              <Link
                to={`/shop?category=${encodeURIComponent(category.name)}`}
                className={`block rounded-xl border border-gray-200 p-5 ${category.bg} ${category.accent} transition-all duration-200`}
              >
                <div className="flex flex-col items-start gap-3">
                  <span className="text-4xl leading-none">{category.icon}</span>
                  <h3 className={`font-semibold text-base md:text-lg ${category.iconColor}`}>{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.count} Products</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedCategories;