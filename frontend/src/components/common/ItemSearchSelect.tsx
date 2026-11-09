import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Sparkles } from 'lucide-react';
import { api, ItemCatalogue } from '../../services/api';
import { formatINR } from '../../utils/formatters';

interface ItemSearchSelectProps {
  value: number | null;
  onChange: (item: ItemCatalogue) => void;
  placeholder?: string;
  className?: string;
}

export const ItemSearchSelect: React.FC<ItemSearchSelectProps> = ({
  value,
  onChange,
  placeholder = 'Search & select fabric item (e.g. type "R")...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<ItemCatalogue[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogue | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load items based on search term
  useEffect(() => {
    let isCancelled = false;
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const res = await api.getItems({ q: searchTerm, active_only: true });
        if (!isCancelled) {
          setItems(res);
          // If value was pre-selected, resolve it
          if (value && !selectedItem) {
            const found = res.find((i) => i.id === value);
            if (found) setSelectedItem(found);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchItems();
    return () => {
      isCancelled = true;
    };
  }, [searchTerm, value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (item: ItemCatalogue) => {
    setSelectedItem(item);
    onChange(item);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 min-h-[46px] bg-white rounded-xl border border-slate-300 hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-colors shadow-2xs"
      >
        <div className="flex-1 truncate mr-2">
          {selectedItem ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 truncate">
                {selectedItem.item_name}
              </span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                {formatINR(selectedItem.price_per_piece)}/pc
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-slide-in">
          {/* Search Input inside Dropdown */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to filter items (e.g. 'R')..."
                className="w-full pl-9 pr-3 py-2 bg-white text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Items Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No active items matching "{searchTerm}"
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between p-3 text-xs sm:text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">{item.item_name}</span>
                        {item.item_code && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.item_code}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-brand-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-xs shadow-2xs">
                        {formatINR(item.price_per_piece)}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
