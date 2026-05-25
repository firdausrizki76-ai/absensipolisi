"use client";

interface TopAppBarProps {
  onMenuClick: () => void;
}

export default function TopAppBar({ onMenuClick }: TopAppBarProps) {
  return (
    <header className="flex justify-between items-center px-4 md:px-container-padding sticky top-0 z-30 w-full h-16 border-b border-outline-variant bg-surface">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden material-symbols-outlined text-primary p-2 hover:bg-surface-container-high rounded-full transition-colors"
        >
          menu
        </button>
        <span className="font-headline-lg text-[16px] md:text-[24px] font-bold uppercase tracking-tight text-primary truncate">
          SI ABDI - POLRES PELABUHAN MAKASAR
        </span>
      </div>
      
      <div className="flex items-center gap-2 md:gap-stack-md">
        <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input 
            className="bg-transparent border-none text-body-sm focus:ring-0 text-on-surface placeholder-on-surface-variant/50 w-48 outline-none" 
            placeholder="Cari..." 
            type="text"
          />
        </div>
        
        <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high p-2 transition-colors cursor-pointer active:scale-95 rounded-full hidden sm:block">
          notifications
        </button>
        <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-high p-2 transition-colors cursor-pointer active:scale-95 rounded-full hidden sm:block">
          settings
        </button>
        
        <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center overflow-hidden border border-primary ml-2">
          <img 
            alt="Officer Profile" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt8Vrhx6ompIkvRr3VEF0iq0XARkxUbxMADoFhY1CsJwJuIkKQ334TVBg7R0dFdnl-BpDrIwNVD_7rmv4MRQMo8rTdZychNZmHarrNx78EceG_mRLmP45KhQo6KV7kr0hA9ElM_5LBNlEMs_iH3JHbslfUqOE50UChmv5aulsE_Pup5tCVVzvtltBOGrXtEBrJrs-VWDdipfhPSHaoSpHaLxDvpFIIhD4bw8f6ut4GJ69s6BuXqdxwAoop_Wkagbqaf4xQkxcuwu0-"
          />
        </div>
      </div>
    </header>
  );
}
