import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GmailReviewTab from '../components/financial/GmailReviewTab';

export default function FinanceGmailReview() {
  const navigate = useNavigate();

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center press"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gmail Review</h1>
      </div>

      <GmailReviewTab />
    </div>
  );
}
