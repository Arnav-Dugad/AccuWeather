import { TrendingUp } from 'lucide-react';
import { buildWeekOutlook } from '../lib/weekOutlook.js';
import CollapsibleCard from './CollapsibleCard.jsx';

export default function WeekOutlook({ data }) {
  const text = buildWeekOutlook(data?.consensus?.daily);
  if (!text) return null;

  return (
    <CollapsibleCard id="week-outlook" icon={TrendingUp} title="Week Outlook">
      <p className="text-sm leading-relaxed text-ink">{text}</p>
    </CollapsibleCard>
  );
}
