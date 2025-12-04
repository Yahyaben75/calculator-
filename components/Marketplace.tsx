
import React, { useState, useEffect, useRef } from 'react';

// Shared key with the Platformer game so coins are shared
const CURRENCY_KEY = 'platformer_totalCoins';
const MARKET_ITEMS_KEY = 'marketplace_listings';
const INVENTORY_KEY = 'marketplace_inventory';

interface MarketplaceProps {
  onExit: () => void;
}

interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string; // Base64
  seller: string;
  isSold: boolean;
  fileData?: string | null; // Base64 of the product file
  fileName?: string; // Name of the product file
}

const DEFAULT_ITEMS: MarketItem[] = [
  {
    id: 'def-1',
    title: 'Glitch Key',
    description: 'A mysterious key found in the void.',
    price: 500,
    image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTRiOGE2IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0yMSAybC0yIDJtLTItMmwtMiAybS0yLTJsLTIgMm0tMi0ybC0yIDJNMCAxMGgwdjRoMHYtNGgwem00IDE0djJtMCAyVjEwbTAtNmw2IDZtNi02djEyIiBzdHJva2U9IiMzNGQzOTkiLz48L3N2Zz4=',
    seller: 'System',
    isSold: false,
  },
  {
    id: 'def-2',
    title: 'Cyber Burger',
    description: '100% Digital calories.',
    price: 50,
    image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik00IDhoMTZhMiA4IDAgMCAwLTE2IDB6bTAgNmgxNnY0YTQgNCAwIDAgMS0xNiAwdi00em0yLTRoMTJtLTIgMmgtOCIvPjwvc3ZnPg==',
    seller: 'Chef_Bot',
    isSold: false,
  },
  {
    id: 'def-3',
    title: 'Invisibility Cloak',
    description: 'You can\'t see it, but it\'s there.',
    price: 1500,
    image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NjY5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjQgNCI+PHBhdGggZD0iTTIgMTJzNC04IDEwLTggMTAgOCAxMCA4LTQtOC0xMC04LTEwIDgtMTAgOHoiLz48cGF0aCBkPSJNMTAgMTJhMiAyIDAgMSAwIDQgMCAyIDIgMCAwIDAtNCAweiIvPjwvc3ZnPg==',
    seller: 'Ghost',
    isSold: false,
  }
];

const Marketplace: React.FC<MarketplaceProps> = ({ onExit }) => {
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'inventory'>('buy');
  const [items, setItems] = useState<MarketItem[]>([]);
  const [inventory, setInventory] = useState<MarketItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Sell Form State
  const [sellTitle, setSellTitle] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellImage, setSellImage] = useState<string | null>(null);
  const [sellFile, setSellFile] = useState<string | null>(null);
  const [sellFileName, setSellFileName] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    // Load Coins
    try {
      const savedCoins = localStorage.getItem(CURRENCY_KEY);
      setBalance(savedCoins ? parseInt(savedCoins, 10) : 0);
    } catch (e) {
      setBalance(0);
    }

    // Load Items
    try {
      const savedItems = localStorage.getItem(MARKET_ITEMS_KEY);
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      } else {
        setItems(DEFAULT_ITEMS);
        localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(DEFAULT_ITEMS));
      }
    } catch (e) {
      setItems(DEFAULT_ITEMS);
    }

    // Load Inventory
    try {
        const savedInventory = localStorage.getItem(INVENTORY_KEY);
        if (savedInventory) {
            setInventory(JSON.parse(savedInventory));
        }
    } catch (e) {
        setInventory([]);
    }
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuy = (item: MarketItem) => {
    if (balance >= item.price) {
      const newBalance = balance - item.price;
      setBalance(newBalance);
      localStorage.setItem(CURRENCY_KEY, newBalance.toString());

      // Mark as sold in listings
      const updatedItems = items.map(i => i.id === item.id ? { ...i, isSold: true } : i);
      setItems(updatedItems);
      localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(updatedItems));

      // Add to inventory
      const newInventory = [item, ...inventory];
      setInventory(newInventory);
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(newInventory));
      
      showNotification(`Successfully purchased ${item.title}!`);
    } else {
      showNotification("Insufficient funds! Play games to earn more.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSellImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSellFile(reader.result as string);
        setSellFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleListItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTitle || !sellPrice || !sellImage) {
      showNotification("Please fill in all fields and add an image.");
      return;
    }

    const priceNum = parseInt(sellPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      showNotification("Invalid price.");
      return;
    }

    const newItem: MarketItem = {
      id: Date.now().toString(),
      title: sellTitle,
      description: sellDesc || 'No description provided.',
      price: priceNum,
      image: sellImage,
      seller: 'You',
      isSold: false,
      fileData: sellFile,
      fileName: sellFileName,
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(updatedItems));

    // Reset Form
    setSellTitle('');
    setSellPrice('');
    setSellDesc('');
    setSellImage(null);
    setSellFile(null);
    setSellFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (productFileInputRef.current) productFileInputRef.current.value = '';
    
    showNotification("Item listed successfully!");
    setActiveTab('buy');
  };

  const handleDownload = (item: MarketItem) => {
    if (!item.fileData) return;
    const link = document.createElement('a');
    link.href = item.fileData;
    link.download = item.fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-indigo-500/50 w-full h-[500px] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
        <div className="flex flex-col">
            <span className="text-xs text-gray-400">WALLET BALANCE</span>
            <span className="text-2xl font-bold text-yellow-400 font-mono tracking-wider">{balance} 🪙</span>
        </div>
        <div className="flex space-x-2">
            <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-md transition-colors">
            Exit
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 bg-slate-800 rounded-lg p-1 space-x-1">
        <button 
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${activeTab === 'buy' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Market
        </button>
        <button 
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${activeTab === 'sell' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Sell
        </button>
         <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          My Items
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {notification && (
            <div className="sticky top-0 z-10 bg-indigo-500 text-white px-4 py-2 rounded-md mb-4 text-center text-sm font-bold shadow-lg animate-fade-in-fast">
                {notification}
            </div>
        )}

        {activeTab === 'buy' && (
          <div className="grid grid-cols-2 gap-3">
            {items.filter(i => !i.isSold).length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-10 flex flex-col items-center">
                    <span className="text-4xl mb-2">🛒</span>
                    <p>Market is empty.</p>
                    <p className="text-xs mt-1">Be the first to list an item!</p>
                </div>
            )}
            {items.filter(i => !i.isSold).map((item) => (
              <div key={item.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700 hover:border-indigo-400 transition-colors flex flex-col group">
                <div className="w-full aspect-square bg-slate-900 rounded-md mb-2 overflow-hidden relative">
                    {item.image.startsWith('data:image') ? (
                         <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">No Img</div>
                    )}
                    <div className="absolute top-1 right-1 bg-black/60 px-1.5 rounded text-[10px] text-white">
                        {item.seller}
                    </div>
                </div>
                <h3 className="font-bold text-white text-sm truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 truncate mb-2">{item.description}</p>
                <div className="mt-auto flex justify-between items-center">
                    <span className="text-yellow-400 font-mono font-bold text-sm">{item.price} 🪙</span>
                    <button 
                        onClick={() => handleBuy(item)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded font-bold transition-colors"
                    >
                        BUY
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sell' && (
          <form onSubmit={handleListItem} className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="text-center mb-4">
                <div 
                    className="w-32 h-32 mx-auto bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 overflow-hidden relative"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {sellImage ? (
                        <img src={sellImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center">
                             <span className="text-2xl mb-1">📷</span>
                             <span className="text-gray-500 text-[10px]">Thumbnail</span>
                        </div>
                    )}
                </div>
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                />
            </div>
            
            <div>
                <label className="block text-xs text-gray-400 mb-1">Item Title</label>
                <input 
                    type="text" 
                    value={sellTitle}
                    onChange={(e) => setSellTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-indigo-400 text-sm"
                    placeholder="e.g. Legendary Sword"
                    maxLength={20}
                />
            </div>

            <div className="flex space-x-2">
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Price (Coins)</label>
                    <input 
                        type="number" 
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-indigo-400 text-sm"
                        placeholder="0"
                        min="0"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs text-gray-400 mb-1">Digital Product File (Optional)</label>
                <div 
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white flex items-center justify-between cursor-pointer hover:border-indigo-400"
                    onClick={() => productFileInputRef.current?.click()}
                >
                    <span className="text-sm truncate text-gray-300">
                        {sellFileName || "Upload file to sell..."}
                    </span>
                    <span className="text-lg">📎</span>
                </div>
                <input 
                    type="file" 
                    className="hidden" 
                    ref={productFileInputRef}
                    onChange={handleProductFileUpload}
                />
            </div>

            <div>
                <label className="block text-xs text-gray-400 mb-1">Description (Optional)</label>
                <textarea 
                    value={sellDesc}
                    onChange={(e) => setSellDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-indigo-400 text-sm h-20 resize-none"
                    placeholder="Describe your item..."
                    maxLength={50}
                />
            </div>

            <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
            >
                LIST ITEM FOR SALE
            </button>
          </form>
        )}

        {activeTab === 'inventory' && (
             <div className="grid grid-cols-2 gap-3">
             {inventory.length === 0 && (
                 <div className="col-span-2 text-center text-gray-500 py-10 flex flex-col items-center">
                     <span className="text-4xl mb-2">🎒</span>
                     <p>You haven't bought anything yet.</p>
                     <p className="text-xs mt-1">Visit the Market to spend your coins!</p>
                 </div>
             )}
             {inventory.map((item, index) => (
               <div key={`${item.id}-${index}`} className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex flex-col opacity-90">
                 <div className="w-full aspect-square bg-slate-900 rounded-md mb-2 overflow-hidden relative">
                     {item.image.startsWith('data:image') ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-600">No Img</div>
                     )}
                     <div className="absolute top-1 right-1 bg-emerald-600/80 px-1.5 rounded text-[10px] text-white">
                         OWNED
                     </div>
                 </div>
                 <h3 className="font-bold text-white text-sm truncate">{item.title}</h3>
                 <p className="text-xs text-gray-400 truncate">{item.description}</p>
                 <div className="mt-2 text-xs text-gray-500">Bought for {item.price} 🪙</div>
                 
                 {item.fileData && (
                    <button 
                        onClick={() => handleDownload(item)}
                        className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1 rounded font-bold transition-colors flex items-center justify-center gap-1"
                    >
                        <span>⬇️</span> DOWNLOAD
                    </button>
                 )}
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
