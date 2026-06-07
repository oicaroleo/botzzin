interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'purple' | 'yellow' | 'green' | 'red';
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
};

export default function MetricCard({ label, value, icon, color }: MetricCardProps) {
  return (
    <div className={`${colorStyles[color]} rounded-lg shadow p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <p className="text-4xl">{icon}</p>
      </div>
    </div>
  );
}
