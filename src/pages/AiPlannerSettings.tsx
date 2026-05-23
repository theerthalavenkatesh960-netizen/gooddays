import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, Sparkles } from 'lucide-react';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';

export default function AiPlannerSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingRecommendations, setGettingRecommendations] = useState(false);
  const [status, setStatus] = useState('');

  // Test user detection: show advanced features for test emails
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
      setStatus(e?.message || 'Failed to load AI planner settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      await api.updateAiPlannerSettings({
        provider,
        localEndpoint,
        localModel: localModel.trim() || 'llama3.1:8b',
        claudeApiKey: claudeApiKey.trim() || undefined,
        claudeModel: claudeModel.trim() || 'claude-3-5-sonnet-latest',
      });
      await api.updateHealthProfile({
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        dailyCaloriesTarget: dailyCaloriesTarget ? Number(dailyCaloriesTarget) : undefined,
        dietPreference: dietPreference || undefined,
        budgetPerWeek: budgetPerWeek ? Number(budgetPerWeek) : undefined,
        activityLevel: activityLevel || undefined,
      });
      setStatus('Saved');
      setTimeout(() => setStatus(''), 1500);
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
      
      setStatus('Recommendations loaded');
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to get recommendations');
    } finally {
      setGettingRecommendations(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading AI planner settings...</div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center press"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Planner</h1>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(78,205,196,0.1)', color: 'var(--accent-green)' }}>
          {status}
        </div>
      )}

      {/* AI Provider - Only show for test users */}
      {isTestUser && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Provider</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setProvider('local-llama')}
              className="py-2 rounded-xl text-sm font-semibold press"
              style={{ backgroundColor: provider === 'local-llama' ? 'var(--accent)' : 'var(--surface-elevated)', color: provider === 'local-llama' ? '#fff' : 'var(--text-secondary)' }}
            >
              Local Llama
            </button>
            <button
              onClick={() => setProvider('claude')}
              className="py-2 rounded-xl text-sm font-semibold press"
              style={{ backgroundColor: provider === 'claude' ? 'var(--accent)' : 'var(--surface-elevated)', color: provider === 'claude' ? '#fff' : 'var(--text-secondary)' }}
            >
              Claude
            </button>
          </div>

          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Local Llama Endpoint</label>
          <input
            value={localEndpoint}
            onChange={(e) => setLocalEndpoint(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />

          {provider === 'local-llama' && (
            <>
              <label className="text-xs mb-1 mt-3 block" style={{ color: 'var(--text-muted)' }}>Local Model</label>
              <select
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="llama3.1:8b">llama3.1:8b</option>
                <option value="llama3.2">llama3.2</option>
                <option value="llama3.1:70b">llama3.1:70b</option>
              </select>
            </>
          )}

          {provider === 'claude' && (
            <>
              <label className="text-xs mb-1 mt-3 block" style={{ color: 'var(--text-muted)' }}>Claude Model</label>
              <select
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest</option>
                <option value="claude-3-7-sonnet-latest">claude-3-7-sonnet-latest</option>
                <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</option>
              </select>

              <label className="text-xs mb-1 mt-3 block" style={{ color: 'var(--text-muted)' }}>Claude API Key</label>
              <input
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                type="password"
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </>
          )}
        </div>
      )}

      {/* Health Profile with Presets */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Health Profile</p>
          <button
            onClick={getAiRecommendations}
            disabled={gettingRecommendations}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold press disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-green)22', color: 'var(--accent-green)' }}
          >
            <Sparkles size={12} /> Get AI Recommendation
          </button>
        </div>

        {/* Height & Weight inputs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="Height (cm)" type="number" className="px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Weight (kg)" type="number" className="px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <input value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} placeholder="Target Weight (kg)" type="number" className="px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
        </div>

        {/* Daily Calories Presets */}
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Daily Calories</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {['1500', '1800', '2000', '2400', '3000'].map((cal) => (
            <button
              key={cal}
              onClick={() => setDailyCaloriesTarget(cal)}
              className="py-1.5 rounded-lg text-xs font-semibold press disabled:opacity-60"
              style={{
                backgroundColor: dailyCaloriesTarget === cal ? 'var(--accent)' : 'var(--surface-elevated)',
                color: dailyCaloriesTarget === cal ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cal === '3000' ? '3000+' : cal}
            </button>
          ))}
        </div>

        {/* Budget Per Week Presets */}
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Weekly Budget (₹)</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {[
            { val: '1000', label: 'Low' },
            { val: '2000', label: 'Moderate' },
            { val: '4000', label: 'Medium' },
            { val: '6000', label: 'High' },
            { val: '10000', label: 'Unlimited' },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setBudgetPerWeek(opt.val)}
              className="py-1.5 rounded-lg text-xs font-semibold press"
              style={{
                backgroundColor: budgetPerWeek === opt.val ? 'var(--accent)' : 'var(--surface-elevated)',
                color: budgetPerWeek === opt.val ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <div>{opt.label}</div>
              <div className="text-[10px]">₹{opt.val}</div>
            </button>
          ))}
        </div>

        {/* Activity Level Presets */}
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Activity Level</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'].map((level) => (
            <button
              key={level}
              onClick={() => setActivityLevel(level)}
              className="py-1.5 rounded-lg text-xs font-semibold press"
              style={{
                backgroundColor: activityLevel === level ? 'var(--accent)' : 'var(--surface-elevated)',
                color: activityLevel === level ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {level.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Diet Preferences Presets */}
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Diet Preference</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {['Vegetarian', 'Non-Veg', 'High-Protein', 'Low-Carb', 'Mixed'].map((diet) => (
            <button
              key={diet}
              onClick={() => setDietPreference(diet)}
              className="py-1.5 rounded-lg text-xs font-semibold press"
              style={{
                backgroundColor: dietPreference === diet ? 'var(--accent)' : 'var(--surface-elevated)',
                color: dietPreference === diet ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {diet.split('-')[0]}
            </button>
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Health Profile'}
        </button>
      </div>
    </div>
  );
}
