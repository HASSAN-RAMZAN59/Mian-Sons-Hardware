import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import CountdownTimer from '../common/CountdownTimer';
import { useCart } from '../../../context/CartContext';
import productsData from '../../../data/productsData';
import useActiveDiscounts from '../../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../../utils/discounts';
import { handleImageError } from '../../../utils/helpers';

const getOfferDeadline = (hours = 0, minutes = 0, seconds = 0) => {
  const target = new Date();
  target.setHours(target.getHours() + hours);
  target.setMinutes(target.getMinutes() + minutes);
  target.setSeconds(target.getSeconds() + seconds);
  return target;
};

const SpecialOffers = () => {
  const { addToCart } = useCart();
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [discounts]
  );

  const dealOfDay = useMemo(() => {
    const waterTank600 = discountedProducts.find((item) => Number(item.id) === 10) || discountedProducts[0];
    if (!waterTank600) return null;

    const basePrice = Number(waterTank600.price ?? waterTank600.salePrice ?? 0);
    const salePrice = Number.isFinite(waterTank600.salePrice) ? Number(waterTank600.salePrice) : basePrice;

    return {
      id: String(waterTank600.id),
      name: `${waterTank600.name} - ${waterTank600.size}`,
      category: waterTank600.category,
      price: basePrice,
      salePrice,
      rating: Number(waterTank600.rating) > 0 ? Number(waterTank600.rating) : null,
      stock: waterTank600.stockQty,
      sold: 50 - waterTank600.stockQty,
      totalStock: 50,
      endAfterHours: 2,
      endAfterMinutes: 45,
      endAfterSeconds: 30,
      description: waterTank600.description,
      images: waterTank600.images || []
    };
  }, [discountedProducts]);

  const sideOffers = useMemo(() => {
    const basinLarge = discountedProducts.find((item) => Number(item.id) === 14);
    const muslimShower = discountedProducts.find((item) => Number(item.id) === 22);

    return [basinLarge, muslimShower]
      .filter(Boolean)
      .map((item, index) => ({
        id: String(item.id),
        name: item.size ? `${item.name} - ${item.size}` : item.name,
        category: item.category,
        price: Number(item.price ?? item.salePrice ?? 0),
        salePrice: Number.isFinite(item.salePrice) ? Number(item.salePrice) : null,
        rating: Number(item.rating) > 0 ? Number(item.rating) : null,
        stock: item.stockQty,
        images: item.images || [],
        endsInHours: index === 0 ? 1 : 3,
        color: index === 0 ? 'from-red-600 to-orange-500' : 'from-orange-600 to-amber-500'
      }));
  }, [discountedProducts]);

  const mainOfferEnds = getOfferDeadline(
    dealOfDay?.endAfterHours || 0,
    dealOfDay?.endAfterMinutes || 0,
    dealOfDay?.endAfterSeconds || 0
  );

  if (!dealOfDay) return null;

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Special Offers</h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-3 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white rounded-2xl overflow-hidden shadow-lg"
          >
            <div className="grid md:grid-cols-2 h-full">
              <div className="min-h-[260px] md:min-h-full bg-white/10 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="w-full h-56 rounded-xl border border-white/20 bg-white/20 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img
                      src={dealOfDay.images?.[0] || ''}
                      alt={dealOfDay.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, dealOfDay.name)}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-7">
                <p className="text-sm font-semibold text-red-100 mb-1">Deal of the Day</p>
                <h3 className="text-2xl font-bold leading-tight mb-2">{dealOfDay.name}</h3>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold">
                    Rs. {(Number.isFinite(dealOfDay.salePrice) ? dealOfDay.salePrice : dealOfDay.price).toLocaleString()}
                  </span>
                  {Number.isFinite(dealOfDay.salePrice) && dealOfDay.salePrice < dealOfDay.price && (
                    <span className="text-sm text-white/80 line-through">Rs. {dealOfDay.price.toLocaleString()}</span>
                  )}
                </div>

                {Number.isFinite(dealOfDay.rating) && (
                  <div className="flex items-center gap-1 mb-3">
                    <FaStar className="text-yellow-300" />
                    <span className="text-sm font-medium">{dealOfDay.rating.toFixed(1)}</span>
                  </div>
                )}

                <p className="text-sm text-red-50 leading-6 mb-4">{dealOfDay.description}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{dealOfDay.sold} Sold out of {dealOfDay.totalStock}</span>
                    <span>{dealOfDay.stock} left</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-yellow-300"
                      style={{ width: `${(dealOfDay.sold / dealOfDay.totalStock) * 100}%` }}
                    />
                  </div>
                </div>

                <CountdownTimer
                  targetDate={mainOfferEnds}
                  label="Offer ends in:"
                  className="mb-5 inline-flex items-center px-3 py-2 rounded-md bg-black/20"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => addToCart(dealOfDay, 1)}
                    className="px-5 py-2.5 rounded-md bg-primary text-white font-semibold hover:opacity-90"
                  >
                    Add to Cart
                  </button>
                  <Link
                    to={`/shop/product/${dealOfDay.id}`}
                    className="px-5 py-2.5 rounded-md border border-white text-white font-semibold hover:bg-white/10"
                  >
                    View Detail
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>

          <div className="lg:col-span-2 space-y-5">
            {sideOffers.map((offer, index) => (
              <motion.article
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className={`rounded-2xl bg-gradient-to-br ${offer.color} text-white p-5 shadow-lg`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/80 mb-1">Limited Offer</p>
                    <h4 className="text-lg font-bold leading-tight">{offer.name}</h4>
                    <div className="flex items-center gap-2 mt-2 mb-1">
                      <span className="font-bold text-xl">
                        Rs. {(Number.isFinite(offer.salePrice) ? offer.salePrice : offer.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-white/20 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <img
                        src={offer.images?.[0] || ''}
                        alt={offer.name}
                        loading="lazy"
                        onError={(event) => handleImageError(event, offer.name)}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 mb-4 text-sm bg-black/20 rounded-md px-3 py-2 inline-flex items-center gap-2">
                  <span>Ends in:</span>
                  <CountdownTimer
                    targetDate={getOfferDeadline(offer.endsInHours, 18, 25)}
                    compact
                    className="font-semibold tracking-wide"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => addToCart(offer, 1)}
                  className="w-full py-2.5 rounded-md bg-white text-red-600 font-semibold hover:bg-white/90"
                >
                  Add to Cart
                </button>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;