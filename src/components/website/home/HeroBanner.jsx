import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBoxOpen, FaCheckCircle, FaShippingFast, FaTools } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const contentMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' }
};

const heroSlides = [
  {
    eyebrow: 'Complete Hardware Solutions',
    title: 'Your One-Stop Hardware Shop',
    description: 'Quality tools and construction materials at best prices',
    primaryCta: { label: 'Shop Now', to: '/shop' },
    secondaryCta: { label: 'View Catalogue', to: '/brands' },
    panelTitle: 'Premium Tools',
    panelText: 'Drills, grinders, cutters and more',
    image:
      "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=2000&q=80"
  },
  {
    eyebrow: 'Power Tools Sale',
    title: 'Up to 30% OFF on Power Tools',
    description: 'Bosch, Makita, Stanley - All top brands available',
    primaryCta: { label: 'Grab Offer', to: '/shop?offer=true' },
    panelTitle: 'Top Brand Power Tools',
    panelText: 'Durable, reliable, workshop-ready options',
    image:
      '/images/2 slider.jpg'
  },
  {
    eyebrow: 'Construction Materials',
    title: 'Build Your Dream',
    description: 'Cement, Tiles, Pipes, Wires - Everything you need',
    primaryCta: { label: 'Explore Now', to: '/shop?category=Construction' },
    panelTitle: 'Construction Essentials',
    panelText: 'Ready stock for residential and commercial projects',
    image:
      '/images/3 slider.jpg'
  }
];

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
          modules={[Autoplay, EffectFade, Navigation, Pagination]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={850}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          navigation
          pagination={{ clickable: true }}
          loop
          className="hero-swiper"
        >
          {heroSlides.map((slide, index) => (
            <SwiperSlide key={slide.title}>
              <div
                className="text-white bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(102deg, rgba(11, 32, 66, 0.9) 0%, rgba(30, 58, 138, 0.78) 45%, rgba(30, 64, 175, 0.55) 100%), url('${slide.image}')`
                }}
              >
                <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center min-h-[380px] sm:min-h-[420px]">
                  <motion.div {...contentMotion}>
                    <p className="uppercase tracking-[0.2em] text-xs sm:text-sm text-blue-100 mb-3">{slide.eyebrow}</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">{slide.title}</h2>
                    <p className="text-blue-100 text-base lg:text-lg mb-6 lg:mb-7 max-w-xl">{slide.description}</p>

                    {index === 1 && (
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
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={slide.primaryCta.to}
                        className="inline-flex items-center gap-2 bg-secondary hover:opacity-90 text-white px-5 py-3 rounded-md font-semibold"
                      >
                        {slide.primaryCta.label}
                        <FaArrowRight size={12} />
                      </Link>
                      {slide.secondaryCta && (
                        <Link
                          to={slide.secondaryCta.to}
                          className="inline-flex items-center border border-white text-white px-5 py-3 rounded-md font-semibold hover:bg-white/10"
                        >
                          {slide.secondaryCta.label}
                        </Link>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="hidden lg:flex justify-end"
                  >
                    <div className="w-[360px] h-[260px] rounded-2xl bg-white/10 border border-white/25 backdrop-blur-sm p-6 flex flex-col justify-between shadow-xl">
                      {index === 2 ? <FaBoxOpen size={44} className="text-secondary" /> : <FaTools size={44} className="text-secondary" />}
                      <div>
                        <p className="text-white text-2xl font-bold">{slide.panelTitle}</p>
                        <p className="text-blue-100 text-sm mt-1">{slide.panelText}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style>{`
        .hero-swiper .swiper-button-prev,
        .hero-swiper .swiper-button-next {
          color: #fff;
          background: rgba(15, 23, 42, 0.35);
          width: 42px;
          height: 42px;
          border-radius: 9999px;
          backdrop-filter: blur(3px);
        }

        .hero-swiper .swiper-button-prev::after,
        .hero-swiper .swiper-button-next::after {
          font-size: 14px;
          font-weight: 700;
        }

        .hero-swiper .swiper-pagination {
          bottom: 12px !important;
        }

        .hero-swiper .swiper-pagination-bullet {
          width: 9px;
          height: 9px;
          background: rgba(255, 255, 255, 0.6);
          opacity: 1;
        }

        .hero-swiper .swiper-pagination-bullet-active {
          width: 24px;
          border-radius: 9999px;
          background: #f59e0b;
        }
      `}</style>

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