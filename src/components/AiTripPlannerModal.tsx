import React, { useState, useMemo, useRef } from 'react';
import { FoodTripTemplates } from './FoodTripTemplates';
import { SmartHubHealthySection } from './SmartHubHealthySection';
import { useApp } from '../context/AppContext';
import {
  X,
  Sparkles,
  Bot,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Share2,
  BookmarkCheck,
  RefreshCw,
  Compass,
  Utensils,
  Crown,
  Lock,
  CheckCircle2,
  Navigation,
  ChefHat,
  Search,
  HeartPulse,
} from 'lucide-react';
import { TripPlan, isUserVipActive, isAdminAccount } from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { IconSmartAssistant } from './icons/HandcraftedIcons';
import {
  translateDynamicTextToZh,
  getLocalizedFood,
  getLocalizedRestaurant,
} from '../utils/zhDynamicTranslator';
import { DishTagId } from '../utils/dishTags';
import { requestTagFilter } from '../utils/smartHub';
import {
  AdvisorGoalId,
  QUICK_CRAVING_CHIPS,
  getAiFoodAdvisorRecommendations,
} from '../services/aiFoodAdvisorService';
import { AiBrainInsightCard } from './AiBrainInsightCard';

export interface CambodiaProvinceTripOption {
  id: string;
  nameKh: string;
  shortKh: string;
  nameEn: string;
  nameZh: string;
  highlightKh: string;
  highlightEn: string;
  highlightZh?: string;
}

export const ALL_25_CAMBODIA_PROVINCES: CambodiaProvinceTripOption[] = [
  { id: 'ខេត្តសៀមរាប', nameKh: 'ខេត្តសៀមរាប', shortKh: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒省', highlightKh: 'ប្រាសាទអង្គរវត្ត ភ្នំគូលែន ផាប់ស្ទ្រីត និងភូមិវប្បធម៌', highlightEn: 'Angkor Wat, Phnom Kulen & Pub Street', highlightZh: '吴哥窟、荔枝山国家公园与暹粒酒吧街夜市' },
  { id: 'ខេត្តកំពត', nameKh: 'ខេត្តកំពត', shortKh: 'កំពត', nameEn: 'Kampot', nameZh: '贡布省', highlightKh: 'ឧទ្យានជាតិភ្នំបូកគោ ព្រែកកំពត និងចម្ការម្រេចកំពត', highlightEn: 'Bokor Mountain, Kampot River & Pepper Farms', highlightZh: '波哥山国家公园、贡布河畔与有机胡椒庄园' },
  { id: 'ខេត្តព្រះសីហនុ', nameKh: 'ខេត្តព្រះសីហនុ', shortKh: 'ព្រះសីហនុ', nameEn: 'Preah Sihanouk', nameZh: '西哈努克省', highlightKh: 'ឆ្នេរអូរឈើទាល កោះរ៉ុង កោះរ៉ុងសន្លឹម និងទឹកធ្លាក់ក្បាលឆាយ', highlightEn: 'Otres Beach, Koh Rong Islands & Kbal Chhay', highlightZh: '奥特斯海滩、高龙岛、高龙撒冷岛与高巴柴瀑布' },
  { id: 'ខេត្តមណ្ឌលគិរី', nameKh: 'ខេត្តមណ្ឌលគិរី', shortKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri', nameZh: '蒙多基里省', highlightKh: 'ទឹកធ្លាក់ប៊ូស្រា សមុទ្រឈើ និងដែនជម្រកសត្វដំរី', highlightEn: 'Bousra Waterfall, Sea Forest & Elephant Sanctuary', highlightZh: '布斯拉大瀑布、高山林海与大象生态保护谷' },
  { id: 'រាជធានីភ្នំពេញ', nameKh: 'រាជធានីភ្នំពេញ', shortKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边市', highlightKh: 'ព្រះបរមរាជវាំង វត្តភ្នំ មាត់ទន្លេចតុមុខ និងផ្សារធំថ្មី', highlightEn: 'Royal Palace, Wat Phnom, Riverside & Central Market', highlightZh: '金边皇宫、塔山寺、四臂湾河畔大道与中央市场' },
  { id: 'ខេត្តកែប', nameKh: 'ខេត្តកែប', shortKh: 'កែប', nameEn: 'Kep', nameZh: '白马省', highlightKh: 'ឆ្នេរកែប ផ្សារក្ដាម កោះទន្សាយ និងឧទ្យានជាតិកែប', highlightEn: 'Kep Beach, Crab Market, Rabbit Island & National Park', highlightZh: '白马海滩、著名螃蟹市场、兔子岛与白马国家公园' },
  { id: 'ខេត្តបាត់ដំបង', nameKh: 'ខេត្តបាត់ដំបង', shortKh: 'បាត់ដំបង', nameEn: 'Battambang', nameZh: '马德望省', highlightKh: 'ភ្នំសំពៅ ឡូរីបាត់ដំបង ប្រាសាទបាណន់ និងស្ទឹងសង្កែ', highlightEn: 'Phnom Sampeau, Bamboo Train & Wat Banan', highlightZh: '森宝山蝙蝠洞、马德望竹火车与巴南山古寺' },
  { id: 'ខេត្តកោះកុង', nameKh: 'ខេត្តកោះកុង', shortKh: 'កោះកុង', nameEn: 'Koh Kong', nameZh: '国公省', highlightKh: 'ទឹកធ្លាក់តាតៃ ព្រៃកោងកាងពាមក្រសោប និងតំបន់អារ៉ែង', highlightEn: 'Tatai Waterfall, Peam Krasop Mangroves & Areng Valley', highlightZh: '塔泰大瀑布、皮姆克索红树林与阿楞河谷生态区' },
  { id: 'ខេត្តរតនគិរី', nameKh: 'ខេត្តរតនគិរី', shortKh: 'រតនគិរី', nameEn: 'Ratanakiri', nameZh: '拉达那基里省', highlightKh: 'បឹងយក្សឡោម ទឹកធ្លាក់កាចាញ ទឹកធ្លាក់ចាអុង និងវាលថ្មរំប្លង់', highlightEn: 'Yeak Laom Lake, Kachanh & Cha Ong Waterfalls', highlightZh: '野龙火山口湖、卡昌瀑布与查翁水帘洞大瀑布' },
  { id: 'ខេត្តកណ្តាល', nameKh: 'ខេត្តកណ្តាល', shortKh: 'កណ្តាល', nameEn: 'Kandal', nameZh: '干丹省', highlightKh: 'ភ្នំព្រះរាជទ្រព្យ (ឧត្តុង្គ) កោះឧកញ៉ាតី និងរមណីយដ្ឋានភ្នំធន់មន្ទ', highlightEn: 'Oudong Mountain, Koh Dach Silk Island & Mekong Cruises', highlightZh: '乌栋山皇家古都、丝绸岛与湄公河生态度假区' },
  { id: 'ខេត្តកំពង់ចាម', nameKh: 'ខេត្តកំពង់ចាម', shortKh: 'កំពង់ចាម', nameEn: 'Kampong Cham', nameZh: '磅湛省', highlightKh: 'ស្ពានឫស្សីកោះប៉ែន ប្រាសាទនគរបាជ័យ និងភ្នំប្រុសភ្នំស្រី', highlightEn: 'Koh Paen Bamboo Bridge, Wat Nokor & Phnom Pros', highlightZh: '竹桥沙洲岛、诺哥巴彻古寺与男人山女人山' },
  { id: 'ខេត្តកំពង់ឆ្នាំង', nameKh: 'ខេត្តកំពង់ឆ្នាំង', shortKh: 'កំពង់ឆ្នាំង', nameEn: 'Kampong Chhnang', nameZh: '磅清扬省', highlightKh: 'ភូមិស្មូនឆ្នាំងអណ្តូងឫស្សី ភូមិបណ្តែតទឹក និងភ្នំសន្ទូច', highlightEn: 'Andoung Russei Pottery Village & Floating Villages', highlightZh: '传统红陶文化村、洞里萨湖水上浮村与仙女山' },
  { id: 'ខេត្តកំពង់ស្ពឺ', nameKh: 'ខេត្តកំពង់ស្ពឺ', shortKh: 'កំពង់ស្ពឺ', nameEn: 'Kampong Speu', nameZh: '磅士卑省', highlightKh: 'ឧទ្យានជាតិគិរីរម្យ ទឹកធ្លាក់ជ្រាវ និងភ្នំឱរ៉ាល់', highlightEn: 'Kirirom Pine National Park, Chambok & Chreav Waterfall', highlightZh: '基里隆高原松林国家公园、占博瀑布与奥拉山' },
  { id: 'ខេត្តកំពង់ធំ', nameKh: 'ខេត្តកំពង់ធំ', shortKh: 'កំពង់ធំ', nameEn: 'Kampong Thom', nameZh: '磅同省', highlightKh: 'ប្រាសាទសំបូរព្រៃគុក (បេតិកភណ្ឌពិភពលោក) និងភ្នំសន្ទុក', highlightEn: 'Sambor Prei Kuk UNESCO Temples & Phnom Santuk', highlightZh: '三波坡雷古世界文化遗产寺庙群与山都圣山' },
  { id: 'ខេត្តក្រចេះ', nameKh: 'ខេត្តក្រចេះ', shortKh: 'ក្រចេះ', nameEn: 'Kratie', nameZh: '桔井省', highlightKh: 'អន្លង់ផ្សោតកាំពី កោះទ្រង់ និងប្រាសាទសសរ ១០០', highlightEn: 'Kampi Irrawaddy Dolphins, Koh Trong & 100-Pillar Pagoda', highlightZh: '甘比湄公河江豚保护区、笼岛甜柚园与百柱寺' },
  { id: 'ខេត្តតាកែវ', nameKh: 'ខេត្តតាកែវ', shortKh: 'តាកែវ', nameEn: 'Takeo', nameZh: '茶胶省', highlightKh: 'ភ្នំដា ប្រាសាទភ្នំជីសូរ ប្រាសាទតាព្រហ្មទន្លេបាទី និងភ្នំតាម៉ៅ', highlightEn: 'Phnom Da, Phnom Chisor, Tonle Bati & Phnom Tamao Zoo', highlightZh: '达山扶南古迹、奇索山古寺、巴蒂湖与达茅山野生动物园' },
  { id: 'ខេត្តព្រៃវែង', nameKh: 'ខេត្តព្រៃវែង', shortKh: 'ព្រៃវែង', nameEn: 'Prey Veng', nameZh: '波罗勉省', highlightKh: 'រមណីយដ្ឋានបាភ្នំ ស្ពានអ្នកលឿង និងបឹងស្នេហ៍ទួលព័ន្ធតាឡី', highlightEn: 'Ba Phnom Resort, Neak Loeung Bridge & Boeung Sne Bird Sanctuary', highlightZh: '巴普农古都名胜、乃良跨江大桥与万鸟湿地保护区' },
  { id: 'ខេត្តស្វាយរៀង', nameKh: 'ខេត្តស្វាយរៀង', shortKh: 'ស្វាយរៀង', nameEn: 'Svay Rieng', nameZh: '柴桢省', highlightKh: 'ប្រាសាទបាសាក់ រមណីយដ្ឋានព្រៃគគីរ និងមាត់ទន្លេវ៉ៃគោ', highlightEn: 'Prasat Basak, Prey Koki Eco-Park & Waiko Riverfront', highlightZh: '巴萨古寺遗址、森林生态公园与怀高河畔长廊' },
  { id: 'ខេត្តពោធិ៍សាត់', nameKh: 'ខេត្តពោធិ៍សាត់', shortKh: 'ពោធិ៍សាត់', nameEn: 'Pursat', nameZh: '菩萨省', highlightKh: 'ភ្នំ ១៥០០ (វាលវែង) ទឹកធ្លាក់ច្រកល្អៀង និងបូជនីយដ្ឋានអ្នកតាឃ្លាំងមឿង', highlightEn: 'Phnom 1500 Veal Veng, Chrok La Eang Waterfall & Kampong Luong', highlightZh: '1500米云海盘山观景台、卓拉昂瀑布与空邦隆水上城镇' },
  { id: 'ខេត្តបន្ទាយមានជ័យ', nameKh: 'ខេត្តបន្ទាយមានជ័យ', shortKh: 'បន្ទាយមានជ័យ', nameEn: 'Banteay Meanchey', nameZh: '班迭棉吉省', highlightKh: 'ប្រាសាទបន្ទាយឆ្មារ ប្រាសាទបន្ទាយទ័ព និងអាងទឹកត្រពាំងថ្ម', highlightEn: 'Banteay Chhmar Temple, Banteay Top & Trapeang Thma Crane Sanctuary', highlightZh: '班迭奇马大型古寺群、班迭托寺与赤颈鹤湿地保护区' },
  { id: 'ខេត្តប៉ៃលិន', nameKh: 'ខេត្តប៉ៃលិន', shortKh: 'ប៉ៃលិន', nameEn: 'Pailin', nameZh: '拜林省', highlightKh: 'ភ្នំយ៉ាត ទឹកធ្លាក់ភ្នំខៀវ (អូរតាវ៉ៅ) និងចម្ការតាង៉ែនប៉ៃលិន', highlightEn: 'Phnom Yat Pagoda, Phnom Khiev Waterfall & Longan Orchards', highlightZh: '雅山历史佛塔、奥达瓦山林瀑布与拜林龙眼果园' },
  { id: 'ខេត្តឧត្តរមានជ័យ', nameKh: 'ខេត្តឧត្តរមានជ័យ', shortKh: 'ឧត្តរមានជ័យ', nameEn: 'Oddar Meanchey', nameZh: '奥多棉吉省', highlightKh: 'តំបន់ប្រវត្តិសាស្ត្រអន្លង់វែង ស្ពានទ័ព និងជួរភ្នំដងរែក', highlightEn: 'Anlong Veng Historical Site, Spean Toap & Dangrek Mountains', highlightZh: '安隆汶历史遗址、千年古石桥与扁担山脉风光' },
  { id: 'ខេត្តព្រះវិហារ', nameKh: 'ខេត្តព្រះវិហារ', shortKh: 'ព្រះវិហារ', nameEn: 'Preah Vihear', nameZh: '柏威夏省', highlightKh: 'ប្រាសាទព្រះវិហារ ប្រាសាទកោះកេរ និងប្រាសាទព្រះខ័នកំពង់ស្វាយ', highlightEn: 'Preah Vihear UNESCO Temple, Koh Ker Pyramid & Preah Khan', highlightZh: '柏威夏世界遗产悬崖古寺、贡开金字塔与圣剑寺' },
  { id: 'ខេត្តស្ទឹងត្រែង', nameKh: 'ខេត្តស្ទឹងត្រែង', shortKh: 'ស្ទឹងត្រែង', nameEn: 'Stung Treng', nameZh: '上丁省', highlightKh: 'តំបន់រ៉ាមសារទន្លេមេគង្គ ទឹកធ្លាក់សុភមិត្ត និងកោះហាន', highlightEn: 'Mekong Ramsar Wetlands, Sopheakmit Waterfall & Koh Han', highlightZh: '湄公河国际拉姆萨尔湿地、苏帕密大瀑布与生态河岛' },
  { id: 'ខេត្តត្បូងឃ្មុំ', nameKh: 'ខេត្តត្បូងឃ្មុំ', shortKh: 'ត្បូងឃ្មុំ', nameEn: 'Tboung Khmum', nameZh: '特本克蒙省', highlightKh: 'រមណីយដ្ឋានទឹកធ្លាក់ហោង ប្រាសាទព្រះធាតុបាស្រី និងចម្ការកៅស៊ូជប់', highlightEn: 'Haong Waterfall, Preah Theat Basrei Temple & Chup Rubber Estate', highlightZh: '洪瀑布生态度假区、巴斯雷古塔寺与朱普百年橡胶园' },
];

type AssistantTab = 'food_advisor' | 'healthy_vip' | 'route_planner';

export const AiTripPlannerModal: React.FC = () => {
  const {
    isAiTripPlannerModalOpen,
    setIsAiTripPlannerModalOpen,
    generateAiTripPlan,
    saveTripPlan,
    language,
    showToast,
    foods,
    destinations,
    restaurants,
    currentUser,
    setSelectedFood,
    setSelectedRestaurant,
    setActiveTab,
    openUpgradeVipModal,
  } = useApp();

  const canUseVip = Boolean(currentUser && (isUserVipActive(currentUser) || isAdminAccount(currentUser)));

  // Active Smart AI Assistant Mode Tab
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('food_advisor');

  // Mode 1: AI Food & Craving Advisor State
  const [advisorGoal, setAdvisorGoal] = useState<AdvisorGoalId>('quick_daily');
  const [advisorPrompt, setAdvisorPrompt] = useState<string>('');
  const [advisorSeed, setAdvisorSeed] = useState<number>(1);
  const advisorInputRef = useRef<HTMLInputElement | null>(null);
  const advisorResultsRef = useRef<HTMLDivElement | null>(null);

  // Mode 3: AI Route & Trip Planner State
  const [selectedProvince, setSelectedProvince] = useState<string>('ខេត្តសៀមរាប');
  const [durationDays, setDurationDays] = useState<number>(1);
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'medium' | 'luxury'>('medium');
  const [companion, setCompanion] = useState<'solo' | 'couple' | 'friends' | 'family'>('friends');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<TripPlan | null>(null);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);

  const selectedProvinceMeta = useMemo(() => {
    const found =
      ALL_25_CAMBODIA_PROVINCES.find((p) => p.id === selectedProvince) ||
      ALL_25_CAMBODIA_PROVINCES[0];
    const core = found.shortKh.replace(/ណ្ដ/g, 'ណ្ត').trim();
    const destCount = destinations.filter((d) =>
      (d.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(core)
    ).length;
    const restCount = restaurants.filter((r) =>
      (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(core)
    ).length;
    return { ...found, destCount, restCount };
  }, [selectedProvince, destinations, restaurants]);

  // AI Food & Craving Advisor matched dishes & shops (multilingual semantic search across Khmer, English, Chinese)
  const aiAdvisorResults = useMemo(
    () =>
      getAiFoodAdvisorRecommendations({
        foods,
        restaurants,
        query: advisorPrompt,
        goal: advisorGoal,
        seed: advisorSeed,
        language,
        canUseVip,
      }),
    [foods, restaurants, advisorPrompt, advisorGoal, advisorSeed, language, canUseVip]
  );

  const handleAdvisorSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    advisorInputRef.current?.blur();
    if (!advisorPrompt.trim()) {
      setAdvisorSeed((s) => s + 1);
    }
  };

  if (!isAiTripPlannerModalOpen) return null;

  const handleGenerate = () => {
    // Multi-day custom AI itinerary (2-3 days) or Luxury mode requires VIP
    if (!canUseVip && (durationDays > 1 || budgetLevel === 'luxury')) {
      showToast(
        tr(
          language,
          '👑 ផែនការដើរលេង AI ច្រើនថ្ងៃ និងកម្រិត VIP គឺសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ!',
          '👑 Multi-day & custom AI Trip Plans are reserved for VIP members!',
          '👑 多日定制 AI 行程规划仅限 VIP 会员使用！'
        ),
        'info'
      );
      openUpgradeVipModal();
      return;
    }

    setIsGenerating(true);
    setGenerationStepText(
      tr(
        language,
        'កំពុងជ្រើសរើសតំបន់ទេសចរណ៍ និងហាងអាហារល្បីៗ...',
        'Selecting top attractions & local restaurants...',
        '正在筛选热门景点与地道餐厅...'
      )
    );

    setTimeout(() => {
      setGenerationStepText(
        tr(
          language,
          'កំពុងរៀបចំកាលវិភាគធ្វើដំណើរ និងថវិកាប្រចាំថ្ងៃ...',
          'Building your daily route & budget...',
          '正在安排每日游览路线与预算...'
        )
      );
    }, 600);

    setTimeout(() => {
      const plan = generateAiTripPlan(selectedProvince, durationDays, budgetLevel, companion);
      setGeneratedPlan(plan);
      setActiveDayTab(1);
      setIsGenerating(false);
    }, 1100);
  };

  const handleShare = () => {
    if (!generatedPlan) return;
    const provLabel = translateProvince(generatedPlan.provinceKh, language);
    const text =
      language === 'km'
        ? `🗺️ ផែនការដើរលេង AI នៅ${generatedPlan.provinceKh} (${generatedPlan.durationDays} ថ្ងៃ)\n👥 ដំណើរកម្សាន្ត៖ ${generatedPlan.companion}\nរសជាតិ និងទេសចរណ៍កម្ពុជា — Cambodia Flavors & Tourism`
        : language === 'zh'
        ? `🗺️ AI 智能行程规划：${provLabel}（${generatedPlan.durationDays}天）\n👥 出行方式：${generatedPlan.companion}\n柬埔寨风味与旅游 — Cambodia Flavors & Tourism`
        : `🗺️ AI Trip Plan in ${provLabel} (${generatedPlan.durationDays} Days)\n👥 Companion: ${generatedPlan.companion}\nPlanned with Cambodia Flavors & Tourism`;

    if (navigator.share) {
      navigator.share({ title: 'AI Trip Plan', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast(
        tr(
          language,
          'បានចម្លងផែនការដើរលេងទៅក្តារតម្បៀតខ្ទាស់!',
          'Copied trip plan to clipboard!',
          '已将行程规划复制到剪贴板！'
        ),
        'info'
      );
    }
  };

  const handleSave = () => {
    if (!canUseVip) {
      showToast(
        tr(
          language,
          '👑 ការរក្សាទុកផែនការ AI ក្នុងគណនី គឺសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ!',
          '👑 Saving custom AI plans to your account is a VIP member benefit!',
          '👑 保存定制 AI 行程至账户为 VIP 会员专属权益！'
        ),
        'info'
      );
      openUpgradeVipModal();
      return;
    }
    if (generatedPlan) {
      saveTripPlan(generatedPlan);
    }
  };

  const handleViewAllHealthyTag = (id: DishTagId) => {
    if (!requestTagFilter(id, currentUser)) {
      openUpgradeVipModal();
      return;
    }
    setIsAiTripPlannerModalOpen(false);
    setActiveTab('food');
  };

  const companionLabels: Record<string, string> = {
    solo: tr(language, 'ម្នាក់ឯង', 'Solo', '独自出行'),
    couple: tr(language, 'គូស្នេហ៍', 'Couple', '情侣出游'),
    friends: tr(language, 'មិត្តភក្តិ', 'Friends', '朋友结伴'),
    family: tr(language, 'គ្រួសារ', 'Family', '家庭亲子'),
  };

  const budgetLabels: Record<string, string> = {
    budget: tr(language, 'សន្សំសំចៃ', 'Budget', '经济实惠'),
    medium: tr(language, 'មធ្យម', 'Medium', '舒适适中'),
    luxury: tr(language, 'ផាសុកភាពខ្ពស់', 'Luxury', '尊享豪华'),
  };

  const advisorGoals: Array<{
    id: AdvisorGoalId;
    kh: string;
    en: string;
    zh: string;
    descKh: string;
    descEn: string;
    descZh: string;
    vipOnly: boolean;
  }> = [
    {
      id: 'quick_daily',
      kh: '⚡ អាហាររហ័ស & ងាយស្រួលប្រចាំថ្ងៃ',
      en: '⚡ Quick & Convenient Daily Meal',
      zh: '⚡ 快捷便利日常简餐',
      descKh: 'ម្ហូបញ៉ាំប្រចាំថ្ងៃ រហ័ស ឆ្ងាញ់ និងសម្បូរបែប',
      descEn: 'Fast, tasty everyday dishes for breakfast, lunch, or dinner',
      descZh: '适合日常早午晚餐的快捷美味菜品',
      vipOnly: false,
    },
    {
      id: 'khmer_comfort',
      kh: '🍲 ម្ហូបខ្មែរពេញនិយមប្រចាំថ្ងៃ',
      en: '🍲 Daily Khmer Comfort Food',
      zh: '🍲 经典柬式家常美味',
      descKh: 'សម្លខ្មែរ អាម៉ុក និងម្ហូបប្រពៃណីសម្រាប់គ្រួសារ',
      descEn: 'Authentic Cambodian soups, curries, and homestyle favorites',
      descZh: '正宗柬埔寨汤品、阿莫克与家常名菜',
      vipOnly: false,
    },
    {
      id: 'vip_light_cal',
      kh: '🍲 ម្ហូបចំហុយ & ស្ងោរប្រពៃណី',
      en: '🍲 Steamed & Boiled Specialties',
      zh: '🍲 清蒸与炖汤精选',
      descKh: 'ម្ហូបចំហុយ ស៊ុបថ្លា និងសម្លប្រពៃណីរសជាតិស្រាលឆ្ងាញ់',
      descEn: 'Traditional steamed fish, clear soups & delicate Cambodian dishes',
      descZh: '传统清蒸鱼、清汤与风味清雅的柬式菜肴',
      vipOnly: true,
    },
    {
      id: 'vip_high_protein',
      kh: '🥩 សាច់អាំង & គ្រឿងសមុទ្រពិសេស',
      en: '🥩 Grilled & Seafood Specialties',
      zh: '🥩 炭烤与海鲜特色',
      descKh: 'មុខម្ហូបសាច់គោអាំង ត្រីដុត បង្គា និងគ្រឿងសមុទ្រស្រស់ៗ',
      descEn: 'Charcoal-grilled meats, roasted fish & fresh coastal seafood',
      descZh: '炭烤牛肉、烤鱼与新鲜海鲜特色菜',
      vipOnly: true,
    },
    {
      id: 'vip_group_feast',
      kh: '👨‍👩‍👧‍👦 អាហារជួបជុំគ្រួសារ & មិត្តភក្តិ',
      en: '👨‍👩‍👧‍👦 Family & Group Dining Match',
      zh: '👨‍👩‍👧‍👦 家庭与朋友聚餐精选',
      descKh: 'មុខម្ហូបឈុតធំ ស៊ុប សាច់អាំង និងហាងបរិយាកាសល្អ',
      descEn: 'Shareable platters, hotpots, grilled specialties & group venues',
      descZh: '适合多人分享的火锅、烧烤、大菜与聚会餐厅',
      vipOnly: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setIsAiTripPlannerModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <IconSmartAssistant className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-moul text-sm text-white truncate">
                  {tr(language, 'ជំនួយការឆ្លាតវៃ AI', 'Smart AI Assistant', 'AI 智能助手')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black shadow-2xs shrink-0">
                  <Crown className="w-3 h-3 fill-current" />
                  <span>{canUseVip ? 'VIP ✓' : 'VIP'}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {tr(
                  language,
                  'ជំនួយការរើសម្ហូបប្រចាំថ្ងៃ រូបមន្តម្ហូប និងរៀបផែនការដើរលេង AI',
                  'Daily AI food advisor, culinary tags & route planner',
                  '每日 AI 选餐顾问、美食分类与智能路线规划'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiTripPlannerModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Mode Switcher Bar: AI Food Advisor | VIP Special Menu | AI Route Planner */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 gap-1 shrink-0 font-khmer">
          <button
            type="button"
            onClick={() => setAssistantTab('food_advisor')}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              assistantTab === 'food_advisor'
                ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">{tr(language, 'រើសម្ហូបឆ្លាតវៃ', 'AI Food', '智能选餐')}</span>
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              {tr(language, 'ឥតគិតថ្លៃ + VIP', 'Free + VIP', '免费 + VIP')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAssistantTab('healthy_vip')}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              assistantTab === 'healthy_vip'
                ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate">{tr(language, 'ម្ហូបពិសេស', 'Special Menu', '特色菜单')}</span>
            </span>
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">👑 VIP</span>
          </button>

          <button
            type="button"
            onClick={() => setAssistantTab('route_planner')}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              assistantTab === 'route_planner'
                ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-teal-600" />
              <span className="truncate">{tr(language, 'ផែនការដើរលេង', 'Trip Planner', '行程规划')}</span>
            </span>
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">
              {tr(language, '១ថ្ងៃឥតគិតថ្លៃ • VIP', '1d Free • VIP', '1日免费 • VIP')}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-4 pb-8 space-y-4 font-khmer">
          {/* =====================================================================
              TAB 1: AI DAILY FOOD & CRAVING ADVISOR (FREE PREVIEW + VIP ADVANCED)
          ===================================================================== */}
          {assistantTab === 'food_advisor' && (
            <div className="space-y-4">
              {/* Free vs VIP Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-amber-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-emerald-200/80 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {tr(
                        language,
                        'ជំនួយការឆ្លាតវៃណែនាំមុខម្ហូប និងហាងប្រចាំថ្ងៃ',
                        'Smart AI Daily Meal & Restaurant Advisor',
                        '智能每日用餐与餐厅顾问'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(
                      language,
                      'មុខងារមូលដ្ឋានឥតគិតថ្លៃ • មុខម្ហូបពិសេស និងជួបជុំសម្រាប់ VIP',
                      'Basic daily picks are FREE • Special culinary & group AI for VIP',
                      '基础日常推荐免费使用 • 特色菜肴与聚餐定制专属 VIP'
                    )}
                  </p>
                </div>
                {!canUseVip && (
                  <button
                    type="button"
                    onClick={() => openUpgradeVipModal()}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Crown className="w-3 h-3" />
                    <span>{tr(language, 'ដំឡើង VIP', 'Get VIP', '升级 VIP')}</span>
                  </button>
                )}
              </div>

              {/* Ask AI Search / Craving Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {tr(
                      language,
                      'ប្រាប់ AI ពីអ្វីដែលអ្នកចង់ញ៉ាំថ្ងៃនេះ៖',
                      'Tell AI what you feel like eating today:',
                      '告诉 AI 您今天想吃什么：'
                    )}
                  </span>
                </label>
                <form onSubmit={handleAdvisorSearchSubmit} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="kft-ai-food-advisor-input"
                      ref={advisorInputRef}
                      type="text"
                      enterKeyHint="search"
                      value={advisorPrompt}
                      onChange={(e) => {
                        setAdvisorPrompt(e.target.value);
                        setAdvisorSeed(1);
                      }}
                      placeholder={tr(
                        language,
                        'ឧ. បាយ, គុយទាវ, សម្លម្ជូរ, សាច់អាំង, ម្ហូបអមស្រាបៀរ...',
                        'e.g. rice, noodle soup, sour soup, grilled meat, beer food...',
                        '例如：米饭、粿条、酸汤、烤肉、下酒菜...'
                      )}
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {advisorPrompt && (
                      <button
                        id="kft-ai-food-advisor-clear"
                        type="button"
                        onClick={() => {
                          setAdvisorPrompt('');
                          setAdvisorSeed(1);
                        }}
                        aria-label={tr(language, 'សម្អាត', 'Clear', '清除')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    id="kft-ai-food-advisor-submit"
                    type="submit"
                    className="px-3.5 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{tr(language, 'ស្វែងរក', 'Ask AI', 'AI 推荐')}</span>
                  </button>
                </form>

                {/* 1-Tap Quick Craving Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  {QUICK_CRAVING_CHIPS.map((chip) => {
                    const chipQuery = tr(language, chip.queryKh, chip.queryEn, chip.queryZh);
                    const isActive =
                      advisorPrompt.trim().toLowerCase() === chip.queryKh.toLowerCase() ||
                      advisorPrompt.trim().toLowerCase() === chip.queryEn.toLowerCase() ||
                      advisorPrompt.trim().toLowerCase() === chip.queryZh.toLowerCase();
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setAdvisorPrompt('');
                          } else {
                            setAdvisorPrompt(chipQuery);
                          }
                          setAdvisorSeed(1);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {tr(language, chip.labelKh, chip.labelEn, chip.labelZh)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Curated Dish Matches (Placed directly below search input so results appear immediately!) */}
              <div
                ref={advisorResultsRef}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-500/30 dark:border-emerald-500/30 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {tr(
                          language,
                          'មុខម្ហូបដែល AI ណែនាំសម្រាប់អ្នក៖',
                          'AI-Matched Dishes for You:',
                          'AI 为您智能匹配的菜品：'
                        )}
                      </span>
                    </h4>
                    {!aiAdvisorResults.brain && (
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {aiAdvisorResults.aiSummaryText}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvisorSeed((s) => s + 1)}
                    className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{tr(language, 'ប្តូរជម្រើសថ្មី', 'Refresh AI', '换一批')}</span>
                  </button>
                </div>

                {aiAdvisorResults.brain && (
                  <AiBrainInsightCard
                    insight={aiAdvisorResults.brain}
                    language={language}
                    onPickFood={(food) => {
                      setSelectedFood(food);
                      setIsAiTripPlannerModalOpen(false);
                    }}
                    onChip={(q) => {
                      setAdvisorPrompt(q);
                      setAdvisorSeed(1);
                    }}
                    onUpgrade={() => openUpgradeVipModal()}
                  />
                )}

                {!(aiAdvisorResults.brain && aiAdvisorResults.brain.dishes.length > 0) && (
                <div className="space-y-2">
                  {aiAdvisorResults.dishes.map((dish) => {
                    const loc = getLocalizedFood(dish, language);
                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          setSelectedFood(dish);
                          setIsAiTripPlannerModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-500 flex items-center justify-between gap-2.5 cursor-pointer transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={dish.photoUrl}
                            alt={loc.name}
                            loading="lazy"
                            decoding="async"
                            className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {loc.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              <span>🔥 {dish.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}</span>
                              <span>•</span>
                              <span>⭐ {dish.rating}</span>
                              <span>•</span>
                              <span>{loc.category}</span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {loc.description}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                          <ChefHat className="w-3 h-3" />
                          <span>{tr(language, 'រូបមន្ត', 'Recipe', '食谱')}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Matching Restaurants with 1-Tap Navigation */}
                {aiAdvisorResults.shops.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {tr(
                          language,
                          'ហាងអាហារណែនាំ និងការនាំផ្លូវ៖',
                          'Recommended Shops & Navigation:',
                          '推荐餐厅与路线导航：'
                        )}
                      </span>
                    </div>
                    {aiAdvisorResults.shops.map((shop) => {
                      const sLoc = getLocalizedRestaurant(shop, language);
                      const navUrl =
                        shop.mapUrl ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${shop.nameKh} ${shop.provinceKh} Cambodia`
                        )}`;
                      return (
                        <div
                          key={shop.id}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                        >
                          <div
                            onClick={() => {
                              setSelectedRestaurant(shop);
                              setIsAiTripPlannerModalOpen(false);
                            }}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-emerald-600">
                              {sLoc.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              📍 {sLoc.province} • ⭐ {shop.rating}
                            </div>
                          </div>
                          <a
                            href={navUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
                          >
                            <Navigation className="w-3 h-3 text-emerald-300" />
                            <span>{tr(language, 'នាំផ្លូវ', 'Navigate', '导航')}</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Select Daily Goal (2 Free + 3 VIP) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr(language, 'ជ្រើសរើសគោលបំណងអាហារថ្ងៃនេះ៖', 'Select your dining goal today:', '选择今日用餐目标：')}
                </label>
                <div className="space-y-1.5">
                  {advisorGoals.map((g) => {
                    const isLocked = g.vipOnly && !canUseVip;
                    const isSelected = advisorGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            showToast(
                              tr(
                                language,
                                '👑 មុខងារវិភាគអាហារូបត្ថម្ភ AI កម្រិតខ្ពស់ គឺសម្រាប់សមាជិក VIP!',
                                '👑 Advanced AI Nutrition & Group Dining modes are for VIP members!',
                                '👑 高级 AI 营养分析与聚餐推荐仅限 VIP 会员！'
                              ),
                              'info'
                            );
                            openUpgradeVipModal();
                            return;
                          }
                          setAdvisorGoal(g.id);
                          setAdvisorSeed(1);
                          if (typeof window !== 'undefined') {
                            window.requestAnimationFrame(() => {
                              advisorResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            });
                          }
                        }}
                        className={`w-full p-2.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-600 ring-1 ring-emerald-500/40'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {tr(language, g.kh, g.en, g.zh)}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {tr(language, g.descKh, g.descEn, g.descZh)}
                          </div>
                        </div>

                        {g.vipOnly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black shrink-0 border border-amber-400/40">
                            {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Crown className="w-2.5 h-2.5" />}
                            <span>VIP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: VIP HEALTHY DISH TAGS & 3-MEAL BALANCED PLAN (VIP EXCLUSIVE)
          ===================================================================== */}
          {assistantTab === 'healthy_vip' && (
            <SmartHubHealthySection
              foods={foods}
              onViewAll={handleViewAllHealthyTag}
              onOpenFood={(food) => {
                setSelectedFood(food);
                setIsAiTripPlannerModalOpen(false);
              }}
              onUpgradeVip={() => openUpgradeVipModal()}
            />
          )}

          {/* =====================================================================
              TAB 3: AI ROUTE & DINING PLANNER (1-DAY FREE PREVIEW + VIP MULTI-DAY)
          ===================================================================== */}
          {assistantTab === 'route_planner' && (
            <>
              {isGenerating ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-sm animate-bounce">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#0F172A] dark:text-white animate-pulse">
                      {generationStepText}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {tr(
                        language,
                        'រៀបចំកន្លែងញ៉ាំ និងកន្លែងកម្សាន្តដ៏ល្អបំផុតជូនអ្នក...',
                        'Selecting best spots for you...',
                        '正在为您挑选最佳餐厅与游览景点...'
                      )}
                    </p>
                  </div>
                </div>
              ) : !generatedPlan ? (
                <div className="space-y-4">
                  {/* Ready-made 1-Day Food Trips */}
                  <FoodTripTemplates />

                  {/* 1. Destination Province (All 25 Cambodian Provinces & Capital City) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>
                          {tr(
                            language,
                            '១. ជ្រើសរើសខេត្តគោលដៅ (ទាំង ២៥ ខេត្ត/រាជធានី)៖',
                            '1. Select Province / City (All 25):',
                            '1. 选择目的地省份/城市（全柬 25 省市）：'
                          )}
                        </span>
                      </label>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        {tr(language, '25 ខេត្ត/រាជធានី', '25 Provinces', '25 个省市')}
                      </span>
                    </div>

                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {ALL_25_CAMBODIA_PROVINCES.map((prov, idx) => (
                        <option key={prov.id} value={prov.id}>
                          {idx + 1}.{' '}
                          {language === 'km'
                            ? prov.nameKh
                            : language === 'zh'
                            ? prov.nameZh
                            : prov.nameEn}
                        </option>
                      ))}
                    </select>

                    <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-slate-800/90 border border-emerald-500/30 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-[#064E3B] dark:text-emerald-400">
                          📍 {tr(language, selectedProvinceMeta.nameKh, selectedProvinceMeta.nameEn, selectedProvinceMeta.nameZh)}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">
                            <Compass className="w-3 h-3 text-emerald-500" />
                            {selectedProvinceMeta.destCount} {tr(language, 'តំបន់ទេសចរណ៍', 'Spots', '个景点')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">
                            <Utensils className="w-3 h-3 text-amber-500" />
                            {selectedProvinceMeta.restCount} {tr(language, 'ហាងអាហារ', 'Shops', '家餐厅')}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        ✨{' '}
                        {tr(
                          language,
                          selectedProvinceMeta.highlightKh,
                          selectedProvinceMeta.highlightEn,
                          selectedProvinceMeta.highlightZh || selectedProvinceMeta.highlightEn
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 2. Duration Days (1 Day FREE Preview, 2-3 Days VIP) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>{tr(language, '២. ចំនួនថ្ងៃធ្វើដំណើរ៖', '2. Duration:', '2. 行程天数：')}</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { days: 1, labelKh: '១ ថ្ងៃ (ឥតគិតថ្លៃ)', labelEn: '1 Day (FREE)', labelZh: '1日游 (免费)', vipOnly: false },
                        { days: 2, labelKh: '២ ថ្ងៃ ១ យប់', labelEn: '2 Days 1 Night', labelZh: '2天1晚', vipOnly: true },
                        { days: 3, labelKh: '៣ ថ្ងៃ ២ យប់', labelEn: '3 Days 2 Nights', labelZh: '3天2晚', vipOnly: true },
                      ].map((d) => {
                        const locked = d.vipOnly && !canUseVip;
                        return (
                          <button
                            key={d.days}
                            type="button"
                            onClick={() => {
                              if (locked) {
                                showToast(
                                  tr(
                                    language,
                                    '👑 ផែនការដើរលេង AI ច្រើនថ្ងៃ គឺសម្រាប់សមាជិក VIP!',
                                    '👑 Multi-day AI trip planning is reserved for VIP members!',
                                    '👑 多日 AI 行程规划仅限 VIP 会员！'
                                  ),
                                  'info'
                                );
                                openUpgradeVipModal();
                                return;
                              }
                              setDurationDays(d.days);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold transition text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              durationDays === d.days
                                ? 'bg-[#064E3B] text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{tr(language, d.labelKh, d.labelEn, d.labelZh)}</span>
                            {d.vipOnly && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-500">
                                {locked ? <Lock className="w-2.5 h-2.5" /> : <Crown className="w-2.5 h-2.5" />}
                                <span>VIP</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Budget Level */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>{tr(language, '៣. កម្រិតថវិកា៖', '3. Budget Level:', '3. 预算档次：')}</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'budget', labelKh: 'សន្សំសំចៃ', labelEn: 'Budget', labelZh: '经济实惠' },
                        { id: 'medium', labelKh: 'មធ្យម', labelEn: 'Medium', labelZh: '舒适适中' },
                        { id: 'luxury', labelKh: 'ផាសុកភាព (VIP)', labelEn: 'Luxury (VIP)', labelZh: '尊享 (VIP)' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBudgetLevel(b.id as any)}
                          className={`p-2 rounded-xl text-center transition cursor-pointer ${
                            budgetLevel === b.id
                              ? 'bg-[#064E3B] text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold">{tr(language, b.labelKh, b.labelEn, b.labelZh)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Companions */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>{tr(language, '៤. អ្នករួមដំណើរជាមួយ៖', '4. Companions:', '4. 同行伙伴：')}</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'solo', labelKh: 'ម្នាក់ឯង', labelEn: 'Solo', labelZh: '独自出行', icon: '🎒' },
                        { id: 'couple', labelKh: 'គូស្នេហ៍', labelEn: 'Couple', labelZh: '情侣出游', icon: '❤️' },
                        { id: 'friends', labelKh: 'មិត្តភក្តិ', labelEn: 'Friends', labelZh: '朋友结伴', icon: '🎉' },
                        { id: 'family', labelKh: 'គ្រួសារ', labelEn: 'Family', labelZh: '家庭亲子', icon: '👨‍👩‍👧‍👦' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCompanion(c.id as any)}
                          className={`p-2 rounded-xl text-center transition cursor-pointer ${
                            companion === c.id
                              ? 'bg-[#064E3B] text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-base">{c.icon}</div>
                          <div className="text-[11px] font-bold mt-0.5">
                            {tr(language, c.labelKh, c.labelEn, c.labelZh)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Generate Button */}
                  <button
                    onClick={handleGenerate}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 fill-current" />
                    <span>{tr(language, 'បង្កើតផែនការដើរលេង AI', 'Generate AI Route Plan', '生成 AI 行程方案')}</span>
                  </button>
                </div>
              ) : (
                /* Result Screen */
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border border-emerald-200 dark:border-slate-700 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-[#064E3B] text-white text-[11px] font-bold">
                        📍 {translateProvince(generatedPlan.provinceKh, language)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>
                        📅 {generatedPlan.durationDays} {tr(language, 'ថ្ងៃ', 'Days', '天')}
                      </span>
                      <span>•</span>
                      <span className="capitalize">
                        👥 {companionLabels[generatedPlan.companion] || generatedPlan.companion}
                      </span>
                      <span>•</span>
                      <span className="capitalize">
                        💰 {budgetLabels[generatedPlan.budgetLevel] || generatedPlan.budgetLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSave}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <BookmarkCheck className="w-4 h-4 text-emerald-300" />
                        <span>{tr(language, 'រក្សាទុកផែនការ (VIP)', 'Save Plan (VIP)', '保存行程 (VIP)')}</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 rounded-xl bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-slate-200 dark:border-slate-600 shadow-2xs transition cursor-pointer"
                        title={tr(language, 'ចែករំលែក', 'Share', '分享')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGeneratedPlan(null)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title={tr(language, 'រៀបចំថ្មី', 'Reset', '重新规划')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day Tabs */}
                  <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                    {generatedPlan.days.map((day) => (
                      <button
                        key={day.dayNumber}
                        onClick={() => setActiveDayTab(day.dayNumber)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                          activeDayTab === day.dayNumber
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {tr(language, `ថ្ងៃទី ${day.dayNumber}`, `Day ${day.dayNumber}`, `第 ${day.dayNumber} 天`)}
                      </button>
                    ))}
                  </div>

                  {/* Day Timeline Activities */}
                  {generatedPlan.days
                    .filter((d) => d.dayNumber === activeDayTab)
                    .map((day) => (
                      <div key={day.dayNumber} className="space-y-3">
                        {day.activities.map((act, idx) => {
                          const actTitle =
                            language === 'km'
                              ? act.titleKh
                              : language === 'zh'
                              ? translateDynamicTextToZh(act.titleEn || act.titleKh) || act.titleEn
                              : act.titleEn;
                          const actDesc =
                            language === 'km'
                              ? act.descKh
                              : language === 'zh'
                              ? translateDynamicTextToZh(act.descEn || act.descKh) || act.descEn
                              : act.descEn;
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-[#064E3B] text-[10px] font-bold">
                                  {act.timePeriod === 'morning'
                                    ? tr(language, '🌅 ពេលព្រឹក', '🌅 Morning', '🌅 上午')
                                    : act.timePeriod === 'lunch'
                                    ? tr(language, '🍛 ពេលថ្ងៃត្រង់', '🍛 Lunch', '🍛 午餐')
                                    : act.timePeriod === 'afternoon'
                                    ? tr(language, '🌄 ពេលរសៀល', '🌄 Afternoon', '🌄 下午')
                                    : tr(language, '🌙 ពេលល្ងាច', '🌙 Evening', '🌙 傍晚/晚餐')}
                                </span>
                              </div>

                              <div className="flex gap-3">
                                {act.photoUrl && (
                                  <img
                                    src={act.photoUrl}
                                    alt=""
                                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-bold text-xs text-[#0F172A] dark:text-white leading-snug">
                                    {actTitle}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {actDesc}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
