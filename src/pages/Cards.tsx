import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, TrendingUp, DollarSign, Gift,
  Wallet, BarChart3, PieChart, LineChart, CreditCard as CardIcon,
  ArrowUpRight
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../contexts/AuthContextApi';
import cardApi, { CreditCard, CardAnalytics as CardAnalyticsType } from '../lib/cardApi';
import BankStatementImport from '../components/financial/BankStatementImport';
import CreditCardComponent from '../components/financial/CreditCardComponent';
import CardAnalyticsComponent from '../components/financial/CardAnalytics';
import EnhancedCreditCardComponent from '../components/financial/EnhancedCreditCardComponent';
import SpendingAlertBanner from '../components/financial/SpendingAlertBanner';
import RewardRedemptionModal from '../components/financial/RewardRedemptionModal';
import { generateSpendingAlert, SpendingAlert } from '../lib/spendingAlerts';

type TabType = 'overview' | 'card1' | 'card2' | 'card3' | 'combined';

interface CardWithAnalytics extends CreditCard {
  analytics?: CardAnalyticsType;
  spending?: number;
  utilization?: number;
}

export default function Cards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [cards, setCards] = useState<CardWithAnalytics[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [dateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const loadCards = async () => {
    if (!user) return;
    try {
      const fetchedCards = await cardApi.getCards(user.id);
      
      // Fetch analytics for each card
      const withAnalytics = await Promise.all(
        fetchedCards.map(async (card) => {
          try {
            const analytics = await cardApi.getCardAnalytics(card.id, dateRange.start, dateRange.end);
            const utilization = card.creditLimit ? (((card.currentBalance || 0) / card.creditLimit) * 100) : 0;
            return {
              ...card,
              analytics,
              spending: analytics.totalSpending,
              utilization
            };
          } catch {
            return { ...card };
          }
        })
      );

      setCards(withAnalytics);

      // Generate alerts for all cards
      const cardAlerts = withAnalytics
        .map(card => generateSpendingAlert(
          card.id.toString(),
          card.name,
          card.currentBalance || 0,
          card.creditLimit || 10000,
          card.rewardPointsBalance || 0
        ))
        .filter((alert): alert is SpendingAlert => alert !== null);
      
      setAlerts(cardAlerts);
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  };

  useEffect(() => {
    loadCards();
  }, [user, dateRange]);

  const currentCard = cards[selectedCardIndex];
  const totalBalance = cards.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const totalUtilization = totalLimit ? (totalBalance / totalLimit) * 100 : 0;
  const totalRewards = cards.reduce((sum, c) => sum + (c.rewardPointsBalance || 0), 0);
  const totalSpending = cards.reduce((sum, c) => sum + (c.analytics?.totalSpending || 0), 0);

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  const formatRupee = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-white/10 border-b border-white/20"
      >
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1 className="text-3xl font-black text-white" layoutId="title">
                💳 Credit Cards
              </motion.h1>
              <p className="text-white/70 text-sm mt-1">Track all your cards in one place</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-md border border-white/30 transition-all font-medium"
            >
              <Upload size={18} />
              Import Statement
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards - Overview */}
        {activeTab === 'overview' && (
          <motion.div
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Total Balance */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-2xl border border-blue-400/30"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <Wallet size={28} className="opacity-80" />
                  <TrendingUp size={20} className="text-green-300" />
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Balance</p>
                <p className="text-3xl font-black mb-2">{formatRupee(totalBalance)}</p>
                <div className="flex items-center gap-1 text-xs text-blue-200">
                  <span>Limit: {formatRupee(totalLimit)}</span>
                </div>
              </div>
            </motion.div>

            {/* Utilization */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white shadow-2xl border border-purple-400/30"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <BarChart3 size={28} className="opacity-80" />
                  <span className={`text-sm font-bold ${totalUtilization > 80 ? 'text-red-300' : 'text-green-300'}`}>
                    {totalUtilization.toFixed(0)}%
                  </span>
                </div>
                <p className="text-purple-100 text-sm font-medium mb-3">Credit Utilization</p>
                <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalUtilization}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${totalUtilization > 80 ? 'bg-red-300' : 'bg-green-300'}`}
                  />
                </div>
              </div>
            </motion.div>

            {/* Rewards Points */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-2xl border border-amber-400/30"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <Gift size={28} className="opacity-80" />
                  <span className="text-sm font-bold text-yellow-200">+100</span>
                </div>
                <p className="text-amber-100 text-sm font-medium mb-1">Reward Points</p>
                <p className="text-3xl font-black">{totalRewards}</p>
              </div>
            </motion.div>

            {/* Total Spending */}
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white shadow-2xl border border-rose-400/30"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <DollarSign size={28} className="opacity-80" />
                  <ArrowUpRight size={20} className="text-red-300" />
                </div>
                <p className="text-rose-100 text-sm font-medium mb-1">This Month</p>
                <p className="text-3xl font-black">{formatRupee(totalSpending)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:gap-3"
        >
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            ...cards.map((card, idx) => ({
              id: `card${idx + 1}` as TabType,
              label: `${card.name}`,
              icon: CardIcon
            })),
            { id: 'combined', label: 'Combined', icon: PieChart }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  if (tab.id.startsWith('card')) {
                    setSelectedCardIndex(parseInt(tab.id.replace('card', '')) - 1);
                  }
                }}
                className={`relative px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all backdrop-blur-md border ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-600 shadow-lg border-white'
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-lg border-2 border-purple-600 -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {cards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -8 }}
                  className="group relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer transition-all"
                  onClick={() => {
                    setSelectedCardIndex(idx);
                    setActiveTab(`card${idx + 1}` as TabType);
                  }}
                >
                  <CreditCardComponent card={card} index={idx} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab.startsWith('card') && currentCard && (
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* Spending Alerts */}
              {alerts.length > 0 && (
                <SpendingAlertBanner
                  alerts={alerts.filter(a => a.cardId === currentCard.id.toString())}
                  onDismiss={(id) => {
                    setAlerts(prev => prev.filter(a => a.id !== id));
                  }}
                  compact={false}
                />
              )}

              {/* Enhanced Card Display */}
              <EnhancedCreditCardComponent
                card={currentCard}
                index={selectedCardIndex}
                isLarge={true}
                onAction={(action) => {
                  if (action === 'rewards') {
                    setShowRewardModal(true);
                  }
                }}
              />

              {/* Analytics */}
              {currentCard.analytics && (
                <CardAnalyticsComponent analytics={currentCard.analytics} card={currentCard} />
              )}

              {/* Recent Transactions */}
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl p-6 bg-white/90 backdrop-blur-md shadow-xl border border-white"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <LineChart size={20} />
                  Recent Transactions
                </h3>
                <div className="space-y-2 text-sm">
                  {currentCard.analytics?.byCategory.slice(0, 5).map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg"
                    >
                      <span className="font-medium text-gray-700">{cat.category}</span>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatRupee(cat.total)}</p>
                        <p className="text-gray-500 text-xs">{cat.count} transaction{cat.count > 1 ? 's' : ''}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'combined' && (
            <motion.div
              key="combined"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Combined Stats */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="rounded-2xl p-8 bg-gradient-to-br from-white to-gray-50 backdrop-blur-md shadow-xl border border-white"
                >
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <PieChart size={24} />
                    Combined Overview
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-2">Total Balance</p>
                      <p className="text-3xl font-black text-purple-600">{formatRupee(totalBalance)}</p>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-gray-600 text-sm mb-2">Credit Utilization</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${totalUtilization}%` }}
                              transition={{ duration: 1 }}
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                            />
                          </div>
                        </div>
                        <span className="text-lg font-bold text-purple-600">{totalUtilization.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-gray-600 text-sm mb-2">Total Rewards</p>
                      <p className="text-2xl font-bold text-amber-600">{totalRewards} points</p>
                    </div>
                  </div>
                </motion.div>

                {/* Card Comparison */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="rounded-2xl p-8 bg-gradient-to-br from-white to-gray-50 backdrop-blur-md shadow-xl border border-white"
                >
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <BarChart3 size={24} />
                    Card Breakdown
                  </h3>

                  <div className="space-y-3">
                    {cards.map((card, idx) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{card.name}</p>
                          <p className="text-xs text-gray-600">{card.issuer}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatRupee(card.currentBalance || 0)}</p>
                          <p className="text-xs text-gray-600">{((card.utilization || 0) * 100).toFixed(0)}% used</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Combined Analytics */}
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl p-8 bg-gradient-to-br from-white to-gray-50 backdrop-blur-md shadow-xl border border-white"
              >
                <h3 className="text-xl font-bold mb-6">Spending by Category (All Cards)</h3>
                <div className="space-y-2">
                  {cards.flatMap(c => c.analytics?.byCategory || [])
                    .reduce((acc, cat) => {
                      const existing = acc.find(c => c.category === cat.category);
                      if (existing) {
                        existing.total += cat.total;
                        existing.count += cat.count;
                      } else {
                        acc.push({ ...cat });
                      }
                      return acc;
                    }, [] as any[])
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 8)
                    .map((cat, i) => (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-2 h-8 rounded-full" style={{
                          background: `hsl(${(i * 45) % 360}, 70%, 50%)`
                        }} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{cat.category}</p>
                          <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min((cat.total / (cards.reduce((s, c) => s + (c.analytics?.totalSpending || 0), 0))) * 100, 100)}%`,
                                background: `hsl(${(i * 45) % 360}, 70%, 50%)`
                              }}
                            />
                          </div>
                        </div>
                        <p className="font-bold text-gray-900">{formatRupee(cat.total)}</p>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Import Modal */}
      <BankStatementImport
        userId={user?.id || 0}
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={loadCards}
      />

      {/* Reward Redemption Modal */}
      <RewardRedemptionModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        cardName={currentCard?.name || 'Card'}
        rewardPoints={currentCard?.rewardPointsBalance || 0}
        rewardRedemptionRate={currentCard?.rewardsRate || 1}
        monthlySpending={currentCard?.analytics?.totalSpending || 0}
        rewardsRate={currentCard?.rewardsRate || 1}
      />
    </div>
  );
}
