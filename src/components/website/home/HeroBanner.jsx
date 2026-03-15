import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBoxOpen, FaCheckCircle, FaShippingFast, FaTools } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const contentMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' }
};

const HeroBanner = () => {
  const offerEndTime = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 3);
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = offerEndTime.getTime() - now;

      if (distance <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((distance / (1000 * 60)) % 60),
        seconds: Math.floor((distance / 1000) % 60)
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [offerEndTime]);

  return (
    <section className="w-full">
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          navigation
          pagination={{ clickable: true }}
          loop
          className="hero-swiper"
        >
          <SwiperSlide>
            <div
              className="text-white bg-cover bg-center"
              style={{
                backgroundImage: "linear-gradient(to right, rgba(30, 64, 175, 0.88), rgba(37, 99, 235, 0.82)), url('https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200')"
              }}
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 items-center min-h-[380px]">
                <motion.div {...contentMotion}>
                  <p className="uppercase tracking-wide text-sm text-blue-100 mb-3">Complete Hardware Solutions</p>
                  <h2 className="text-3xl lg:text-5xl font-bold leading-tight mb-4">Your One-Stop Hardware Shop</h2>
                  <p className="text-blue-100 text-base lg:text-lg mb-7">
                    Quality tools and construction materials at best prices
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 bg-secondary hover:opacity-90 text-white px-5 py-3 rounded-md font-semibold"
                    >
                      Shop Now
                      <FaArrowRight size={12} />
                    </Link>
                    <Link
                      to="/brands"
                      className="inline-flex items-center border border-white text-white px-5 py-3 rounded-md font-semibold hover:bg-white/10"
                    >
                      View Catalogue
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="hidden lg:flex justify-end"
                >
                  <div className="w-[360px] h-[260px] rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 flex flex-col justify-between">
                    <FaTools size={46} className="text-secondary" />
                    <div>
                      <p className="text-white text-2xl font-bold">Premium Tools</p>
                      <p className="text-blue-100 text-sm">Drills, grinders, cutters and more</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </SwiperSlide>

          <SwiperSlide>
            <div
              className="text-white bg-cover bg-center"
              style={{
                backgroundImage: "linear-gradient(to right, rgba(17, 24, 39, 0.85), rgba(30, 58, 138, 0.75)), url('https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200')"
              }}
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 items-center min-h-[380px]">
                <motion.div {...contentMotion}>
                  <p className="uppercase tracking-wide text-sm text-orange-200 mb-3">Power Tools Sale</p>
                  <h2 className="text-3xl lg:text-5xl font-bold leading-tight mb-4">Up to 30% OFF on Power Tools</h2>
                  <p className="text-gray-200 text-base lg:text-lg mb-6">Bosch, Makita, Stanley - All top brands available</p>

                  <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6 max-w-md">
                    {[
                      { label: 'Days', value: countdown.days },
                      { label: 'Hours', value: countdown.hours },
                      { label: 'Minutes', value: countdown.minutes },
                      { label: 'Seconds', value: countdown.seconds }
                    ].map((item) => (
                      <div key={item.label} className="bg-white/10 border border-white/20 rounded-md py-3 text-center">
                        <p className="text-xl font-bold text-secondary">{String(item.value).padStart(2, '0')}</p>
                        <p className="text-[11px] text-gray-200 uppercase">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/shop?offer=true"
                    className="inline-flex items-center gap-2 bg-secondary hover:opacity-90 text-white px-5 py-3 rounded-md font-semibold"
                  >
                    Grab Offer
                    <FaArrowRight size={12} />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="hidden lg:flex justify-end"
                >
                  <div className="w-[360px] h-[260px] rounded-2xl bg-secondary/15 border border-secondary/40 p-6 flex flex-col justify-between">
                    <FaTools size={44} className="text-secondary" />
                    <p className="text-2xl font-bold">Top Brand Power Tools</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </SwiperSlide>

          <SwiperSlide>
            <div
              className="text-white bg-cover bg-center"
              style={{
                backgroundImage: "linear-gradient(to right, rgba(75, 85, 99, 0.82), rgba(55, 65, 81, 0.78)), url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200')"
              }}
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 items-center min-h-[380px]">
                <motion.div {...contentMotion}>
                  <p className="uppercase tracking-wide text-sm text-gray-200 mb-3">Construction Materials</p>
                  <h2 className="text-3xl lg:text-5xl font-bold leading-tight mb-4">Build Your Dream</h2>
                  <p className="text-gray-100 text-base lg:text-lg mb-7">
                    Cement, Tiles, Pipes, Wires - Everything you need
                  </p>
                  <Link
                    to="/shop?category=Construction"
                    className="inline-flex items-center gap-2 bg-secondary hover:opacity-90 text-white px-5 py-3 rounded-md font-semibold"
                  >
                    Explore Now
                    <FaArrowRight size={12} />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="hidden lg:flex justify-end"
                >
                  <div className="w-[360px] h-[260px] rounded-2xl bg-white/10 border border-white/30 p-6 flex flex-col justify-between">
                    <FaBoxOpen size={44} className="text-secondary" />
                    <p className="text-2xl font-bold">Construction Essentials</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="rounded-xl bg-green-600 text-white px-5 py-4 flex items-center gap-3"
        >
          <FaShippingFast size={22} />
          <p className="text-sm font-medium">Free Delivery on Orders above Rs. 5000</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-xl bg-primary text-white px-5 py-4 flex items-center gap-3"
        >
          <FaCheckCircle size={22} />
          <p className="text-sm font-medium">Genuine Products Guaranteed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-xl bg-secondary text-white px-5 py-4 flex items-center gap-3"
        >
          <FaBoxOpen size={22} />
          <p className="text-sm font-medium">Easy Returns within 7 days</p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;