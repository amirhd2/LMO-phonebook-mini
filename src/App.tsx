import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Phone, Users, Settings, Plus, Edit2, Trash2, Search, Download, Upload, 
  Check, X, Eye, EyeOff, ArrowUpDown, ChevronDown, RefreshCw, FileText, 
  Building2, FolderTree, AlertCircle, Database, HelpCircle, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Types
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'numeric';
  visible: boolean;
  order: number;
}

export interface Section {
  id: string;
  name: string;
  order: number;
}

export interface Unit {
  id: string;
  name: string;
  sections: Section[];
  order: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  mobile?: string;
  unitId: string;
  sectionId?: string; // sub-unit
  customValues: Record<string, string | number>;
  order: number;
}

export interface Phonebook {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  units: Unit[];
  customFields: CustomField[];
  contacts: Contact[];
}

const DEFAULT_PHONEBOOK: Phonebook = {
  id: 'pb-1',
  name: 'دفتر تلفن مرکزی سازمان',
  isDefault: true,
  isActive: true,
  units: [
    {
      id: 'unit-1',
      name: 'فناوری اطلاعات و آمار',
      sections: [
        { id: 'sec-1', name: 'توسعه نرم‌افزار', order: 1 },
        { id: 'sec-2', name: 'پشتیبانی شبکه', order: 2 }
      ],
      order: 1
    },
    {
      id: 'unit-2',
      name: 'امور مالی و اداری',
      sections: [
        { id: 'sec-3', name: 'حسابداری', order: 1 },
        { id: 'sec-4', name: 'کارگزینی', order: 2 }
      ],
      order: 2
    }
  ],
  customFields: [
    { id: 'cf-1', name: 'شماره اتاق', type: 'numeric', visible: true, order: 1 },
    { id: 'cf-2', name: 'سمت سازمانی', type: 'text', visible: true, order: 2 }
  ],
  contacts: [
    {
      id: 'c-1',
      name: 'علی احمدی',
      phone: '۰۲۱۸۸776655',
      mobile: '۰۹۱۲۳۴۵۶۷۸۹',
      unitId: 'unit-1',
      sectionId: 'sec-1',
      customValues: { 'cf-1': 204, 'cf-2': 'ارشد توسعه' },
      order: 1
    },
    {
      id: 'c-2',
      name: 'مریم رضایی',
      phone: '۰۲۱۸۸776656',
      mobile: '۰۹۱۹۸۷۶۵۴۳۲',
      unitId: 'unit-1',
      sectionId: 'sec-2',
      customValues: { 'cf-1': 208, 'cf-2': 'مسئول شبکه' },
      order: 2
    },
    {
      id: 'c-3',
      name: 'حسن کریمی',
      phone: '۰۲۱۸۸776657',
      mobile: '۰۹۱۲۱۱۱2233',
      unitId: 'unit-2',
      sectionId: '',
      customValues: { 'cf-1': 105, 'cf-2': 'حسابرس ارشد' },
      order: 3
    }
  ]
};

export default function App() {
  const [phonebooks, setPhonebooks] = useState<Phonebook[]>(() => {
    const saved = localStorage.getItem('org_phonebooks_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [DEFAULT_PHONEBOOK];
  });

  const [activeTab, setActiveTab] = useState<'home' | 'manager' | 'fields' | 'settings'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

  // Modals
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [activeUnitForSection, setActiveUnitForSection] = useState<string>('');
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingSection, setEditingSection] = useState<{ unitId: string; section: Section } | null>(null);
  const [isAddPhonebookModalOpen, setIsAddPhonebookModalOpen] = useState(false);
  const [editingPhonebook, setEditingPhonebook] = useState<Phonebook | null>(null);

  // Form states
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    mobile: '',
    unitId: '',
    sectionId: '',
    customValues: {} as Record<string, string | number>
  });

  const [unitFormName, setUnitFormName] = useState('');
  const [sectionFormName, setSectionFormName] = useState('');
  const [fieldForm, setFieldForm] = useState({
    name: '',
    type: 'text' as 'text' | 'numeric'
  });
  const [phonebookFormName, setPhonebookFormName] = useState('');

  useEffect(() => {
    localStorage.setItem('org_phonebooks_v2', JSON.stringify(phonebooks));
  }, [phonebooks]);

  const activePhonebook = phonebooks.find(pb => pb.isActive) || phonebooks[0];

  const updateActivePhonebook = (updater: (pb: Phonebook) => Phonebook) => {
    setPhonebooks(phonebooks.map(pb => pb.id === activePhonebook.id ? updater(pb) : pb));
  };

  const switchPhonebook = (id: string) => {
    setPhonebooks(phonebooks.map(pb => ({
      ...pb,
      isActive: pb.id === id
    })));
  };

  const setAsDefaultPhonebook = (id: string) => {
    setPhonebooks(phonebooks.map(pb => ({
      ...pb,
      isDefault: pb.id === id
    })));
  };

  // Contacts sort: contacts with sub-units at top, without sub-units at bottom. Sections ordered as in manager.
  const getSortedContactsForUnit = (unitId: string) => {
    const unit = activePhonebook.units.find(u => u.id === unitId);
    if (!unit) return activePhonebook.contacts.filter(c => c.unitId === unitId);
    
    const unitContacts = activePhonebook.contacts.filter(c => c.unitId === unitId);
    const sectionOrderMap = new Map(unit.sections.map((sec, idx) => [sec.id, idx]));

    return [...unitContacts].sort((a, b) => {
      const aHasSec = Boolean(a.sectionId);
      const bHasSec = Boolean(b.sectionId);

      if (aHasSec && !bHasSec) return -1;
      if (!aHasSec && bHasSec) return 1;

      if (aHasSec && bHasSec) {
        const aIdx = sectionOrderMap.get(a.sectionId!) ?? 999;
        const bIdx = sectionOrderMap.get(b.sectionId!) ?? 999;
        if (aIdx !== bIdx) return aIdx - bIdx;
      }

      return a.order - b.order;
    });
  };

  // Export Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    phonebooks.forEach(pb => {
      const data = pb.contacts.map(c => {
        const unit = pb.units.find(u => u.id === c.unitId);
        const section = unit?.sections.find(s => s.id === c.sectionId);
        const row: Record<string, any> = {
          'نام و نام خانوادگی': c.name,
          'تلفن ثابت': c.phone,
          'تلفن همراه': c.mobile || '',
          'واحد سازمانی': unit?.name || '',
          'بخش': section?.name || ''
        };
        pb.customFields.forEach(cf => {
          row[cf.name] = c.customValues[cf.id] ?? '';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      // RTL sheet view
      if (!ws['!views']) ws['!views'] = [];
      ws['!views'].push({ rightToLeft: true });
      XLSX.utils.book_append_sheet(wb, ws, pb.name.replace(/[:\\\/?*[\]]/g, ''));
    });

    XLSX.writeFile(wb, `Organizational_Phonebooks_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const newPhonebooks: Phonebook[] = [...phonebooks];

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          if (json.length === 0) return;

          const unitsMap = new Map<string, Unit>();
          const sectionsMap = new Map<string, Map<string, Section>>();
          const contacts: Contact[] = [];
          const customFieldsMap = new Map<string, CustomField>();

          let unitCounter = 1;
          let secCounter = 1;
          let cfCounter = 1;
          let contactCounter = 1;

          json.forEach((row, idx) => {
            const name = row['نام و نام خانوادگی'] || row['نام'] || `مخاطب ${idx + 1}`;
            const phone = String(row['تلفن ثابت'] || row['تلفن'] || '');
            const mobile = String(row['تلفن همراه'] || row['موبایل'] || '');
            const unitName = String(row['واحد سازمانی'] || 'عمومی');
            const sectionName = String(row['بخش'] || '');

            if (!unitsMap.has(unitName)) {
              unitsMap.set(unitName, {
                id: `u-imp-${unitCounter++}`,
                name: unitName,
                sections: [],
                order: unitCounter
              });
              sectionsMap.set(unitName, new Map());
            }

            const unit = unitsMap.get(unitName)!;
            let sectionId = '';

            if (sectionName) {
              const secMap = sectionsMap.get(unitName)!;
              if (!secMap.has(sectionName)) {
                const newSec: Section = {
                  id: `sec-imp-${secCounter++}`,
                  name: sectionName,
                  order: secMap.size + 1
                };
                secMap.set(sectionName, newSec);
                unit.sections.push(newSec);
              }
              sectionId = secMap.get(sectionName)!.id;
            }

            const customValues: Record<string, string | number> = {};
            Object.keys(row).forEach(key => {
              if (!['نام و نام خانوادگی', 'نام', 'تلفن ثابت', 'تلفن', 'تلفن همراه', 'موبایل', 'واحد سازمانی', 'بخش'].includes(key)) {
                if (!customFieldsMap.has(key)) {
                  const val = row[key];
                  const isNum = typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '');
                  customFieldsMap.set(key, {
                    id: `cf-imp-${cfCounter++}`,
                    name: key,
                    type: isNum ? 'numeric' : 'text',
                    visible: true,
                    order: customFieldsMap.size + 1
                  });
                }
                const cf = customFieldsMap.get(key)!;
                customValues[cf.id] = row[key];
              }
            });

            contacts.push({
              id: `c-imp-${contactCounter++}`,
              name: String(name),
              phone,
              mobile,
              unitId: unit.id,
              sectionId,
              customValues,
              order: contactCounter
            });
          });

          const pbId = `pb-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          newPhonebooks.push({
            id: pbId,
            name: sheetName,
            isDefault: false,
            isActive: false,
            units: Array.from(unitsMap.values()),
            customFields: Array.from(customFieldsMap.values()),
            contacts
          });
        });

        setPhonebooks(newPhonebooks);
        alert('فایل اکسل با موفقیت وارد شد.');
      } catch (err) {
        console.error(err);
        alert('خطا در خواندن فایل اکسل.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Backup & Restore JSON
  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(phonebooks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `phonebooks_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const restoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setPhonebooks(parsed);
          alert('اطلاعات با موفقیت بازیابی شد.');
        } else {
          alert('فرمت فایل نامعتبر است.');
        }
      } catch (err) {
        alert('خطا در بازیابی فایل.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered contacts for Home view
  const filteredContacts = activePhonebook.contacts.filter(c => {
    const unit = activePhonebook.units.find(u => u.id === c.unitId);
    const section = unit?.sections.find(s => s.id === c.sectionId);

    const matchesSearch = searchQuery === '' || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.mobile && c.mobile.includes(searchQuery)) ||
      (unit && unit.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (section && section.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      Object.values(c.customValues).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesUnit = selectedUnitFilter === 'all' || c.unitId === selectedUnitFilter;
    const matchesSection = selectedSectionFilter === 'all' || c.sectionId === selectedSectionFilter;

    return matchesSearch && matchesUnit && matchesSection;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Vazirmatn']">
      
      {/* Top Navigation Bar - Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">دفترچه تلفن سازمان</h1>
              <p className="text-xs text-slate-500 hidden sm:block">سیستم جامع مدیریت مخاطبین و واحدها</p>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-line, whitespace-nowrap) */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                activeTab === 'home' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>صفحه اصلی و مخاطبین</span>
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                activeTab === 'manager' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>مدیریت دفترتلفن و واحدها</span>
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                activeTab === 'fields' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>فیلدهای نمایشی</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>تنظیمات و پشتیبان‌گیری</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setEditingContact(null);
                setContactForm({
                  name: '',
                  phone: '',
                  mobile: '',
                  unitId: activePhonebook.units[0]?.id || '',
                  sectionId: '',
                  customValues: {}
                });
                setIsAddContactModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن مخاطب</span>
            </button>
          </div>

        </div>

        {/* Mobile Navbar Row 2 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-100 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold">نسخه ۱.۲</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('manager')}
              className={`p-2 rounded-md ${activeTab === 'manager' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              title="مدیر"
            >
              <Building2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditingContact(null);
                setContactForm({
                  name: '',
                  phone: '',
                  mobile: '',
                  unitId: activePhonebook.units[0]?.id || '',
                  sectionId: '',
                  customValues: {}
                });
                setIsAddContactModalOpen(true);
              }}
              className="p-2 rounded-md bg-indigo-600 text-white"
              title="افزودن"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-md ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              title="تنظیمات"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-navbar for phonebook switcher & mobile tabs */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 relative">
            <span className="text-slate-500 font-medium">دفتر تلفن فعال:</span>
            <div className="relative">
              <button
                onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs font-semibold text-slate-800 flex items-center gap-2 hover:bg-slate-50"
              >
                <span>{activePhonebook.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showDropdownMenu && (
                <div className="absolute top-full mt-1 right-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-100">
                    انتخاب دفتر تلفن فعال
                  </div>
                  {phonebooks.map(pb => (
                    <div
                      key={pb.id}
                      onClick={() => {
                        switchPhonebook(pb.id);
                        setShowDropdownMenu(false);
                      }}
                      className={`px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        pb.isActive ? 'bg-indigo-50/60 text-indigo-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{pb.name}</span>
                      </div>
                      {pb.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">پیش‌فرض</span>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-slate-100 p-1">
                    <button
                      onClick={() => {
                        setShowDropdownMenu(false);
                        setEditingPhonebook(null);
                        setPhonebookFormName('');
                        setIsAddPhonebookModalOpen(true);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن دفتر تلفن جدید</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile tabs row */}
          <div className="flex md:hidden items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1 rounded ${activeTab === 'home' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              مخاطبین
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-3 py-1 rounded ${activeTab === 'manager' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              واحدها
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-3 py-1 rounded ${activeTab === 'fields' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              فیلدها
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 rounded ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              تنظیمات
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {/* TAB 1: HOME & CONTACTS */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Search and Filters bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام، تلفن، سمت، واحد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => {
                    setSelectedUnitFilter(e.target.value);
                    setSelectedSectionFilter('all');
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="all">همه واحدها</option>
                  {activePhonebook.units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                {selectedUnitFilter !== 'all' && (
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="all">همه بخش‌ها</option>
                    {activePhonebook.units.find(u => u.id === selectedUnitFilter)?.sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}

                {(searchQuery || selectedUnitFilter !== 'all' || selectedSectionFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedUnitFilter('all');
                      setSelectedSectionFilter('all');
                    }}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
                  >
                    حذف فیلترها
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Display grouped by Units (with sub-units at top, without sub-units at bottom) */}
            <div className="space-y-8">
              {activePhonebook.units
                .filter(u => selectedUnitFilter === 'all' || u.id === selectedUnitFilter)
                .map(unit => {
                  const sortedContacts = getSortedContactsForUnit(unit.id).filter(c => {
                    const matchesSearch = searchQuery === '' || 
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.phone.includes(searchQuery) ||
                      (c.mobile && c.mobile.includes(searchQuery)) ||
                      Object.values(c.customValues).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()));
                    const matchesSection = selectedSectionFilter === 'all' || c.sectionId === selectedSectionFilter;
                    return matchesSearch && matchesSection;
                  });

                  if (sortedContacts.length === 0 && (searchQuery || selectedUnitFilter !== 'all' || selectedSectionFilter !== 'all')) {
                    return null;
                  }

                  return (
                    <div key={unit.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-bold text-slate-900 text-base">{unit.name}</h3>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium">
                            {sortedContacts.length} مخاطب
                          </span>
                        </div>
                        {unit.sections.length > 0 && (
                          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                            <span>بخش‌ها:</span>
                            {unit.sections.map(sec => (
                              <span key={sec.id} className="px-2 py-0.5 bg-slate-200/60 rounded text-slate-700">{sec.name}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {sortedContacts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                          مخاطبی در این واحد ثبت نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                                <th className="py-3 px-4">نام و نام خانوادگی</th>
                                <th className="py-3 px-4">بخش</th>
                                <th className="py-3 px-4">تلفن ثابت</th>
                                <th className="py-3 px-4">تلفن همراه</th>
                                {activePhonebook.customFields.filter(cf => cf.visible).map(cf => (
                                  <th key={cf.id} className="py-3 px-4">{cf.name}</th>
                                ))}
                                <th className="py-3 px-4 text-center">عملیات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {sortedContacts.map(contact => {
                                const section = unit.sections.find(s => s.id === contact.sectionId);
                                return (
                                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-4 font-medium text-slate-900">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                          {contact.name.slice(0, 1)}
                                        </div>
                                        <span>{contact.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600">
                                      {section ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs bg-slate-100 text-slate-700 font-medium">
                                          {section.name}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-xs">بدون بخش</span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-700" dir="ltr">
                                      {contact.phone}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-700" dir="ltr">
                                      {contact.mobile || '-'}
                                    </td>
                                    {activePhonebook.customFields.filter(cf => cf.visible).map(cf => (
                                      <td key={cf.id} className="py-3.5 px-4 text-slate-600">
                                        {contact.customValues[cf.id] ?? '-'}
                                      </td>
                                    ))}
                                    <td className="py-3.5 px-4 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            setEditingContact(contact);
                                            setContactForm({
                                              name: contact.name,
                                              phone: contact.phone,
                                              mobile: contact.mobile || '',
                                              unitId: contact.unitId,
                                              sectionId: contact.sectionId || '',
                                              customValues: { ...contact.customValues }
                                            });
                                            setIsAddContactModalOpen(true);
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                          title="ویرایش"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`آیا از حذف مخاطب "${contact.name}" اطمینان دارید؟`)) {
                                              updateActivePhonebook(pb => ({
                                                ...pb,
                                                contacts: pb.contacts.filter(c => c.id !== contact.id)
                                              }));
                                            }
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="حذف"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

          </div>
        )}

        {/* TAB 2: MANAGER (Phonebook & Units & Sections) */}
        {activeTab === 'manager' && (
          <div className="space-y-6">
            
            {/* Phonebook Manager Workspace Header (Exact User Layout Requirements) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              
              {/* Top row on the left: Two capsule buttons for "پیش‌فرض" and "دفترتلفن فعال" */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setAsDefaultPhonebook(activePhonebook.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    activePhonebook.isDefault 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {activePhonebook.isDefault ? 'پیش‌فرض (فعال)' : 'تعیین به عنوان پیش‌فرض'}
                </button>
                <button
                  onClick={() => {
                    // Toggle active or keep active
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300"
                >
                  دفترتلفن فعال
                </button>
              </div>

              {/* Next row from the right: Phonebook icon, active phonebook name, and on their left side, edit (pencil) and delete (trash) icon buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{activePhonebook.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPhonebook(activePhonebook);
                      setPhonebookFormName(activePhonebook.name);
                      setIsAddPhonebookModalOpen(true);
                    }}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                    title="ویرایش نام دفتر تلفن"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (phonebooks.length <= 1) {
                        alert('حداقل یک دفتر تلفن باید وجود داشته باشد.');
                        return;
                      }
                      if (confirm(`آیا از حذف دفتر تلفن "${activePhonebook.name}" اطمینان دارید؟`)) {
                        const remaining = phonebooks.filter(pb => pb.id !== activePhonebook.id);
                        remaining[0].isActive = true;
                        setPhonebooks(remaining);
                      }
                    }}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                    title="حذف دفتر تلفن"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row below: Total contact count and unit count */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{activePhonebook.contacts.length}</span>
                  <span>تعداد مخاطبین</span>
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{activePhonebook.units.length}</span>
                  <span>تعداد واحدها</span>
                </div>
              </div>

            </div>

            {/* Units & Sections Management Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">مدیریت واحدهای سازمانی و بخش‌ها</h3>
                  <p className="text-xs text-slate-500 mt-1">واحدها و بخش‌های زیرمجموعه را مدیریت و ویرایش کنید.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitFormName('');
                    setIsAddUnitModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن واحد جدید</span>
                </button>
              </div>

              {/* Units List */}
              <div className="space-y-4">
                {activePhonebook.units.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                    هیچ واحدی ثبت نشده است. لطفا واحد جدید اضافه کنید.
                  </div>
                ) : (
                  activePhonebook.units.map(unit => (
                    <div key={unit.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          <span className="font-bold text-slate-900 text-sm">{unit.name}</span>
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {unit.sections.length} بخش
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveUnitForSection(unit.id);
                              setEditingSection(null);
                              setSectionFormName('');
                              setIsAddSectionModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>افزودن بخش</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingUnit(unit);
                              setUnitFormName(unit.name);
                              setIsAddUnitModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-slate-200"
                            title="ویرایش نام واحد"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف واحد "${unit.name}" و تمام بخش‌ها و مخاطبین آن اطمینان دارید؟`)) {
                                updateActivePhonebook(pb => ({
                                  ...pb,
                                  units: pb.units.filter(u => u.id !== unit.id),
                                  contacts: pb.contacts.filter(c => c.unitId !== unit.id)
                                }));
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-slate-200"
                            title="حذف واحد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sections List */}
                      {unit.sections.length > 0 && (
                        <div className="pr-8 pt-2 space-y-2 border-t border-slate-200/60">
                          <div className="text-xs font-semibold text-slate-500">بخش‌های زیرمجموعه:</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {unit.sections.map(section => (
                              <div key={section.id} className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-800 truncate">{section.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setActiveUnitForSection(unit.id);
                                      setEditingSection({ unitId: unit.id, section });
                                      setSectionFormName(section.name);
                                      setIsAddSectionModalOpen(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                    title="ویرایش نام بخش"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`آیا از حذف بخش "${section.name}" اطمینان دارید؟`)) {
                                        updateActivePhonebook(pb => ({
                                          ...pb,
                                          units: pb.units.map(u => u.id === unit.id ? {
                                            ...u,
                                            sections: u.sections.filter(s => s.id !== section.id)
                                          } : u),
                                          contacts: pb.contacts.map(c => c.sectionId === section.id ? { ...c, sectionId: '' } : c)
                                        }));
                                      }
                                    }}
                                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="حذف بخش"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: CUSTOM FIELDS */}
        {activeTab === 'fields' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">مدیریت فیلدهای نمایشی</h2>
                <p className="text-xs text-slate-500 mt-1">فیلدهای سفارشی اضافی برای ثبت اطلاعات مخاطبین (متنی یا عددی).</p>
              </div>
              <button
                onClick={() => {
                  setEditingField(null);
                  setFieldForm({ name: '', type: 'text' });
                  setIsAddFieldModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن فیلد جدید</span>
              </button>
            </div>

            {/* Custom fields boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePhonebook.customFields.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
                  هیچ فیلد نمایشی سفارشی تعریف نشده است.
                </div>
              ) : (
                activePhonebook.customFields.map(field => (
                  <div key={field.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                    {/* Row 1: Field name & type */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {field.type === 'numeric' ? 'عدد' : 'متن'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{field.name}</h4>
                          <span className="text-xs text-slate-500">
                            نوع ورودی: {field.type === 'numeric' ? 'فقط عددی' : 'متنی (حروف)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Display toggle, delete, and edit (pencil) icon buttons on the left side */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          updateActivePhonebook(pb => ({
                            ...pb,
                            customFields: pb.customFields.map(cf => cf.id === field.id ? { ...cf, visible: !cf.visible } : cf)
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          field.visible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}
                        title="نمایش / عدم نمایش در جدول"
                      >
                        {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{field.visible ? 'در حال نمایش' : 'مخفی'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingField(field);
                          setFieldForm({ name: field.name, type: field.type });
                          setIsAddFieldModalOpen(true);
                        }}
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                        title="ویرایش فیلد"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`آیا از حذف فیلد "${field.name}" اطمینان دارید؟`)) {
                            updateActivePhonebook(pb => ({
                              ...pb,
                              customFields: pb.customFields.filter(cf => cf.id !== field.id)
                            }));
                          }
                        }}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                        title="حذف فیلد"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & BACKUP */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-slate-900">تنظیمات و پشتیبان‌گیری اطلاعات</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Excel Export */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">خروجی اکسل (Excel)</h3>
                    <p className="text-xs text-slate-500">دریافت فایل اکسل چندبرگی از تمامی دفترتلفن‌ها و مخاطبین.</p>
                  </div>
                  <button
                    onClick={exportToExcel}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل اکسل</span>
                  </button>
                </div>

                {/* Excel Import */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">ورود از اکسل (Excel)</h3>
                    <p className="text-xs text-slate-500">بارگذاری اطلاعات دفترچه تلفن از فایل اکسل استاندارد.</p>
                  </div>
                  <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>انتخاب فایل اکسل</span>
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* JSON Backup & Restore */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">پشتیبان کامل (JSON)</h3>
                    <p className="text-xs text-slate-500">ذخیره نسخه پشتیبان کامل و بازیابی آن در سیستم.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadBackup}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>پشتیبان</span>
                    </button>
                    <label className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>بازیابی</span>
                      <input type="file" accept=".json" onChange={restoreBackup} className="hidden" />
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}

      {/* Add / Edit Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingContact ? 'ویرایش مخاطب' : 'افزودن مخاطب جدید'}
              </h3>
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!contactForm.name || !contactForm.phone || !contactForm.unitId) {
                  alert('لطفا نام، تلفن ثابت و واحد سازمانی را وارد کنید.');
                  return;
                }

                if (editingContact) {
                  updateActivePhonebook(pb => ({
                    ...pb,
                    contacts: pb.contacts.map(c => c.id === editingContact.id ? {
                      ...c,
                      ...contactForm,
                      sectionId: contactForm.sectionId || undefined
                    } : c)
                  }));
                } else {
                  const newC: Contact = {
                    id: `c-${Date.now()}`,
                    ...contactForm,
                    sectionId: contactForm.sectionId || undefined,
                    order: activePhonebook.contacts.length + 1
                  };
                  updateActivePhonebook(pb => ({
                    ...pb,
                    contacts: [...pb.contacts, newC]
                  }));
                }
                setIsAddContactModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: علی احمدی"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تلفن ثابت *</label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    placeholder="۰۲۱۸۸۷۷۶۶۵۵"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تلفن همراه</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">واحد سازمانی *</label>
                  <select
                    required
                    value={contactForm.unitId}
                    onChange={(e) => setContactForm({ ...contactForm, unitId: e.target.value, sectionId: '' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">انتخاب واحد</option>
                    {activePhonebook.units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">بخش زیرمجموعه</label>
                  <select
                    value={contactForm.sectionId}
                    onChange={(e) => setContactForm({ ...contactForm, sectionId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">بدون بخش</option>
                    {activePhonebook.units.find(u => u.id === contactForm.unitId)?.sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom fields inputs */}
              {activePhonebook.customFields.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500">فیلدهای نمایشی اضافی:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePhonebook.customFields.map(cf => (
                      <div key={cf.id}>
                        <label className="block text-xs font-medium text-slate-700 mb-1">{cf.name}</label>
                        <input
                          type={cf.type === 'numeric' ? 'number' : 'text'}
                          inputMode={cf.type === 'numeric' ? 'numeric' : 'text'}
                          value={contactForm.customValues[cf.id] ?? ''}
                          onChange={(e) => {
                            const val = cf.type === 'numeric' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                            setContactForm({
                              ...contactForm,
                              customValues: {
                                ...contactForm.customValues,
                                [cf.id]: val
                              }
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingContact ? 'ذخیره تغییرات' : 'افزودن مخاطب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Unit Modal (Text keyboard explicitly) */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUnit ? 'ویرایش نام واحد سازمانی' : 'افزودن واحد سازمانی جدید'}
              </h3>
              <button
                onClick={() => setIsAddUnitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!unitFormName.trim()) return;

                if (editingUnit) {
                  updateActivePhonebook(pb => ({
                    ...pb,
                    units: pb.units.map(u => u.id === editingUnit.id ? { ...u, name: unitFormName.trim() } : u)
                  }));
                } else {
                  const newU: Unit = {
                    id: `u-${Date.now()}`,
                    name: unitFormName.trim(),
                    sections: [],
                    order: activePhonebook.units.length + 1
                  };
                  updateActivePhonebook(pb => ({
                    ...pb,
                    units: [...pb.units, newU]
                  }));
                }
                setIsAddUnitModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان واحد سازمانی *</label>
                <input
                  type="text"
                  required
                  inputMode="text"
                  placeholder="مثال: معاونت مالی و اداری"
                  value={unitFormName}
                  onChange={(e) => setUnitFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingUnit ? 'ذخیره' : 'افزودن واحد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Section Modal (Text keyboard explicitly) */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSection ? 'ویرایش نام بخش' : 'افزودن بخش جدید'}
              </h3>
              <button
                onClick={() => setIsAddSectionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!sectionFormName.trim()) return;

                if (editingSection) {
                  updateActivePhonebook(pb => ({
                    ...pb,
                    units: pb.units.map(u => u.id === editingSection.unitId ? {
                      ...u,
                      sections: u.sections.map(s => s.id === editingSection.section.id ? { ...s, name: sectionFormName.trim() } : s)
                    } : u)
                  }));
                } else {
                  const newSec: Section = {
                    id: `sec-${Date.now()}`,
                    name: sectionFormName.trim(),
                    order: 999
                  };
                  updateActivePhonebook(pb => ({
                    ...pb,
                    units: pb.units.map(u => u.id === activeUnitForSection ? {
                      ...u,
                      sections: [...u.sections, newSec]
                    } : u)
                  }));
                }
                setIsAddSectionModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان بخش *</label>
                <input
                  type="text"
                  required
                  inputMode="text"
                  placeholder="مثال: دپارتمان نرم‌افزار"
                  value={sectionFormName}
                  onChange={(e) => setSectionFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingSection ? 'ذخیره' : 'افزودن بخش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Custom Field Modal (with type prompt: text vs numeric, and text keyboard for name) */}
      {isAddFieldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingField ? 'ویرایش فیلد نمایشی' : 'افزودن فیلد نمایشی جدید'}
              </h3>
              <button
                onClick={() => setIsAddFieldModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!fieldForm.name.trim()) return;

                if (editingField) {
                  updateActivePhonebook(pb => ({
                    ...pb,
                    customFields: pb.customFields.map(cf => cf.id === editingField.id ? {
                      ...cf,
                      name: fieldForm.name.trim(),
                      type: fieldForm.type
                    } : cf)
                  }));
                } else {
                  const newCf: CustomField = {
                    id: `cf-${Date.now()}`,
                    name: fieldForm.name.trim(),
                    type: fieldForm.type,
                    visible: true,
                    order: activePhonebook.customFields.length + 1
                  };
                  updateActivePhonebook(pb => ({
                    ...pb,
                    customFields: [...pb.customFields, newCf]
                  }));
                }
                setIsAddFieldModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان فیلد جدید (متن) *</label>
                <input
                  type="text"
                  required
                  inputMode="text"
                  placeholder="مثال: شماره اتاق یا سمت"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">نوع ورودی این فیلد:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFieldForm({ ...fieldForm, type: 'text' })}
                    className={`py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      fieldForm.type === 'text' 
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>متنی (حروف)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFieldForm({ ...fieldForm, type: 'numeric' })}
                    className={`py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      fieldForm.type === 'numeric' 
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold text-sm">۱۲۳</span>
                    <span>عددی فقط</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingField ? 'ذخیره تغییرات' : 'افزودن فیلد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Phonebook Modal */}
      {isAddPhonebookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPhonebook ? 'ویرایش نام دفتر تلفن' : 'افزودن دفتر تلفن جدید'}
              </h3>
              <button
                onClick={() => setIsAddPhonebookModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!phonebookFormName.trim()) return;

                if (editingPhonebook) {
                  setPhonebooks(phonebooks.map(pb => pb.id === editingPhonebook.id ? { ...pb, name: phonebookFormName.trim() } : pb));
                } else {
                  const newPb: Phonebook = {
                    id: `pb-${Date.now()}`,
                    name: phonebookFormName.trim(),
                    isDefault: false,
                    isActive: true,
                    units: [],
                    customFields: [],
                    contacts: []
                  };
                  setPhonebooks(phonebooks.map(pb => ({ ...pb, isActive: false })).concat(newPb));
                }
                setIsAddPhonebookModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نام دفتر تلفن *</label>
                <input
                  type="text"
                  required
                  inputMode="text"
                  placeholder="مثال: دفتر تلفن استان تهران"
                  value={phonebookFormName}
                  onChange={(e) => setPhonebookFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPhonebookModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {editingPhonebook ? 'ذخیره' : 'ایجاد و فعال‌سازی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
