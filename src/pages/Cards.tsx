import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, TrendingUp, DollarSign, Gift,
  Wallet, BarChart3, PieChart, LineChart, CreditCard as CardIcon,
  ArrowUpRight, ArrowLeft
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/finance')}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
            </motion.button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>💳 Credit Cards</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Track all your cards in one place</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Stats Cards - Overview */}
        {activeTab === 'overview' && (
          <motion.div
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {/* Total Balance */}
            <motion.div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Balance</p>
              <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent)' }}>₹{(totalBalance / 1000).toFixed(0)}k</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>of ₹{(totalLimit / 100000).toFixed(1)}L</p>
            </motion.div>

            {/* Utilization */}
            <motion.div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Utilization</p>
              <p className="text-sm font-bold num mt-1" style={{ color: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}>
                {totalUtilization.toFixed(0)}%
              </p>
              <div className="h-1.5 bg-gray-300 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalUtilization}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}
                />
              </div>
            </motion.div>

            {/* Rewards Points */}
            <motion.div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Reward Points</p>
              <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent)' }}>{totalRewards}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>across cards</p>
            </motion.div>

            {/* Total Spending */}
            <motion.div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This Month</p>
              <p className="text-sm font-bold num mt-1" style={{ color: 'var(--accent-warm)' }}>₹{(totalSpending / 1000).toFixed(0)}k</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>spending</p>
            </motion.div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0"
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  if (tab.id.startsWith('card')) {
                    setSelectedCardIndex(parseInt(tab.id.replace('card', '')) - 1);
                  }
                }}
                className="relative px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap text-sm transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'var(--surface)',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <Icon size={16} />
                {tab.label}
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {cards.map((card, idx) => (
                <motion.button
                  key={card.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCardIndex(idx);
                    setActiveTab(`card${idx + 1}` as TabType);
                  }}
                  className="text-left transition-all rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <CreditCardComponent card={card} index={idx} />
                </motion.button>
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
              className="space-y-4"
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
                className="rounded-2xl p-4 md:p-5"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <LineChart size={16} />
                  Recent Transactions
                </h3>
                <div className="space-y-2">
                  {currentCard.analytics?.byCategory.slice(0, 5).map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex justify-between items-center p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--surface-elevated)' }}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cat.category}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>₹{(cat.total / 1000).toFixed(0)}k</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{cat.count} txn</p>
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
              className="space-y-4"
            >
              <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Combined Stats */}
                <motion.div
                  className="rounded-2xl p-4 md:p-5"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <PieChart size={16} />
                    Combined Overview
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Balance</p>
                      <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>₹{(totalBalance / 1000).toFixed(0)}k</p>
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Credit Utilization</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${totalUtilization}%` }}
                              transition={{ duration: 1 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{totalUtilization.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Rewards</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{totalRewards} points</p>
                    </div>
                  </div>
                </motion.div>

                {/* Card Comparison */}
                <motion.div
                  className="rounded-2xl p-4 md:p-5"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BarChart3 size={16} />
                    Card Breakdown
                  </h3>

                  <div className="space-y-2">
                    {cards.map((card, idx) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg flex items-center justify-between"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.issuer}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>₹{(card.currentBalance || 0).toLocaleString()}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{((card.utilization || 0) * 100).toFixed(0)}% used</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Combined Analytics */}
              <motion.div
                className="rounded-2xl p-4 md:p-5"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Spending by Category (All Cards)</h3>
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
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-2 p-2.5 rounded-lg"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      >
                        <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{
                          background: `hsl(${(i * 45) % 360}, 70%, 50%)`
                        }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{cat.category}</p>
                          <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min((cat.total / (cards.reduce((s, c) => s + (c.analytics?.totalSpending || 0), 0))) * 100, 100)}%`,
                                background: `hsl(${(i * 45) % 360}, 70%, 50%)`
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>₹{(cat.total / 1000).toFixed(0)}k</p>
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
