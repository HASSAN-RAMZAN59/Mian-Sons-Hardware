import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import productsData from '../../../data/productsData';

const BrandsSlider = () => {
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(productsData.map((product) => product.company).filter(Boolean)));
    return uniqueBrands.length ? uniqueBrands : ['Master', 'Adam G', 'Local', 'Fine', 'Capital', 'Hi-Fine', 'Pak'];
  }, []);

  const marqueeBrands = [...brands, ...brands];

  return (
    <section className="py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">Top Brands We Carry</h2>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-50 to-transparent z-10" />

          <div className="flex w-max animate-[marquee_28s_linear_infinite] hover:[animation-play-state:paused]">
            {marqueeBrands.map((brand, index) => (
              <Link
                key={`${brand}-${index}`}
                to={`/shop?brand=${encodeURIComponent(brand)}`}
                className="mx-2 min-w-[170px] h-20 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center px-4 text-center text-sm font-semibold text-gray-500 grayscale hover:grayscale-0 hover:text-primary hover:border-primary transition-all"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default BrandsSlider;