import { MUSCLE_TO_SVG_ID } from '../lib/config';

interface MuscleVisualizationProps {
  highlightMuscle?: string;
  height?: number;
}

export default function MuscleVisualization({ 
  highlightMuscle = '', 
  height = 400 
}: MuscleVisualizationProps) {
  const highlightedIds = new Set(MUSCLE_TO_SVG_ID[highlightMuscle] || []);

  const getColor = (id: string): string => {
    if (highlightedIds.has(id)) return '#ff6b35'; // Active highlight: vibrant orange
    return '#e8e8e8'; // Inactive: light gray
  };

  const getMuscleStyle = (id: string) => ({
    fill: getColor(id),
    stroke: '#333',
    strokeWidth: '0.5',
  });

  return (
    <div className="flex gap-4 justify-center p-4 w-full" style={{ height: `${height}px` }}>
      {/* FRONT VIEW */}
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 180 420" style={{ maxHeight: '100%', maxWidth: '100%' }} className="drop-shadow-lg">
          {/* Head */}
          <circle cx="90" cy="30" r="16" fill="#e8e8e8" stroke="#333" strokeWidth="0.5" />
          
          {/* Neck */}
          <rect x="82" y="47" width="16" height="12" fill="#e8e8e8" stroke="#333" strokeWidth="0.5" />
          
          {/* CHEST - 3 sections */}
          {/* Upper Chest Left */}
          <ellipse id="chest-upper-left" cx="60" cy="70" rx="18" ry="24" style={getMuscleStyle('chest-upper-left')} />
          {/* Upper Chest Right */}
          <ellipse id="chest-upper-right" cx="120" cy="70" rx="18" ry="24" style={getMuscleStyle('chest-upper-right')} />
          
          {/* Mid Chest Left */}
          <ellipse id="chest-mid-left" cx="60" cy="95" rx="20" ry="18" style={getMuscleStyle('chest-mid-left')} />
          {/* Mid Chest Right */}
          <ellipse id="chest-mid-right" cx="120" cy="95" rx="20" ry="18" style={getMuscleStyle('chest-mid-right')} />
          
          {/* Lower Chest Left */}
          <ellipse id="chest-lower-left" cx="58" cy="118" rx="22" ry="16" style={getMuscleStyle('chest-lower-left')} />
          {/* Lower Chest Right */}
          <ellipse id="chest-lower-right" cx="122" cy="118" rx="22" ry="16" style={getMuscleStyle('chest-lower-right')} />
          
          {/* SHOULDERS - 3 sections each side */}
          {/* Front Delt Left */}
          <ellipse id="shoulder-front-left" cx="35" cy="65" rx="14" ry="18" style={getMuscleStyle('shoulder-front-left')} />
          {/* Front Delt Right */}
          <ellipse id="shoulder-front-right" cx="145" cy="65" rx="14" ry="18" style={getMuscleStyle('shoulder-front-right')} />
          
          {/* Side Delt Left */}
          <ellipse id="shoulder-side-left" cx="28" cy="80" rx="12" ry="16" style={getMuscleStyle('shoulder-side-left')} />
          {/* Side Delt Right */}
          <ellipse id="shoulder-side-right" cx="152" cy="80" rx="12" ry="16" style={getMuscleStyle('shoulder-side-right')} />
          
          {/* BICEPS - 2 heads each side */}
          {/* Biceps Long Head Left */}
          <path id="biceps-long-left" d="M 25 85 Q 22 110 24 135 Q 26 140 32 140 Q 30 115 33 90 Z" style={getMuscleStyle('biceps-long-left')} />
          {/* Biceps Long Head Right */}
          <path id="biceps-long-right" d="M 155 85 Q 158 110 156 135 Q 154 140 148 140 Q 150 115 147 90 Z" style={getMuscleStyle('biceps-long-right')} />
          
          {/* Biceps Short Head Left */}
          <path id="biceps-short-left" d="M 32 90 Q 30 110 31 135 Q 32 140 38 140 Q 39 115 36 90 Z" style={getMuscleStyle('biceps-short-left')} />
          {/* Biceps Short Head Right */}
          <path id="biceps-short-right" d="M 148 90 Q 150 110 149 135 Q 148 140 142 140 Q 141 115 144 90 Z" style={getMuscleStyle('biceps-short-right')} />
          
          {/* TRICEPS - 3 heads each side (back of arm, visible from front) */}
          {/* Triceps Long Head Left */}
          <path id="triceps-long-left" d="M 16 90 Q 12 110 13 135 Q 15 140 21 140 Q 20 115 19 90 Z" style={getMuscleStyle('triceps-long-left')} />
          {/* Triceps Long Head Right */}
          <path id="triceps-long-right" d="M 164 90 Q 168 110 167 135 Q 165 140 159 140 Q 160 115 161 90 Z" style={getMuscleStyle('triceps-long-right')} />
          
          {/* Triceps Lateral Head Left */}
          <path id="triceps-lateral-left" d="M 8 100 Q 5 115 6 135 Q 8 140 14 140 Q 12 120 11 100 Z" style={getMuscleStyle('triceps-lateral-left')} />
          {/* Triceps Lateral Head Right */}
          <path id="triceps-lateral-right" d="M 172 100 Q 175 115 174 135 Q 172 140 166 140 Q 168 120 169 100 Z" style={getMuscleStyle('triceps-lateral-right')} />
          
          {/* Triceps Medial Head Left */}
          <path id="triceps-medial-left" d="M 18 110 Q 14 120 15 135 Q 17 140 23 140 Q 22 125 20 110 Z" style={getMuscleStyle('triceps-medial-left')} />
          {/* Triceps Medial Head Right */}
          <path id="triceps-medial-right" d="M 162 110 Q 166 120 165 135 Q 163 140 157 140 Q 158 125 160 110 Z" style={getMuscleStyle('triceps-medial-right')} />
          
          {/* FOREARMS */}
          {/* Forearm Left */}
          <path id="forearm-left" d="M 24 140 Q 22 165 24 190 L 30 190 Q 28 165 32 140 Z" style={getMuscleStyle('forearm-left')} />
          {/* Forearm Right */}
          <path id="forearm-right" d="M 156 140 Q 158 165 156 190 L 150 190 Q 152 165 148 140 Z" style={getMuscleStyle('forearm-right')} />
          
          {/* ABS - 2 sections */}
          {/* Upper Abs */}
          <rect id="abs-upper" x="78" y="135" width="24" height="22" rx="2" style={getMuscleStyle('abs-upper')} />
          
          {/* Lower Abs */}
          <rect id="abs-lower" x="78" y="160" width="24" height="24" rx="2" style={getMuscleStyle('abs-lower')} />
          
          {/* OBLIQUES */}
          {/* Obliques Left */}
          <path id="obliques-left" d="M 50 125 Q 45 145 48 180 Q 54 185 60 180 Q 57 145 62 125 Z" style={getMuscleStyle('obliques-left')} />
          {/* Obliques Right */}
          <path id="obliques-right" d="M 130 125 Q 135 145 132 180 Q 126 185 120 180 Q 123 145 118 125 Z" style={getMuscleStyle('obliques-right')} />
          
          {/* HIP FLEXORS (visible front high leg) */}
          {/* Hip Flexor Left */}
          <path id="hip-flexor-left" d="M 58 188 Q 55 205 58 220 L 65 220 Q 62 205 65 188 Z" style={getMuscleStyle('hip-flexor-left')} />
          {/* Hip Flexor Right */}
          <path id="hip-flexor-right" d="M 122 188 Q 125 205 122 220 L 115 220 Q 118 205 115 188 Z" style={getMuscleStyle('hip-flexor-right')} />
          
          {/* QUADS - 2 muscles each leg */}
          {/* Quads Left Lateral */}
          <path id="quads-left" d="M 70 220 Q 68 260 70 300 L 80 300 Q 78 260 82 220 Z" style={getMuscleStyle('quads-left')} />
          {/* Quads Right Lateral */}
          <path id="quads-right" d="M 110 220 Q 112 260 110 300 L 100 300 Q 102 260 98 220 Z" style={getMuscleStyle('quads-right')} />
          
          {/* CALVES */}
          {/* Calf Left */}
          <path id="calves-left" d="M 74 300 Q 72 330 75 370 L 85 370 Q 82 330 86 300 Z" style={getMuscleStyle('calves-left')} />
          {/* Calf Right */}
          <path id="calves-right" d="M 106 300 Q 108 330 105 370 L 95 370 Q 98 330 94 300 Z" style={getMuscleStyle('calves-right')} />
        </svg>
      </div>

      {/* BACK VIEW */}
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 180 420" style={{ maxHeight: '100%', maxWidth: '100%' }} className="drop-shadow-lg">
          {/* Head */}
          <circle cx="90" cy="30" r="16" fill="#e8e8e8" stroke="#333" strokeWidth="0.5" />
          
          {/* TRAPS */}
          {/* Upper Traps Left */}
          <path id="traps-left" d="M 50 50 Q 70 60 90 65 L 95 85 Q 75 80 55 70 Z" style={getMuscleStyle('traps-left')} />
          {/* Upper Traps Right */}
          <path id="traps-right" d="M 130 50 Q 110 60 90 65 L 95 85 Q 115 80 125 70 Z" style={getMuscleStyle('traps-right')} />
          
          {/* REAR DELTS - 3 sections */}
          {/* Rear Delt Left */}
          <ellipse id="shoulder-rear-left" cx="40" cy="75" rx="12" ry="16" style={getMuscleStyle('shoulder-rear-left')} />
          {/* Rear Delt Right */}
          <ellipse id="shoulder-rear-right" cx="140" cy="75" rx="12" ry="16" style={getMuscleStyle('shoulder-rear-right')} />
          
          {/* LATS - Large back muscles */}
          {/* Lats Left */}
          <path id="lats-left" d="M 30 85 Q 25 130 28 180 Q 40 185 50 175 Q 48 130 55 85 Z" style={getMuscleStyle('lats-left')} />
          {/* Lats Right */}
          <path id="lats-right" d="M 150 85 Q 155 130 152 180 Q 140 185 130 175 Q 132 130 125 85 Z" style={getMuscleStyle('lats-right')} />
          
          {/* RHOMBOIDS - between shoulder blades */}
          {/* Rhomboids Left */}
          <path id="rhomboids-left" d="M 70 80 Q 65 110 68 140 Q 75 142 80 140 Q 77 110 82 80 Z" style={getMuscleStyle('rhomboids-left')} />
          {/* Rhomboids Right */}
          <path id="rhomboids-right" d="M 110 80 Q 115 110 112 140 Q 105 142 100 140 Q 103 110 98 80 Z" style={getMuscleStyle('rhomboids-right')} />
          
          {/* TRICEPS - 3 heads each side (more prominent from back) */}
          {/* Triceps Long Head Left */}
          <path id="triceps-long-left" d="M 45 95 Q 40 115 42 140 Q 48 142 52 140 Q 50 115 55 95 Z" style={getMuscleStyle('triceps-long-left')} />
          {/* Triceps Long Head Right */}
          <path id="triceps-long-right" d="M 135 95 Q 140 115 138 140 Q 132 142 128 140 Q 130 115 125 95 Z" style={getMuscleStyle('triceps-long-right')} />
          
          {/* Triceps Lateral Head Left */}
          <path id="triceps-lateral-left" d="M 52 100 Q 48 120 50 140 Q 56 142 60 140 Q 58 120 62 100 Z" style={getMuscleStyle('triceps-lateral-left')} />
          {/* Triceps Lateral Head Right */}
          <path id="triceps-lateral-right" d="M 128 100 Q 132 120 130 140 Q 124 142 120 140 Q 122 120 118 100 Z" style={getMuscleStyle('triceps-lateral-right')} />
          
          {/* Triceps Medial Head Left */}
          <path id="triceps-medial-left" d="M 59 110 Q 55 125 57 140 Q 63 142 67 140 Q 65 125 69 110 Z" style={getMuscleStyle('triceps-medial-left')} />
          {/* Triceps Medial Head Right */}
          <path id="triceps-medial-right" d="M 121 110 Q 125 125 123 140 Q 117 142 113 140 Q 115 125 111 110 Z" style={getMuscleStyle('triceps-medial-right')} />
          
          {/* FOREARMS (back/wrist extensors) */}
          {/* Forearm Left */}
          <path id="forearm-left" d="M 48 140 Q 46 165 48 190 L 54 190 Q 52 165 56 140 Z" style={getMuscleStyle('forearm-left')} />
          {/* Forearm Right */}
          <path id="forearm-right" d="M 132 140 Q 134 165 132 190 L 126 190 Q 128 165 124 140 Z" style={getMuscleStyle('forearm-right')} />
          
          {/* LOWER BACK / ERECTORS */}
          {/* Lower Back Left */}
          <path id="lower-back-left" d="M 65 140 Q 60 170 65 200 L 75 200 Q 70 170 75 140 Z" style={getMuscleStyle('lower-back-left')} />
          {/* Lower Back Right */}
          <path id="lower-back-right" d="M 115 140 Q 120 170 115 200 L 105 200 Q 110 170 105 140 Z" style={getMuscleStyle('lower-back-right')} />
          
          {/* GLUTES */}
          {/* Glutes Left */}
          <ellipse id="glutes-left" cx="60" cy="215" rx="18" ry="22" style={getMuscleStyle('glutes-left')} />
          {/* Glutes Right */}
          <ellipse id="glutes-right" cx="120" cy="215" rx="18" ry="22" style={getMuscleStyle('glutes-right')} />
          
          {/* HAMSTRINGS */}
          {/* Hamstrings Left */}
          <path id="hamstrings-left" d="M 70 245 Q 68 275 72 310 L 82 310 Q 78 275 84 245 Z" style={getMuscleStyle('hamstrings-left')} />
          {/* Hamstrings Right */}
          <path id="hamstrings-right" d="M 110 245 Q 112 275 108 310 L 98 310 Q 102 275 96 245 Z" style={getMuscleStyle('hamstrings-right')} />
          
          {/* CALVES (back view) */}
          {/* Calf Left */}
          <path id="calves-left" d="M 74 310 Q 72 335 76 370 L 86 370 Q 82 335 86 310 Z" style={getMuscleStyle('calves-left')} />
          {/* Calf Right */}
          <path id="calves-right" d="M 106 310 Q 108 335 104 370 L 94 370 Q 98 335 94 310 Z" style={getMuscleStyle('calves-right')} />
        </svg>
      </div>
    </div>
  );
}
