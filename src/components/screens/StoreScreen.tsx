import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { STORE_PRODUCTS } from '../../types/game';
import type { StoreProduct } from '../../types/game';
import { Card } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Coins, Zap, Shield, BarChart3, CheckCircle, XCircle } from 'lucide-react';

/**
 * StoreScreen — 虚拟商城页面
 * 商品卡片 + 购买交互 + 积分余额
 */
export function StoreScreen() {
  const { t } = useTranslation();
  const authStatus = useGameStore((s) => s.userProfile.auth?.status ?? 'guest');
  const isGuest = authStatus === 'guest';
  const brainPoints = useGameStore((s) => s.userProfile.brainPoints);
  const ownedItems = useGameStore((s) => s.userProfile.ownedItems);
  const purchaseProduct = useGameStore((s) => s.purchaseProduct);

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = (product: StoreProduct) => {
    if (isGuest) return;
    setPurchasingId(product.id);

    // Simulate brief purchase animation
    setTimeout(() => {
      const success = purchaseProduct(product.id);
      if (success) {
        setFeedback({ success: true, message: t('store.purchaseSuccess') });
      } else if (brainPoints < product.price) {
        setFeedback({ success: false, message: t('store.notEnoughPoints') });
      } else {
        setFeedback({ success: false, message: t('store.alreadyOwned') });
      }
      setPurchasingId(null);
      setTimeout(() => setFeedback(null), 2500);
    }, 400);
  };

  const getEffectIcon = (product: StoreProduct) => {
    switch (product.effect.type) {
      case 'energy': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'streak_saver': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'premium_report': return <BarChart3 className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-zen-700 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            {t('store.title')}
          </h1>
          <p className="text-xs text-zen-400 mt-1">{t('store.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2 rounded-xl border border-amber-200/50">
          <Coins className="w-4 h-4 text-amber-600" />
          <span className="font-mono font-bold text-amber-700">{(isGuest ? 0 : brainPoints).toLocaleString()}</span>
          <span className="text-xs text-amber-500">{t('store.points')}</span>
        </div>
      </div>

      {isGuest && (
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
          <div className="text-sm font-medium text-zen-700 mb-1">{t('profile.auth.guest')}</div>
          <div className="text-xs text-zen-500">{t('profile.auth.guestLockHint')}</div>
          <div className="mt-3 flex gap-2">
            <a
              href="/signup"
              className="px-3 py-2 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors"
            >
              {t('profile.auth.goSignup')}
            </a>
            <a
              href="/signin"
              className="px-3 py-2 rounded-lg bg-zen-100 text-zen-700 text-xs font-medium hover:bg-zen-200 transition-colors"
            >
              {t('profile.auth.goSignin')}
            </a>
          </div>
        </div>
      )}

      {/* Purchase feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              feedback.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STORE_PRODUCTS.map((product) => {
          const isOwned = !isGuest && product.type === 'permanent' && ownedItems.includes(product.id);
          const canAfford = !isGuest && brainPoints >= product.price;
          const isPurchasing = purchasingId === product.id;

          return (
            <Card key={product.id} className="relative overflow-hidden">
              {/* Product card */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-zen-50 flex items-center justify-center text-2xl flex-shrink-0 border border-zen-200/30">
                  {product.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getEffectIcon(product)}
                    <h3 className="font-medium text-zen-700 text-sm">{t(product.nameKey)}</h3>
                  </div>
                  <p className="text-xs text-zen-400 mb-3">{t(product.descKey)}</p>

                  {/* Price & Buy */}
                  {isOwned ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('store.owned')}
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(product)}
                      disabled={!canAfford || isPurchasing}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        canAfford
                          ? 'bg-sage-500 text-white hover:bg-sage-600 active:scale-[0.97] shadow-sm'
                          : 'bg-zen-100 text-zen-400 cursor-not-allowed'
                      }`}
                    >
                      {isPurchasing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <Coins className="w-3.5 h-3.5" />
                      )}
                      <span>{product.price}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tag for product type */}
              <div
                className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded ${
                  product.type === 'permanent'
                    ? 'bg-purple-50 text-purple-500 border border-purple-200/50'
                    : 'bg-zen-50 text-zen-400 border border-zen-200/30'
                }`}
              >
                {product.type === 'permanent' ? t('store.permanent') : t('store.consumable')}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-zen-400 text-center">
        {t('store.earnHint')}
      </p>
    </div>
  );
}
