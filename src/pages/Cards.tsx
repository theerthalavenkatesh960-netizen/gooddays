import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, BarChart3, PieChart, LineChart, CreditCard as CardIcon,
  Plus, Pencil, X,
  ArrowLeft
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

interface CardFormState {
  name: string;
  issuer: CreditCard['issuer'];
  last4Digits: string;
  creditLimit: string;
  currentBalance: string;
  rewardPointsBalance: string;
  rewardsRate: string;
  billingCycleStartDate: string;
  billingCycleEndDate: string;
  status: CreditCard['status'];
}

const EMPTY_CARD_FORM: CardFormState = {
  name: '',
  issuer: 'Other',
  last4Digits: '',
  creditLimit: '',
  currentBalance: '',
  rewardPointsBalance: '',
  rewardsRate: '',
  billingCycleStartDate: '',
  billingCycleEndDate: '',
  status: 'active'
};

export default function Cards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [cards, setCards] = useState<CardWithAnalytics[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardFormState>(EMPTY_CARD_FORM);
  const [isSavingCard, setIsSavingCard] = useState(false);
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

  const allCategoryStats = cards.flatMap(c => c.analytics?.byCategory || []);
  const totalTransactions = allCategoryStats.reduce((sum, cat) => sum + cat.count, 0);
  const averageSpending = totalTransactions > 0 ? totalSpending / totalTransactions : 0;
  const topCategory = allCategoryStats.reduce(
    (prev, current) => (prev.total > current.total ? prev : current),
    { category: 'N/A', total: 0, count: 0 }
  );

  const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0)}`;

  const formatCount = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);

  const openAddCardModal = () => {
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
    setShowCardForm(true);
  };

  const openEditCardModal = (card: CardWithAnalytics) => {
    setEditingCardId(card.id);
    setCardForm({
      name: card.name || '',
      issuer: card.issuer || 'Other',
      last4Digits: card.last4Digits || '',
      creditLimit: card.creditLimit != null ? String(card.creditLimit) : '',
      currentBalance: card.currentBalance != null ? String(card.currentBalance) : '',
      rewardPointsBalance: card.rewardPointsBalance != null ? String(card.rewardPointsBalance) : '',
      rewardsRate: card.rewardsRate != null ? String(card.rewardsRate) : '',
      billingCycleStartDate: card.billingCycleStartDate != null ? String(card.billingCycleStartDate) : '',
      billingCycleEndDate: card.billingCycleEndDate != null ? String(card.billingCycleEndDate) : '',
      status: card.status || 'active'
    });
    setShowCardForm(true);
  };

  const closeCardModal = () => {
    setShowCardForm(false);
    setEditingCardId(null);
    setCardForm(EMPTY_CARD_FORM);
  };

  const handleSaveCard = async () => {
    if (!user || !cardForm.name.trim()) return;

    const toNumber = (value: string) => {
      if (value.trim() === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const payload = {
      name: cardForm.name.trim(),
      issuer: cardForm.issuer,
      last4Digits: cardForm.last4Digits.trim() || undefined,
      creditLimit: toNumber(cardForm.creditLimit),
      currentBalance: toNumber(cardForm.currentBalance),
      rewardPointsBalance: toNumber(cardForm.rewardPointsBalance),
      rewardsRate: toNumber(cardForm.rewardsRate),
      billingCycleStartDate: toNumber(cardForm.billingCycleStartDate),
      billingCycleEndDate: toNumber(cardForm.billingCycleEndDate),
      status: cardForm.status
    };

    setIsSavingCard(true);
    try {
      if (editingCardId) {
        await cardApi.updateCard(editingCardId, payload);
      } else {
        await cardApi.createCard({
          userId: user.id,
          ...payload
        });
      }

      await loadCards();
      closeCardModal();
      setActiveTab('overview');
    } catch (err) {
      console.error('Failed to save card:', err);
    } finally {
      setIsSavingCard(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b"
        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="px-4 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3 flex-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <ArrowLeft size={20} style={{ color: 'var(--text-primary)' }} />
            </motion.button>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Credit Cards</h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Track all your cards in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddCardModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Card</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-4 py-5 md:py-6 space-y-5 md:space-y-6 max-w-6xl mx-auto overflow-x-hidden">
        {/* Stats Cards - Overview */}
        {activeTab === 'overview' && (
          <motion.div
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-2"
          >
            <div className="grid grid-cols-3 gap-2">
              <motion.div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total</p>
                <p className="text-[10px] md:text-xs font-bold num mt-1 truncate" style={{ color: 'var(--accent)' }}>{formatMoney(totalBalance)}</p>
              </motion.div>

              <motion.div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This Month</p>
                <p className="text-[10px] md:text-xs font-bold num mt-1 truncate" style={{ color: 'var(--accent-warm)' }}>{formatMoney(totalSpending)}</p>
              </motion.div>

              <motion.div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Reward Points</p>
                <p className="text-xs md:text-sm font-bold num mt-1" style={{ color: 'var(--accent)' }}>{formatCount(totalRewards)}</p>
              </motion.div>
            </div>

            <div className="px-1 py-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Utilization</p>
                <p className="text-xs font-bold num" style={{ color: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}>
                  {totalUtilization.toFixed(2)}%
                </p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalUtilization}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <motion.div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Average</p>
                <p className="text-xs font-semibold num mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{formatMoney(averageSpending)}</p>
              </motion.div>

              <motion.div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Top Category</p>
                <p className="text-xs font-semibold truncate mt-1" style={{ color: 'var(--text-primary)' }}>{topCategory.category}</p>
                <p className="text-[10px] num mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{formatMoney(topCategory.total)}</p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
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
                className="relative px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap text-xs transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'var(--surface)',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <Icon size={14} />
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
              className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5"
            >
              {cards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedCardIndex(idx);
                    setActiveTab(`card${idx + 1}` as TabType);
                  }}
                    className="text-left transition-all rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCardModal(card);
                    }}
                    className="absolute z-20 top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    aria-label="Edit card"
                  >
                    <Pencil size={12} />
                  </button>
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

              <div className="flex justify-end">
                <button
                  onClick={() => openEditCardModal(currentCard)}
                  className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <Pencil size={13} />
                  Edit Card Details
                </button>
              </div>

              {/* Analytics */}
              {currentCard.analytics && (
                <CardAnalyticsComponent
                  analytics={currentCard.analytics}
                  card={currentCard}
                  onCategoryClick={(category) => {
                    navigate(`/finance/cards/${currentCard.id}/category/${encodeURIComponent(category)}`);
                  }}
                />
              )}

              {/* Recent Transactions */}
              <motion.div
                className="rounded-2xl p-3 md:p-4"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <LineChart size={13} />
                  Recent Transactions
                </h3>
                <div className="space-y-2">
                  {currentCard.analytics?.byCategory.slice(0, 5).map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex justify-between items-center p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--surface-elevated)' }}
                    >
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cat.category}</span>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{formatMoney(cat.total)}</p>
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
              <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {/* Combined Stats */}
                <motion.div
                  className="rounded-2xl p-3 md:p-4"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <PieChart size={13} />
                    Combined Overview
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Balance</p>
                      <p className="text-xs font-semibold num" style={{ color: 'var(--accent)' }}>{formatMoney(totalBalance)}</p>
                    </div>

                    <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Credit Utilization</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${totalUtilization}%` }}
                              transition={{ duration: 1 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: totalUtilization > 80 ? 'var(--accent-warm)' : 'var(--accent-green)' }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>{totalUtilization.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Rewards</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{totalRewards} points</p>
                    </div>
                  </div>
                </motion.div>

                {/* Card Comparison */}
                <motion.div
                  className="rounded-2xl p-3 md:p-4"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <BarChart3 size={13} />
                    Card Breakdown
                  </h3>

                  <div className="space-y-2">
                    {cards.map((card, idx) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-2 rounded-lg flex items-center justify-between"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      >
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{card.issuer}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold num" style={{ color: 'var(--accent)' }}>{formatMoney(card.currentBalance || 0)}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{((card.utilization || 0) * 100).toFixed(0)}% used</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Combined Analytics */}
              <motion.div
                className="rounded-2xl p-3 md:p-4"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Spending by Category (All Cards)</h3>
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
                      <motion.button
                        key={cat.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/finance/cards/category/${encodeURIComponent(cat.category)}`)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      >
                        <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{
                          background: `hsl(${(i * 45) % 360}, 70%, 50%)`
                        }} />
                        <div className="flex-1">
                          <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{cat.category}  - view</p>
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
                        <p className="text-[10px] font-bold flex-shrink-0 num" style={{ color: 'var(--accent)' }}>{formatMoney(cat.total)}</p>
                      </motion.button>
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

      {/* Add/Edit Card Modal */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-lg rounded-2xl p-4 md:p-5 overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '85dvh' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingCardId ? 'Edit Card Details' : 'Add New Card'}
              </h3>
              <button
                onClick={closeCardModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2.5">
              <input
                value={cardForm.name}
                onChange={(e) => setCardForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Card Name"
                className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={cardForm.issuer}
                  onChange={(e) => setCardForm(prev => ({ ...prev, issuer: e.target.value as CreditCard['issuer'] }))}
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
                  {['HDFC', 'ICICI', 'SBI', 'Axis', 'Other'].map(issuer => (
                    <option key={issuer} value={issuer}>{issuer}</option>
                  ))}
                </select>
                <input
                  value={cardForm.last4Digits}
                  onChange={(e) => setCardForm(prev => ({ ...prev, last4Digits: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="Last 4 Digits"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={cardForm.creditLimit}
                  onChange={(e) => setCardForm(prev => ({ ...prev, creditLimit: e.target.value }))}
                  placeholder="Credit Limit"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <input
                  type="number"
                  value={cardForm.currentBalance}
                  onChange={(e) => setCardForm(prev => ({ ...prev, currentBalance: e.target.value }))}
                  placeholder="Current Balance"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={cardForm.rewardPointsBalance}
                  onChange={(e) => setCardForm(prev => ({ ...prev, rewardPointsBalance: e.target.value }))}
                  placeholder="Reward Points"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <input
                  type="number"
                  step="0.1"
                  value={cardForm.rewardsRate}
                  onChange={(e) => setCardForm(prev => ({ ...prev, rewardsRate: e.target.value }))}
                  placeholder="Rewards Rate"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={cardForm.billingCycleStartDate}
                  onChange={(e) => setCardForm(prev => ({ ...prev, billingCycleStartDate: e.target.value }))}
                  placeholder="Cycle Start"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={cardForm.billingCycleEndDate}
                  onChange={(e) => setCardForm(prev => ({ ...prev, billingCycleEndDate: e.target.value }))}
                  placeholder="Cycle End"
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <select
                  value={cardForm.status}
                  onChange={(e) => setCardForm(prev => ({ ...prev, status: e.target.value as CreditCard['status'] }))}
                  className="h-10 px-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                >
                  {['active', 'inactive', 'closed'].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={closeCardModal}
                className="flex-1 h-10 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                disabled={isSavingCard}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCard}
                className="flex-1 h-10 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
                disabled={isSavingCard}
              >
                {isSavingCard ? 'Saving...' : editingCardId ? 'Save Changes' : 'Create Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
