import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: '',
    title: 'Genuine Products',
    description: '100% original brands guaranteed',
    accent: 'from-green-500 to-emerald-500'
  },
  {
    icon: '',
    title: 'Fast Delivery',
    description: 'Same day delivery in city',
    accent: 'from-blue-500 to-cyan-500'
  },
  {
    icon: '',
    title: 'Best Prices',
    description: 'Price match guarantee',
    accent: 'from-orange-500 to-red-500'
  },
  {
    icon: '',
    title: 'Expert Advice',
    description: 'Technical support available',
    accent: 'from-primary to-blue-500'
  }
];

const WhyChooseUs = () => {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Why Choose Mian & Sons?</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group rounded-xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.accent} text-white flex items-center justify-center text-2xl mb-4`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-6">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;