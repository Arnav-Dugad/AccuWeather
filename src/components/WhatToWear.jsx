import { Shirt, Umbrella, Glasses, Wind } from 'lucide-react';
import CollapsibleCard from './CollapsibleCard.jsx';

const ICONS = { Shirt, Umbrella, Glasses, Wind };

function getSuggestions(feels, wind, gust, precipProb, uv) {
  const tips = [];

  if (feels < 0) tips.push({ icon: 'Shirt', text: 'Heavy winter coat, gloves & hat', color: '#60a5fa' });
  else if (feels < 10) tips.push({ icon: 'Shirt', text: 'Warm jacket and layers', color: '#38bdf8' });
  else if (feels < 18) tips.push({ icon: 'Shirt', text: 'Light jacket or sweater', color: '#34d399' });
  else if (feels < 26) tips.push({ icon: 'Shirt', text: 'Light, comfortable clothing', color: '#a3e635' });
  else if (feels < 35) tips.push({ icon: 'Shirt', text: 'Light, breathable fabrics', color: '#fbbf24' });
  else tips.push({ icon: 'Shirt', text: 'Minimal clothing, stay hydrated', color: '#fb7185' });

  if (precipProb > 50) tips.push({ icon: 'Umbrella', text: 'Bring an umbrella', color: '#60a5fa' });
  else if (precipProb > 30) tips.push({ icon: 'Umbrella', text: 'Consider an umbrella', color: '#93c5fd' });

  if (uv >= 6) tips.push({ icon: 'Glasses', text: 'Sunscreen & sunglasses', color: '#fbbf24' });
  else if (uv >= 3) tips.push({ icon: 'Glasses', text: 'Sunglasses recommended', color: '#fde68a' });

  if (gust > 40 || wind > 35) tips.push({ icon: 'Wind', text: 'Windbreaker recommended', color: '#34d399' });

  return tips;
}

export default function WhatToWear({ data }) {
  const c = data?.consensus?.current;
  if (!c || c.feels == null) return null;

  const tips = getSuggestions(c.feels, c.wind ?? 0, c.gust ?? 0, c.precipProb ?? 0, c.uv ?? 0);
  if (!tips.length) return null;

  return (
    <CollapsibleCard id="what-to-wear" icon={Shirt} title="What to Wear">
      <div className="flex flex-col gap-2.5">
        {tips.map(({ icon, text, color }) => {
          const Icon = ICONS[icon];
          return (
            <div key={text} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${color}1a` }}
              >
                <Icon size={15} style={{ color }} />
              </span>
              <span className="text-sm text-ink">{text}</span>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}
