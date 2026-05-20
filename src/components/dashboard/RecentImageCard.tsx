interface RecentImageCardProps {
  imageUrl: string;
  title: string;
  caption: string;
}

export function RecentImageCard({ imageUrl, title, caption }: RecentImageCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
      <img src={imageUrl} alt={title} className="h-56 w-full object-cover" />
      <div className="p-4">
        <p className="font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{caption}</p>
      </div>
    </div>
  );
}
