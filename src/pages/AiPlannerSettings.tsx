import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, Sparkles, TrendingUp, Target, CheckCircle2, AlertCircle, Utensils } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function AiPlannerSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingRecommendations, setGettingRecommendations] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'provider' | 'health'>('health');

  const isTestUser = user?.email?.toLowerCase().includes('test');

  const [provider, setProvider] = useState<api.AiProvider>('local-llama');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
  const [localModel, setLocalModel] = useState('llama3.1:8b');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-3-5-sonnet-latest');

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [budgetPerWeek, setBudgetPerWeek] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  // Computed stats for display
  const currentWeight = weightKg ? Number(weightKg) : null;
  const targetWeight = targetWeightKg ? Number(targetWeightKg) : null;
  const weightDifference = currentWeight && targetWeight ? Math.abs(currentWeight - targetWeight) : null;
  const isWeightGain = currentWeight && targetWeight ? targetWeight > currentWeight : false;
  const profileComplete = heightCm && weightKg && dailyCaloriesTarget && activityLevel && dietPreference;

  const calorieEmoji = dailyCaloriesTarget ? (
    Number(dailyCaloriesTarget) < 1800 ? '🥗' :
    Number(dailyCaloriesTarget) < 2200 ? '🥙' :
    Number(dailyCaloriesTarget) < 2800 ? '🍽️' :
    '🍔'
  ) : '⚙️';

  const activityEmoji = activityLevel ? (
    activityLevel === 'Sedentary' ? '🪑' :
    activityLevel === 'Light' ? '🚶' :
    activityLevel === 'Moderate' ? '🏃' :
    activityLevel === 'Active' ? '🏋️' :
    '⚡'
  ) : '⚙️';

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [settings, profile] = await Promise.all([
        api.getAiPlannerSettings(),
        api.getHealthProfile(),
      ]);

      setProvider((settings?.provider || 'local-llama') as api.AiProvider);
      setLocalEndpoint(settings?.localEndpoint || 'http://localhost:11434');
      setLocalModel(settings?.localModel || 'llama3.1:8b');
      setClaudeApiKey(settings?.claudeApiKey || '');
      setClaudeModel(settings?.claudeModel || 'claude-3-5-sonnet-latest');

      setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
      setWeightKg(profile?.weightKg ? String(profile.weightKg) : '');
      setTargetWeightKg(profile?.targetWeightKg ? String(profile.targetWeightKg) : '');
      setDailyCaloriesTarget(profile?.dailyCaloriesTarget ? String(profile.dailyCaloriesTarget) : '');
      setDietPreference(profile?.dietPreference || '');
      setBudgetPerWeek(profile?.budgetPerWeek ? String(profile.budgetPerWeek) : '');
      setActivityLevel(profile?.activityLevel || '');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      if (isTestUser) {
        await api.updateAiPlannerSettings({
          provider,
          localEndpoint,
          localModel: localModel.trim() || 'llama3.1:8b',
          claudeApiKey: claudeApiKey.trim() || undefined,
          claudeModel: claudeModel.trim() || 'claude-3-5-sonnet-latest',
        });
      }
      await api.updateHealthProfile({
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        dailyCaloriesTarget: dailyCaloriesTarget ? Number(dailyCaloriesTarget) : undefined,
        dietPreference: dietPreference || undefined,
        budgetPerWeek: budgetPerWeek ? Number(budgetPerWeek) : undefined,
        activityLevel: activityLevel || undefined,
      });
      setStatus('✓ Profile saved successfully');
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function getAiRecommendations() {
    setGettingRecommendations(true);
    try {
      const targetDate = targetWeightKg ? new Date().toISOString().split('T')[0] : undefined;
      const rec = await api.getHealthRecommendations({
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        targetDate,
      });
      
      if (rec.dailyCaloriesTarget) setDailyCaloriesTarget(String(rec.dailyCaloriesTarget));
      if (rec.budgetPerWeek) setBudgetPerWeek(String(rec.budgetPerWeek));
      if (rec.activityLevel) setActivityLevel(rec.activityLevel);
      if (rec.dietPreference) setDietPreference(rec.dietPreference);
      
      setStatus('✨ AI recommendations applied');
      setTimeout(() => setStatus(''), 2500);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to get recommendations');
    } finally {
      setGettingRecommendations(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Initializing AI Planner...</div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center press transition-all"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Planner</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Personalized health & nutrition insights</p>
        </div>
      </div>

      {/* Status Banner */}
      {status && (
        <div
          className="mb-4 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 animate-in"
          style={{
            backgroundColor: status.includes('✗') || status.includes('Failed') ? 'rgba(255,107,107,0.1)' : 'rgba(78,205,196,0.1)',
            color: status.includes('✗') || status.includes('Failed') ? '#FF6B6B' : 'var(--accent-green)',
          }}
        >
          {status.includes('✗') || status.includes('Failed') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {status}
        </div>
      )}

      {/* Tabs - Only show if test user */}
      {isTestUser && (
        <div className="flex gap-2 mb-5" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0px' }}>
          <button
            onClick={() => setActiveTab('health')}
            className="px-4 py-3 text-sm font-semibold transition-all press"
            style={{
              color: activeTab === 'health' ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === 'health' ? `2px solid var(--accent)` : 'transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <Target size={14} /> Health Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab('provider')}
            className="px-4 py-3 text-sm font-semibold transition-all press"
            style={{
              color: activeTab === 'provider' ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === 'provider' ? `2px solid var(--accent)` : 'transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <Brain size={14} /> AI Provider
            </div>
          </button>
        </div>
      )}

      {/* AI Provider Tab */}
      {isTestUser && activeTab === 'provider' && (
        <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)22' }}>
              <Brain size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>AI Provider Configuration</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Advanced settings for AI model selection</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {['local-llama', 'claude'].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p as api.AiProvider)}
                className="p-3 rounded-xl transition-all press relative overflow-hidden"
                style={{
                  backgroundColor: provider === p ? 'var(--accent)' : 'var(--surface-elevated)',
                  border: `2px solid ${provider === p ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <p className="font-semibold text-sm" style={{ color: provider === p ? '#fff' : 'var(--text-primary)' }}>
                  {p === 'local-llama' ? '🦙 Local Llama' : '🤖 Claude'}
                </p>
                <p className="text-xs mt-1" style={{ color: provider === p ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                  {p === 'local-llama' ? 'Self-hosted' : 'Cloud-based'}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Local Llama Endpoint</label>
              <input
                value={localEndpoint}
                onChange={(e) => setLocalEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>

            {provider === 'local-llama' && (
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Local Model</label>
                <select
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  <option value="llama3.1:8b">llama3.1:8b (Fast)</option>
                  <option value="llama3.2">llama3.2 (Balanced)</option>
                  <option value="llama3.1:70b">llama3.1:70b (Powerful)</option>
                </select>
              </div>
            )}

            {provider === 'claude' && (
              <>
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Claude Model</label>
                  <select
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (Latest)</option>
                    <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</option>
                    <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Fast)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>API Key</label>
                  <input
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    type="password"
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Health Profile Tab */}
      {activeTab === 'health' && (
        <>
          {/* Completion Status */}
          {profileComplete && (
            <div className="rounded-3xl p-4 mb-5 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-green)22', border: '1px solid var(--accent-green)33' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--accent-green)' }}>Profile Complete</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-green)' }}>All health parameters configured</p>
              </div>
            </div>
          )}

          {/* Quick Stats Cards */}
          {weightDifference !== null && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-3 relative overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Progress Goal</p>
                    <p className="text-lg font-bold mt-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                      <span>{isWeightGain ? '⬆️' : '⬇️'}</span> {weightDifference.toFixed(1)}kg
                    </p>
                  </div>
                  <TrendingUp size={16} style={{ color: 'var(--accent)33' }} />
                </div>
              </div>

              <div className="rounded-2xl p-3 relative overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>BMI Category</p>
                    <p className="text-lg font-bold mt-1" style={{ color: 'var(--accent)' }}>
                      {heightCm && weightKg
                        ? 'Calculated'
                        : '—'}
                    </p>
                  </div>
                  <Target size={16} style={{ color: 'var(--accent)33' }} />
                </div>
              </div>
            </div>
          )}

          {/* Physical Metrics Section */}
          <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                <Target size={18} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Physical Metrics</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your body measurements</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>HEIGHT</label>
                <input
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  type="number"
                  placeholder="cm"
                  className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>WEIGHT</label>
                <input
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  type="number"
                  placeholder="kg"
                  className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>TARGET</label>
                <input
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  type="number"
                  placeholder="kg"
                  className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>
          </div>

          {/* Daily Calories Section */}
          <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                  {calorieEmoji}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Caloric Intake</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Select your daily calorie target</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { val: '1500', label: '1500', color: 'rgba(255,107,107,0.1)', textColor: '#FF6B6B' },
                { val: '1800', label: '1800', color: 'rgba(255,193,7,0.1)', textColor: '#FFC107' },
                { val: '2000', label: '2000', color: 'rgba(76,175,80,0.1)', textColor: '#4CAF50' },
                { val: '2400', label: '2400', color: 'rgba(33,150,243,0.1)', textColor: '#2196F3' },
                { val: '3000', label: '3000+', color: 'rgba(156,39,176,0.1)', textColor: '#9C27F0' },
              ].map((cal) => (
                <button
                  key={cal.val}
                  onClick={() => setDailyCaloriesTarget(cal.val)}
                  className="py-3 rounded-xl font-semibold text-sm press transition-all relative overflow-hidden"
                  style={{
                    backgroundColor: dailyCaloriesTarget === cal.val ? cal.color : 'var(--surface-elevated)',
                    color: dailyCaloriesTarget === cal.val ? cal.textColor : 'var(--text-secondary)',
                    border: `1.5px solid ${dailyCaloriesTarget === cal.val ? cal.textColor + '33' : 'var(--border)'}`,
                  }}
                >
                  {cal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level Section */}
          <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent-green)22' }}>
                {activityEmoji}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Level</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>How active is your lifestyle?</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'].map((level, idx) => (
                <button
                  key={level}
                  onClick={() => setActivityLevel(level)}
                  className="py-3 rounded-xl font-semibold text-sm press transition-all"
                  style={{
                    backgroundColor: activityLevel === level ? 'var(--accent)' : 'var(--surface-elevated)',
                    color: activityLevel === level ? '#fff' : 'var(--text-secondary)',
                    border: `1.5px solid ${activityLevel === level ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {level.length > 8 ? level.substring(0, 5) + '...' : level}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Section */}
          <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent)22' }}>
                💰
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Food Budget</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Optimize recommendations by budget</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { val: '1000', label: 'Low' },
                { val: '2000', label: 'Moderate' },
                { val: '4000', label: 'Medium' },
                { val: '6000', label: 'High' },
                { val: '10000', label: 'Flexible' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setBudgetPerWeek(opt.val)}
                  className="py-3 rounded-xl press transition-all text-center"
                  style={{
                    backgroundColor: budgetPerWeek === opt.val ? 'var(--accent)' : 'var(--surface-elevated)',
                    border: `1.5px solid ${budgetPerWeek === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <p className="font-semibold text-sm" style={{ color: budgetPerWeek === opt.val ? '#fff' : 'var(--text-primary)' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: budgetPerWeek === opt.val ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                    ₹{opt.val}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Diet Preference Section */}
          <div className="rounded-3xl p-5 mb-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                <Utensils size={18} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Diet Preference</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your dietary choices matter</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {['Vegetarian', 'Non-Veg', 'High-Protein', 'Low-Carb', 'Mixed'].map((diet) => (
                <button
                  key={diet}
                  onClick={() => setDietPreference(diet)}
                  className="py-3 rounded-xl font-semibold text-sm press transition-all"
                  style={{
                    backgroundColor: dietPreference === diet ? 'var(--accent)' : 'var(--surface-elevated)',
                    color: dietPreference === diet ? '#fff' : 'var(--text-secondary)',
                    border: `1.5px solid ${dietPreference === diet ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {diet.split('-')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={getAiRecommendations}
              disabled={gettingRecommendations}
              className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press transition-all"
              style={{
                backgroundColor: 'var(--accent-green)22',
                border: '1.5px solid var(--accent-green)33',
                color: 'var(--accent-green)',
                opacity: gettingRecommendations ? 0.6 : 1,
              }}
            >
              <Sparkles size={16} /> 
              {gettingRecommendations ? 'Analyzing...' : 'AI Suggestions'}
            </button>

            <button
              onClick={saveAll}
              disabled={saving}
              className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                opacity: saving ? 0.8 : 1,
              }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
