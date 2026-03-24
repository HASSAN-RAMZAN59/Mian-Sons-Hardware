import React from 'react';
import { motion } from 'framer-motion';

const NewsletterSection = () => {
  return (
    <section className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-4"
      >
        <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-700 p-6 md:p-10 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Stay Updated with Latest Offers</h2>
          <p className="text-blue-100 mb-5">Subscribe to receive discounts, new arrivals, and bulk deal alerts.</p>

          <form onSubmit={(event) => event.preventDefault()} className="max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-md border-0 text-gray-800 focus:ring-secondary"
              />
              <button type="submit" className="px-5 py-3 bg-secondary text-white rounded-md font-semibold hover:opacity-90">
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default NewsletterSection;